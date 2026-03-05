/**
 * Coverage Apply Description — Fills NEED_DESCRIPTION for queued places.
 *
 * Source hierarchy (highest to lowest priority):
 *   1. merchant          — Merchant website meta/about description
 *   2. saiko_editorial   — Existing Saiko editorial description
 *   3. editorial_source  — Third-party editorial (Google editorial_summary, Resy, etc.)
 *   4. synthesis         — Structured synthesis from place signals via Claude (≤ 60 words)
 *
 * A description is only overwritten when the incoming source outranks the existing one.
 *
 * Batch mode uses runCoverageAudit(); --slug mode bypasses audit.
 * Idempotent: skips places that already have non-empty description.
 *
 * Usage:
 *   REQUIRE_DB_HOST=... REQUIRE_DB_NAME=... npm run coverage:apply:description:neon -- --la-only --limit=50
 *   ... --apply   # persist changes
 *
 * Flags:
 *   --slug=X      Process a single place by slug (bypasses audit)
 *   --limit=N     Max places to process (default 20)
 *   --la-only     Filter to LA bbox (default: true)
 *   --no-la-only  Disable LA filter
 *   --ttl-days=N  Override COVERAGE_TTL_DAYS
 *
 * Output:
 *   Terminal summary: written / skipped_existing / skipped_no_google_desc / failed
 *   JSON report: data/coverage/coverage_apply_description__YYYYMMDD_HHMMSS.json
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { getPlaceDetails, getPlaceAttributes, type PlaceDetails, type GooglePlacesAttributes } from '@/lib/google-places';
import { runEnrichmentForPlace } from '@/lib/website-enrichment/pipeline';
import { runCoverageAudit, type CoverageCandidate } from './coverage-run';

const DEFAULT_LIMIT = 20;
const RATE_LIMIT_MS = 250;

// ---------------------------------------------------------------------------
// DB identity (mirrors coverage-run)
// ---------------------------------------------------------------------------
function parseDatabaseUrl(): { host: string; dbname: string } {
  const u = process.env.DATABASE_URL ?? '';
  const hostMatch = u.match(/@([^/]+)\//);
  const dbMatch = u.match(/@[^/]+\/([^?]+)/);
  return {
    host: hostMatch ? hostMatch[1] : '?',
    dbname: dbMatch ? dbMatch[1] : '?',
  };
}

function hostMatches(parsed: string, required: string): boolean {
  return parsed === required || parsed.startsWith(required + ':');
}

function assertDbIdentity(): void {
  const { host, dbname } = parseDatabaseUrl();
  const requireHost = process.env.REQUIRE_DB_HOST;
  const requireName = process.env.REQUIRE_DB_NAME;

  if (requireHost && !hostMatches(host, requireHost)) {
    console.error(
      `[COVERAGE APPLY DESCRIPTION] Source-of-truth mismatch: REQUIRE_DB_HOST=${requireHost} but DATABASE_URL host is "${host}"`
    );
    process.exit(1);
  }
  if (requireName && dbname !== requireName) {
    console.error(
      `[COVERAGE APPLY DESCRIPTION] Source-of-truth mismatch: REQUIRE_DB_NAME=${requireName} but DATABASE_URL dbname is "${dbname}"`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Filter candidates to NEED_DESCRIPTION only
// ---------------------------------------------------------------------------
function filterToDescription(candidates: CoverageCandidate[]): CoverageCandidate[] {
  return candidates.filter((c) => {
    if (!c.missing_groups.includes('NEED_DESCRIPTION')) return false;
    if (!c.google_place_id?.trim()) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Description source hierarchy
// ---------------------------------------------------------------------------

const SOCIAL_MEDIA_HOSTS = [
  'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com', 'linkedin.com', 'yelp.com',
];

function isSocialMediaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return SOCIAL_MEDIA_HOSTS.some((s) => host === s || host.endsWith('.' + s));
  } catch {
    return false;
  }
}

type DescriptionSource = 'merchant' | 'saiko_editorial' | 'editorial_source' | 'synthesis';

const SOURCE_PRIORITY: DescriptionSource[] = [
  'merchant', 'saiko_editorial', 'editorial_source', 'synthesis',
];

function sourceOutranks(incoming: DescriptionSource, existing: string | null): boolean {
  if (!existing) return true;
  const incomingRank = SOURCE_PRIORITY.indexOf(incoming);
  const existingRank = SOURCE_PRIORITY.indexOf(existing as DescriptionSource);
  if (existingRank === -1) return true;
  return incomingRank < existingRank;
}

interface DescriptionResult {
  text: string;
  source: DescriptionSource;
  confidence: number;
}

/**
 * Tier 2: Extract description from merchant website (meta_description or about text).
 * Skips social media URLs.
 */
