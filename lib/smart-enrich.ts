/**
 * Smart Enrich — Cost-Optimized Entity Enrichment
 *
 * Takes an entity name (and optional hints) and runs the cheapest enrichment
 * path first, only escalating to paid APIs when there are actual gaps.
 *
 * Cost model:
 *   Phase 1: Discover (Haiku web search)     ~$0.01  — find website + IG + basic identity
 *   Phase 2: Scrape (HTTP)                    FREE    — surface discovery + fetch + parse
 *   Phase 3: Extract (parsed HTML)            FREE    — menu/reservation/hours from surfaces
 *   Phase 4: Gap fill (Google Places)         ~$0.03  — only if coords/hours/GPID still missing
 *   Phase 5: Interpret (Claude Sonnet)        ~$0.03  — AI signals + tagline, only if surfaces exist
 *
 * Usage:
 *   import { smartEnrich } from '@/lib/smart-enrich';
 *   const result = await smartEnrich({ name: 'Bavel', city: 'Los Angeles' });
 */

import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { writeClaimAndSanction } from '@/lib/fields-v2/write-claim';
import { discoverEntitySurfaces } from '@/lib/merchant-surface-discovery';
import { parseAndCaptureSurface } from '@/lib/merchant-surface-parse';
import { searchPlace, getPlaceDetails } from '@/lib/google-places';
import { tokenSortRatio } from '@/lib/similarity';
import { scanEntities } from '@/lib/coverage/issue-scanner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SmartEnrichInput {
  /** Entity name (required) */
  name: string;
  /** City for search context (default: Los Angeles) */
  city?: string;
  /** Neighborhood hint (optional, improves discovery accuracy) */
  neighborhood?: string;
  /** Category hint (default: restaurant) */
  category?: string;
  /** If entity already exists in DB, pass its ID to skip intake */
  entityId?: string;
  /** Skip paid API calls (Google Places, Claude Sonnet) */
  cheapOnly?: boolean;
  /** Don't write anything — just report what would happen */
  dryRun?: boolean;
}

export interface SmartEnrichResult {
  entityId: string;
  slug: string;
  phases: PhaseResult[];
  totalCostEstimate: string;
  gaps: string[];
}

interface PhaseResult {
  phase: number;
  name: string;
  status: 'ran' | 'skipped' | 'failed';
  cost: string;
  discovered: Record<string, string | null>;
  duration_ms: number;
}

// ---------------------------------------------------------------------------
// Phase 1: Discover via Haiku web search (~$0.01)
// ---------------------------------------------------------------------------

interface DiscoveryResult {
  website: string | null;
  instagram: string | null;
  neighborhood: string | null;
  confidence: string;
}