async function tryWebsiteDescription(
  placeId: string,
  website: string | null
): Promise<string | null> {
  if (!website?.trim() || isSocialMediaUrl(website)) return null;

  try {
    const payload = await runEnrichmentForPlace({ place_id: placeId, website });
    const meta = payload.raw.meta_description?.trim();
    if (meta && meta.length >= 40 && meta.length <= 300) return meta;
    const about = payload.raw.about_text_sample?.trim();
    if (about && about.length >= 40) return about.slice(0, 300);
  } catch {
    // Website fetch failures are non-fatal
  }
  return null;
}

/**
 * Tier 3: Google Place Details editorial_summary.
 */
function tryGoogleEditorial(details: PlaceDetails | null): string | null {
  const desc = details?.editorialSummary?.trim();
  return desc && desc.length > 0 ? desc : null;
}

/**
 * Tier 4: Structured synthesis from place signals via Claude (≤ 60 words).
 *
 * Google serves_breakfast/brunch/lunch/dinner flags are unreliable and excluded
 * unless corroborated by menu signals or merchant website content.
 * Safe signals: category, neighborhood, beverage service, reservation, dine-in/takeout.
 */
async function synthesizeDescription(
  name: string,
  neighborhood: string | null,
  details: PlaceDetails | null,
  attrs: GooglePlacesAttributes | null,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('  ⚠ ANTHROPIC_API_KEY not set — skipping synthesis.');
    return null;
  }

  const signals: string[] = [];

  const types = attrs?.types ?? details?.types ?? [];
  const displayTypes = types
    .filter((t) => !['point_of_interest', 'establishment'].includes(t))
    .slice(0, 4);
  if (displayTypes.length) signals.push(`Type: ${displayTypes.join(', ')}`);

  if (neighborhood) signals.push(`Neighborhood: ${neighborhood}`);
  if (details?.formattedAddress) signals.push(`Address: ${details.formattedAddress}`);

  const priceLevel = attrs?.price_level ?? details?.priceLevel;
  if (priceLevel != null) signals.push(`Price level: ${'$'.repeat(priceLevel + 1)}`);

  // Rating/review-count excluded — reads like a database record, not editorial text.

  const serviceAttrs: string[] = [];
  // Beverage service flags are reliable
  if (attrs?.serves_beer) serviceAttrs.push('Serves beer');
  if (attrs?.serves_wine) serviceAttrs.push('Serves wine');
  // Operational flags are reliable
  if (attrs?.reservable) serviceAttrs.push('Reservable');
  if (attrs?.dine_in) serviceAttrs.push('Dine-in');
  if (attrs?.takeout) serviceAttrs.push('Takeout available');
  if (attrs?.delivery) serviceAttrs.push('Delivery');
  if (serviceAttrs.length) signals.push(`Services: ${serviceAttrs.join(', ')}`);

  // NOTE: serves_breakfast/brunch/lunch/dinner intentionally excluded —
  // Google meal flags are unreliable without corroboration from menu or merchant data.

  if (signals.length === 0) return null;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: process.env.AI_MODEL || 'claude-sonnet-4-5-20250929',
    max_tokens: 120,
    system: `You write factual one-to-two sentence descriptions of places for a city guide. Max 60 words. Voice: calm, direct, informative. Describe what the place IS — not why it's good. No superlatives, no marketing language, no "hidden gem", no "must-visit". No exclamation marks. Write as if noting facts for a knowledgeable friend. Do not claim specific meal services (breakfast, lunch, dinner, brunch) unless the signals explicitly confirm them via menu data or merchant content. Saying "food available" or "serves food" is acceptable if the type implies it.`,
    messages: [{
      role: 'user',
      content: `Write a brief factual description for this place. Only use the signals provided — do not invent details.\n\nPlace: ${name}\n${signals.join('\n')}`,
    }],
  });

  const block = message.content[0];
  const text = block.type === 'text' ? block.text.trim() : '';
  return text.length > 0 ? text : null;
}