async function phase1Discover(
  name: string,
  city: string,
  neighborhood: string | null,
  category: string,
): Promise<DiscoveryResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const client = new Anthropic({ apiKey });
  const hoodHint = neighborhood ? ` in ${neighborhood}` : '';

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a restaurant researcher. Find the official website and Instagram for a ${category} in ${city}.
Rules:
- Only OFFICIAL website and Instagram. Never yelp, doordash, grubhub, tripadvisor.
- Instagram must be the restaurant's own account, not a blogger or fan page.
Return JSON only (no markdown fences):
{ "website": "https://..." or null, "instagram": "@handle" or null, "neighborhood": "area name" or null, "confidence": "high"|"medium"|"low" }`,
    tools: [{ type: 'web_search_20250305' as any, name: 'web_search' } as any],
    messages: [{ role: 'user', content: `Find the official website and Instagram for: ${name}${hoodHint}, ${city} ${category}` }],
  });

  const textBlocks = response.content.filter((b: any) => b.type === 'text');
  const fullText = textBlocks.map((b: any) => b.text).join('\n');

  const jsonMatch = fullText.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return { website: null, instagram: null, neighborhood: null, confidence: 'low' };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    // Clean Instagram handle
    let ig = parsed.instagram;
    if (ig) {
      ig = ig.replace(/^@/, '').trim();
      if (!/^[a-zA-Z0-9._]+$/.test(ig)) ig = null;
    }
    // Clean website
    let web = parsed.website;
    if (web) {
      const blocked = ['yelp.com', 'doordash.com', 'ubereats.com', 'grubhub.com', 'tripadvisor.com', 'google.com', 'facebook.com'];
      for (const d of blocked) {
        if (web.includes(d)) { web = null; break; }
      }
    }
    return {
      website: web || null,
      instagram: ig || null,
      neighborhood: parsed.neighborhood || null,
      confidence: parsed.confidence ?? 'low',
    };
  } catch {
    return { website: null, instagram: null, neighborhood: null, confidence: 'low' };
  }
}

// ---------------------------------------------------------------------------
// Phase 2 & 3: Scrape + Extract (FREE)
// ---------------------------------------------------------------------------

async function phase2Scrape(entityId: string): Promise<{ surfaceCount: number }> {
  const entity = await db.entities.findUnique({
    where: { id: entityId },
    select: { id: true, website: true },
  });
  if (!entity?.website) return { surfaceCount: 0 };

  // Check if surfaces already exist (idempotent)
  const existing = await db.merchant_surfaces.count({ where: { entityId } });
  if (existing > 0) return { surfaceCount: existing };

  try {
    await discoverEntitySurfaces(entityId, entity.website);
  } catch (e) {
    console.error(`[smart-enrich] Surface discovery failed for ${entityId}:`, e);
  }

  const count = await db.merchant_surfaces.count({ where: { entityId } });
  return { surfaceCount: count };
}

async function phase3Extract(entityId: string): Promise<{ artifactCount: number }> {
  // Find surfaces that need parsing
  const pending = await db.merchant_surfaces.findMany({
    where: {
      entityId,
      fetchStatus: 'fetch_success',
      parseStatus: 'parse_pending',
    },
    select: { id: true, entityId: true, surfaceType: true, sourceUrl: true, rawHtml: true, rawText: true },
  });

  for (const surface of pending) {
    try {
      await parseAndCaptureSurface(surface);
    } catch (e) {
      console.error(`[smart-enrich] Surface parse failed for surface ${surface.id}:`, e);
    }
  }

  const count = await db.merchant_surface_artifacts.count({
    where: { merchant_surface: { entityId } },
  });
  return { artifactCount: count };
}

// ---------------------------------------------------------------------------
// Phase 4: Gap fill with Google Places (only if needed, ~$0.03)
// ---------------------------------------------------------------------------

async function phase4GapFill(entityId: string, name: string, city: string): Promise<Record<string, string | null>> {
  const entity = await db.entities.findUnique({
    where: { id: entityId },
    select: {
      googlePlaceId: true,
      latitude: true,
      longitude: true,
      placesDataCachedAt: true,
    },
  });

  if (!entity) return {};

  // Already have coords and GPID — skip
  const hasCoords = entity.latitude !== null && entity.longitude !== null;
  const hasGpid = !!entity.googlePlaceId;
  if (hasCoords && hasGpid && entity.placesDataCachedAt) {
    return {};
  }

  // Find GPID if missing
  let gpid = entity.googlePlaceId;
  if (!gpid) {
    const results = await searchPlace(`${name} ${city}`, { maxResults: 3 });
    if (results.length > 0) {
      const best = results.reduce((a, b) =>
        tokenSortRatio(name.toLowerCase(), a.name.toLowerCase()) >=
        tokenSortRatio(name.toLowerCase(), b.name.toLowerCase()) ? a : b
      );
      const sim = tokenSortRatio(name.toLowerCase(), best.name.toLowerCase());
      if (sim >= 0.80) {
        gpid = best.placeId;
        await db.entities.update({
          where: { id: entityId },
          data: { googlePlaceId: gpid },
        });
      }
    }
  }

  // Fetch place details if we have a GPID
  if (gpid && !entity.placesDataCachedAt) {
    try {
      const details = await getPlaceDetails(gpid);
      if (details) {
        const updateData: Record<string, unknown> = {
          placesDataCachedAt: new Date(),
        };
        if (details.location?.lat && !hasCoords) {
          updateData.latitude = details.location.lat;
          updateData.longitude = details.location.lng;
        }
        if (details.formattedAddress) updateData.address = details.formattedAddress;
        if (details.openingHours) updateData.hours = details.openingHours;
        if (details.formattedPhoneNumber) updateData.phone = details.formattedPhoneNumber;
        if (details.businessStatus) updateData.businessStatus = details.businessStatus;

        await db.entities.update({
          where: { id: entityId },
          data: updateData as any,
        });

        return {
          gpid: gpid ?? null,
          coords: details.location ? `${details.location.lat},${details.location.lng}` : null,
          address: details.formattedAddress ?? null,
        };
      }
    } catch (e) {
      console.error(`[smart-enrich] Google Places details failed:`, e);
    }
  }

  return { gpid: gpid ?? null };
}

// ---------------------------------------------------------------------------
// Identity + completeness check (composite, not checklist)
// ---------------------------------------------------------------------------
// Mirrors ARCH-IDENTITY-SCORING-V1 weighted anchor model.
// No single field is required. Identity confidence comes from the
// combination of available anchors. A taco cart with Instagram + coords
// is just as identified as a restaurant with a GPID.

interface EntityState {
  website: string | null;
  instagram: string | null;
  googlePlaceId: string | null;
  latitude: unknown;
  longitude: unknown;
  neighborhood: string | null;
  phone: string | null;
}

/** Anchor weights from identity-scoring-v1 */
const ANCHOR_WEIGHTS: Record<string, number> = {
  gpid: 4,
  website: 3,
  instagram: 2,
  coords: 2,
  neighborhood: 1,
  phone: 1,
};

const IDENTITY_THRESHOLD = 4; // Minimum score for "sufficient identity"
const MAX_IDENTITY_SCORE = Object.values(ANCHOR_WEIGHTS).reduce((a, b) => a + b, 0);

function computeIdentityScore(entity: EntityState): number {
  let score = 0;
  if (entity.googlePlaceId) score += ANCHOR_WEIGHTS.gpid;
  if (entity.website) score += ANCHOR_WEIGHTS.website;
  if (entity.instagram) score += ANCHOR_WEIGHTS.instagram;
  if (entity.latitude !== null && entity.longitude !== null) score += ANCHOR_WEIGHTS.coords;
  if (entity.neighborhood) score += ANCHOR_WEIGHTS.neighborhood;
  if (entity.phone) score += ANCHOR_WEIGHTS.phone;
  return score;
}

function hasLocation(entity: EntityState): boolean {
  // Location is knowable through ANY of these — not all are needed
  return !!(
    (entity.latitude !== null && entity.longitude !== null) ||
    entity.googlePlaceId ||
    entity.neighborhood
  );
}

/**
 * Returns actionable gaps — fields where enrichment would meaningfully
 * improve the entity. Not a checklist; prioritized by what's actually missing
 * and useful. Never includes GPID as a "gap" if identity is already sufficient.
 */
function checkGaps(entity: EntityState): string[] {
  const gaps: string[] = [];
  const score = computeIdentityScore(entity);

  // Contact / discovery gaps (always useful to fill)
  if (!entity.website) gaps.push('website');
  if (!entity.instagram) gaps.push('instagram');
  if (!entity.phone) gaps.push('phone');

  // Location gaps — only if we have NO location signal at all
  if (!hasLocation(entity)) gaps.push('location');

  // Identity gap — only if composite score is below threshold
  if (score < IDENTITY_THRESHOLD) gaps.push('weak_identity');

  return gaps;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function smartEnrich(input: SmartEnrichInput): Promise<SmartEnrichResult> {
  const city = input.city ?? 'Los Angeles';
  const category = input.category ?? 'restaurant';
  const phases: PhaseResult[] = [];
  let entityId = input.entityId ?? '';
  let slug = '';

  // ── Resolve or create entity ──────────────────────────────────────
  if (entityId) {
    const existing = await db.entities.findUnique({
      where: { id: entityId },
      select: { id: true, slug: true },
    });
    if (!existing) throw new Error(`Entity not found: ${entityId}`);
    slug = existing.slug;
  } else {
    // Check if entity already exists by name (fuzzy)
    const candidates = await db.entities.findMany({
      where: { name: { contains: input.name, mode: 'insensitive' } },
      select: { id: true, slug: true, name: true },
      take: 5,
    });

    const exactMatch = candidates.find(
      (c) => tokenSortRatio(c.name.toLowerCase(), input.name.toLowerCase()) >= 0.90,
    );

    if (exactMatch) {
      entityId = exactMatch.id;
      slug = exactMatch.slug;
      console.log(`[smart-enrich] Matched existing entity: ${exactMatch.name} (${slug})`);
    } else if (!input.dryRun) {
      // Create new CANDIDATE entity
      const newSlug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const created = await db.entities.create({
        data: {
          name: input.name,
          slug: newSlug,
          status: 'CANDIDATE',
          neighborhood: input.neighborhood ?? null,
          category: category,
          primary_vertical: 'EAT',
        } as any,
      });
      entityId = created.id;
      slug = newSlug;
      console.log(`[smart-enrich] Created new entity: ${input.name} (${slug})`);
    } else {
      return {
        entityId: '',
        slug: '',
        phases: [],
        totalCostEstimate: '$0.00',
        gaps: ['Entity would be created (dry run)'],
      };
    }
  }

  // ── Phase 1: Discover via Haiku (~$0.01) ──────────────────────────
  const p1Start = Date.now();
  try {
    const discovery = await phase1Discover(input.name, city, input.neighborhood ?? null, category);
    const discovered: Record<string, string | null> = {};

    if (discovery.website && !input.dryRun) {
      const existing = await db.entities.findUnique({ where: { id: entityId }, select: { website: true } });
      if (!existing?.website) {
        await writeClaimAndSanction(db, {
          entityId,
          sourceId: 'operator_website',
          attributeKey: 'website',
          rawValue: discovery.website,
          extractionMethod: 'AI_EXTRACT',
          confidence: discovery.confidence === 'high' ? 0.95 : 0.80,
          resolutionMethod: 'SLUG_EXACT',
        });
        discovered.website = discovery.website;
      }
    }

    if (discovery.instagram && !input.dryRun) {
      const existing = await db.entities.findUnique({ where: { id: entityId }, select: { instagram: true } });
      if (!existing?.instagram) {
        await writeClaimAndSanction(db, {
          entityId,
          sourceId: 'operator_website',
          attributeKey: 'instagram',
          rawValue: discovery.instagram,
          extractionMethod: 'AI_EXTRACT',
          confidence: discovery.confidence === 'high' ? 0.95 : 0.80,
          resolutionMethod: 'SLUG_EXACT',
        });
        discovered.instagram = discovery.instagram;
      }
    }

    if (discovery.neighborhood && input.neighborhood === undefined && !input.dryRun) {
      const existing = await db.entities.findUnique({ where: { id: entityId }, select: { neighborhood: true } });
      if (!existing?.neighborhood) {
        await db.entities.update({ where: { id: entityId }, data: { neighborhood: discovery.neighborhood } });
        discovered.neighborhood = discovery.neighborhood;
      }
    }

    phases.push({
      phase: 1,
      name: 'Discover (Haiku web search)',
      status: 'ran',
      cost: '~$0.01',
      discovered,
      duration_ms: Date.now() - p1Start,
    });
  } catch (e) {
    console.error('[smart-enrich] Phase 1 failed:', e);
    phases.push({ phase: 1, name: 'Discover (Haiku web search)', status: 'failed', cost: '~$0.01', discovered: {}, duration_ms: Date.now() - p1Start });
  }

  // ── Phase 2: Surface scrape (FREE) ────────────────────────────────
  const p2Start = Date.now();
  try {
    const { surfaceCount } = await phase2Scrape(entityId);
    phases.push({
      phase: 2,
      name: 'Surface scrape',
      status: surfaceCount > 0 ? 'ran' : 'skipped',
      cost: 'FREE',
      discovered: { surfaces: String(surfaceCount) },
      duration_ms: Date.now() - p2Start,
    });
  } catch (e) {
    console.error('[smart-enrich] Phase 2 failed:', e);
    phases.push({ phase: 2, name: 'Surface scrape', status: 'failed', cost: 'FREE', discovered: {}, duration_ms: Date.now() - p2Start });
  }

  // ── Phase 3: Parse + extract (FREE) ───────────────────────────────
  const p3Start = Date.now();
  try {
    const { artifactCount } = await phase3Extract(entityId);
    phases.push({
      phase: 3,
      name: 'Parse + extract',
      status: artifactCount > 0 ? 'ran' : 'skipped',
      cost: 'FREE',
      discovered: { artifacts: String(artifactCount) },
      duration_ms: Date.now() - p3Start,
    });
  } catch (e) {
    console.error('[smart-enrich] Phase 3 failed:', e);
    phases.push({ phase: 3, name: 'Parse + extract', status: 'failed', cost: 'FREE', discovered: {}, duration_ms: Date.now() - p3Start });
  }

  // ── Gap check → decide if Phase 4 (Google) is needed ──────────────
  const entityState = await db.entities.findUnique({
    where: { id: entityId },
    select: { website: true, instagram: true, googlePlaceId: true, latitude: true, longitude: true, neighborhood: true, phone: true },
  });

  const gapsBefore = entityState ? checkGaps(entityState) : [];
  // Only call Google if we have NO location signal or identity is weak
  const needsGoogle = gapsBefore.includes('location') || gapsBefore.includes('weak_identity');

  // ── Phase 4: Google Places (only if location/identity gaps, ~$0.03) ──
  if (needsGoogle && !input.cheapOnly) {
    const p4Start = Date.now();
    try {
      const filled = await phase4GapFill(entityId, input.name, city);
      phases.push({
        phase: 4,
        name: 'Google Places gap fill',
        status: 'ran',
        cost: '~$0.03',
        discovered: filled,
        duration_ms: Date.now() - p4Start,
      });
    } catch (e) {
      console.error('[smart-enrich] Phase 4 failed:', e);
      phases.push({ phase: 4, name: 'Google Places gap fill', status: 'failed', cost: '~$0.03', discovered: {}, duration_ms: Date.now() - p4Start });
    }
  } else {
    phases.push({
      phase: 4,
      name: 'Google Places gap fill',
      status: 'skipped',
      cost: 'FREE',
      discovered: {},
      duration_ms: 0,
    });
  }

  // ── Update enrichment tracking ────────────────────────────────────
  if (!input.dryRun) {
    await db.entities.update({
      where: { id: entityId },
      data: { lastEnrichedAt: new Date() },
    }).catch(() => {});

    // Auto-rescan issues
    try {
      await scanEntities(db, { slugs: [slug] });
    } catch {
      // non-fatal
    }
  }

  // ── Final gap check ───────────────────────────────────────────────
  const finalState = await db.entities.findUnique({
    where: { id: entityId },
    select: { website: true, instagram: true, googlePlaceId: true, latitude: true, longitude: true, neighborhood: true, phone: true },
  });
  const finalGaps = finalState ? checkGaps(finalState) : [];

  // Cost estimate
  const totalCost = phases.reduce((sum, p) => {
    if (p.status !== 'ran') return sum;
    const match = p.cost.match(/\$([0-9.]+)/);
    return sum + (match ? parseFloat(match[1]) : 0);
  }, 0);

  return {
    entityId,
    slug,
    phases,
    totalCostEstimate: `$${totalCost.toFixed(2)}`,
    gaps: finalGaps,
  };
}