/**
 * Resolve description using the source hierarchy.
 * Tries sources in priority order: merchant → editorial_source → synthesis.
 * Returns the first successful result or null.
 */
async function resolveDescription(
  entity: { id: string; name: string; website: string | null; neighborhood: string | null },
  googlePlaceId: string | null,
): Promise<DescriptionResult | null> {
  // Tier 1: Merchant website
  console.log('  [1/3] Checking merchant website...');
  const websiteDesc = await tryWebsiteDescription(entity.id, entity.website);
  if (websiteDesc) {
    console.log(`  ✓ Found merchant description (${websiteDesc.length} chars)`);
    return { text: websiteDesc, source: 'merchant', confidence: 0.8 };
  }
  console.log('  — No usable merchant description.');

  // Tier 2: Third-party editorial (Google editorial summary, etc.)
  let details: PlaceDetails | null = null;
  let attrs: GooglePlacesAttributes | null = null;
  const gpid = googlePlaceId?.trim();
  const googleEnabled =
    !!process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_ENABLED === 'true';

  if (gpid && googleEnabled) {
    console.log('  [2/3] Checking editorial sources...');
    try {
      details = await getPlaceDetails(gpid);
      const googleDesc = tryGoogleEditorial(details);
      if (googleDesc) {
        console.log(`  ✓ Found editorial source description (${googleDesc.length} chars)`);
        return { text: googleDesc, source: 'editorial_source', confidence: 0.9 };
      }
      console.log('  — No editorial source description.');
    } catch (e) {
      console.warn(`  ⚠ Google Place Details fetch failed: ${e instanceof Error ? e.message : e}`);
    }

    try {
      attrs = await getPlaceAttributes(gpid);
    } catch {
      // Non-fatal — synthesis can work with details alone
    }
  } else if (gpid) {
    console.log('  [2/3] Skipped — GOOGLE_PLACES_API_KEY or GOOGLE_PLACES_ENABLED not set.');
  } else {
    console.log('  [2/3] Skipped — no google_place_id.');
  }

  // Tier 3: Structured synthesis
  console.log('  [3/3] Generating synthesis from place signals...');
  const synthesis = await synthesizeDescription(entity.name, entity.neighborhood, details, attrs);
  if (synthesis) {
    console.log(`  ✓ Generated synthesis (${synthesis.length} chars)`);
    return { text: synthesis, source: 'synthesis', confidence: 0.6 };
  }
  console.log('  — Synthesis failed.');

  return null;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(): {
  apply: boolean;
  limit: number;
  laOnly: boolean;
  ttlDays: number;
  slug: string | null;
} {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((a) => a.startsWith('--limit=')) ?? argv.find((a) => a === '--limit');
  const limit = limitArg
    ? parseInt(
        limitArg.includes('=') ? limitArg.split('=')[1] ?? '' : argv[argv.indexOf('--limit') + 1] ?? '',
        10
      ) || DEFAULT_LIMIT
    : DEFAULT_LIMIT;

  const ttlArg = argv.find((a) => a.startsWith('--ttl-days=')) ?? argv.find((a) => a === '--ttl-days');
  const ttlDays = ttlArg
    ? parseInt(
        ttlArg.includes('=')
          ? ttlArg.split('=')[1] ?? ''
          : argv[argv.indexOf('--ttl-days') + 1] ?? '',
        10
      ) || 90
    : parseInt(process.env.COVERAGE_TTL_DAYS ?? '90', 10);

  const slugArg = argv.find((a) => a.startsWith('--slug=')) ?? argv.find((a) => a === '--slug');
  const slug = slugArg
    ? slugArg.includes('=')
      ? slugArg.split('=')[1]?.trim() || null
      : argv[argv.indexOf('--slug') + 1]?.trim() || null
    : null;

  return {
    apply: argv.includes('--apply'),
    limit,
    laOnly: !argv.includes('--no-la-only'),
    ttlDays,
    slug,
  };
}

export interface CoverageApplyDescriptionReport {
  run_id: string;
  created_at: string;
  dry_run: boolean;
  params: { limit: number; la_only: boolean; ttl_days: number };
  counts: {
    candidates_total: number;
    candidates_filtered: number;
    processed: number;
    written: number;
    skipped_existing: number;
    skipped_no_google_desc: number;
    failed: number;
  };
  failed_slugs: string[];
  errors: { slug: string; error: string }[];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function enrichSingleSlug(slugValue: string, dryRun: boolean): Promise<void> {
  console.log(`\n=== Coverage Apply Description — single slug: ${slugValue} ===\n`);
  if (dryRun) console.log('DRY RUN — no writes. Use --apply to persist.\n');

  const entity = await db.$queryRaw<Array<{
    id: string; slug: string; name: string; google_place_id: string | null;
    description: string | null; website: string | null; neighborhood: string | null;
    description_source: string | null;
  }>>`
    SELECT id, slug, name, google_place_id, description, website, neighborhood, description_source
    FROM entities WHERE slug = ${slugValue} LIMIT 1
  `.then((rows) => rows[0] ?? null);

  if (!entity) {
    console.error(`❌ No entity found with slug "${slugValue}".`);
    process.exit(1);
  }

  console.log(`  Entity: ${entity.name} (${entity.id})`);
  console.log(`  Google Place ID: ${entity.google_place_id ?? '(none)'}`);
  console.log(`  Website: ${entity.website ?? '(none)'}`);
  console.log(`  Current description: ${entity.description ? `${entity.description.length} chars` : '(null)'}`);
  console.log(`  Current source: ${entity.description_source ?? '(none)'}`);

  const result = await resolveDescription(
    { id: entity.id, name: entity.name, website: entity.website, neighborhood: entity.neighborhood },
    entity.google_place_id,
  );

  if (!result) {
    console.log('\n  ⏭ No description source produced a result.');
    return;
  }

  // Source hierarchy guard: only overwrite if incoming source outranks existing
  if (entity.description?.trim() && !sourceOutranks(result.source, entity.description_source)) {
    console.log(`\n  ⏭ Skipping: existing source "${entity.description_source}" is equal or higher priority than incoming "${result.source}".`);
    return;
  }

  console.log(`\n  Result (${result.source}): "${result.text}"`);

  if (!dryRun) {
    await db.$executeRaw`
      UPDATE entities
      SET description = ${result.text},
          description_source = ${result.source},
          description_confidence = ${result.confidence},
          description_reviewed = false,
          updated_at = NOW()
      WHERE id = ${entity.id}
    `;
    console.log(`  ✓ Written to entities.description (source: ${result.source}, confidence: ${result.confidence}).`);
  } else {
    console.log(`  [DRY] Would write to entities.description (source: ${result.source}, confidence: ${result.confidence}).`);
  }
}

async function main() {
  assertDbIdentity();

  const { apply, limit, laOnly, ttlDays, slug } = parseArgs();
  const dryRun = !apply;

  if (slug) {
    await enrichSingleSlug(slug, dryRun);
    return;
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set.');
    process.exit(1);
  }
  if (process.env.GOOGLE_PLACES_ENABLED !== 'true') {
    console.error('❌ GOOGLE_PLACES_ENABLED must be true.');
    process.exit(1);
  }

  const report: CoverageApplyDescriptionReport = {
    run_id: `apply_desc_${Date.now()}`,
    created_at: new Date().toISOString(),
    dry_run: dryRun,
    params: { limit, la_only: laOnly, ttl_days: ttlDays },
    counts: {
      candidates_total: 0,
      candidates_filtered: 0,
      processed: 0,
      written: 0,
      skipped_existing: 0,
      skipped_no_google_desc: 0,
      failed: 0,
    },
    failed_slugs: [],
    errors: [],
  };

  const auditLimit = Math.max(limit, 200);
  const auditReport = await runCoverageAudit({
    limit: auditLimit,
    laOnly,
    ttlDays,
    retryBackoffHours: parseInt(process.env.RETRY_BACKOFF_HOURS ?? '24', 10),
  });

  const filtered = filterToDescription(auditReport.candidates);
  const toProcess = filtered.slice(0, limit);

  report.counts.candidates_total = auditReport.candidates_count;
  report.counts.candidates_filtered = filtered.length;

  console.log('\n=== Coverage Apply Description (NEED_DESCRIPTION) ===\n');
  console.log(`DB: ${auditReport.db_identity.host} / ${auditReport.db_identity.dbname}`);
  console.log(`Params: limit=${limit} la_only=${laOnly} ttl_days=${ttlDays}`);
  console.log(`Candidates (NEED_DESCRIPTION): ${filtered.length} (processing up to ${toProcess.length})`);
  if (dryRun) {
    console.log('\nDRY RUN — no writes. Use --apply to persist.\n');
  } else {
    console.log('\n--apply: writes enabled.\n');
  }

  if (toProcess.length === 0) {
    console.log('No places to process. Done.');
    writeReport(report);
    return;
  }

  // Idempotency: fetch current descriptions for candidates
  const placeIds = toProcess.map((c) => c.place_id);
  const placesWithDesc = await db.entities.findMany({
    where: { id: { in: placeIds } },
    select: { id: true, description: true },
  });
  const hasExistingDesc = new Set(
    placesWithDesc.filter((p) => p.description != null && p.description.trim().length > 0).map((p) => p.id)
  );

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < toProcess.length; i++) {
    const candidate = toProcess[i];
    const { place_id, slug: candidateSlug, google_place_id } = candidate;
    report.counts.processed++;

    if (hasExistingDesc.has(place_id)) {
      report.counts.skipped_existing++;
      if (i < 5) console.log(`  ⏭ ${candidateSlug} (existing description)`);
      continue;
    }

    const gpid = google_place_id?.trim();
    if (!gpid) {
      report.counts.failed++;
      report.failed_slugs.push(candidateSlug);
      report.errors.push({ slug: candidateSlug, error: 'No google_place_id' });
      continue;
    }

    try {
      const details = await getPlaceDetails(gpid);
      await sleep(RATE_LIMIT_MS);

      const desc = (details?.editorialSummary ?? '').trim();
      if (!desc || desc.length === 0) {
        report.counts.skipped_no_google_desc++;
        if (i < 5) console.log(`  ⏭ ${candidateSlug} (NO_GOOGLE_DESCRIPTION)`);
        continue;
      }

      if (!dryRun) {
        await db.entities.update({
          where: { id: place_id },
          data: { description: desc },
        });
      }

      report.counts.written++;
      if (i < 10) {
        const label = dryRun ? '[DRY]' : '✓';
        console.log(`  ${label} ${candidateSlug} → description (${desc.length} chars)`);
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      report.counts.failed++;
      report.failed_slugs.push(candidateSlug);
      report.errors.push({ slug: candidateSlug, error });
      if (report.counts.failed <= 5) console.warn(`  ✗ ${candidateSlug}: ${error}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Processed: ${report.counts.processed}`);
  console.log(`Written: ${report.counts.written}`);
  console.log(`Skipped (existing): ${report.counts.skipped_existing}`);
  console.log(`Skipped (NO_GOOGLE_DESCRIPTION): ${report.counts.skipped_no_google_desc}`);
  console.log(`Failed: ${report.counts.failed}`);
  if (dryRun) {
    console.log('\n(DRY RUN — no changes persisted. Run with --apply to write.)');
  }

  const outPath = writeReport(report);
  console.log(`\nReport: ${outPath}`);
}

function writeReport(report: CoverageApplyDescriptionReport): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .slice(0, 15);
  const outDir = path.join(process.cwd(), 'data', 'coverage');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `coverage_apply_description__${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
