/**
 * Saiko Voice Engine v2.0 — Description Extraction
 *
 * Tier 1: Extract verbatim merchant About text from merchant_surface_artifacts.
 * Tier selection logic: determines which tier applies for a given entity's data.
 * Quality metadata computation for all tiers.
 *
 * Spec: docs/traces/about-description-spec-v1.md
 * Work order: docs/traces/WO-ABOUT-001-voice-descriptor-pipeline.md
 */

import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DescriptionTier = 1 | 2 | 3;
export type SignalDensity = 'low' | 'medium' | 'high';

export interface DescriptionQuality {
  source_tier: DescriptionTier;
  source_coverage_score: number; // 0.0–1.0
  signal_density: SignalDensity;
}

export interface Tier1ExtractionResult {
  tier: 1;
  text: string;
  quality: DescriptionQuality;
  surfaceType: string; // 'about' | 'homepage'
  sourceUrl: string;
}

export interface TierSelectionResult {
  tier: DescriptionTier | null;
  reason: string;
  /** Tier 1 only: extracted text ready to write */
  tier1Result?: Tier1ExtractionResult;
  /** Tier 2: richest text blocks from merchant surfaces for synthesis prompt */
  tier2Inputs?: {
    textBlocks: string[];
    surfaceType: string;
    sourceUrl: string;
  };
  /** Tier 3: entity metadata + identity signals for composition prompt */
  tier3Inputs?: {
    name: string;
    category: string | null;
    neighborhood: string | null;
  };
}

export interface EntityDescriptionRecord {
  id: string;
  name: string;
  category: string | null;
  neighborhood: string | null;
  description: string | null;
  description_source: string | null;
  /** identity_signals JSON from derived_signals (null if none) */
  identitySignals: Record<string, unknown> | null;
  /** merchant surface artifacts grouped by surface_type, ordered by richness */
  surfaces: SurfaceData[];
}

export interface SurfaceData {
  surfaceType: string;
  sourceUrl: string;
  textBlocks: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum word count for a coherent about paragraph (Tier 1) */
const MIN_WORDS_TIER1 = 30;
/** Maximum word count — beyond this it's likely a full page dump */
const MAX_WORDS_TIER1 = 150;
/** Minimum word count for any usable text block (Tier 2 input) */
const MIN_WORDS_USABLE = 15;

// ---------------------------------------------------------------------------
// Coherence filters
// ---------------------------------------------------------------------------

/**
 * Check if a text block looks like navigation or boilerplate rather than
 * descriptive content. Returns true if the block should be REJECTED.
 */
function isBoilerplate(text: string): boolean {
  const lower = text.toLowerCase();
  const words = text.split(/\s+/);
  const wordCount = words.length;

  // Very short fragments that are just labels
  if (wordCount < 5) return true;

  // Nav dump: excessive short fragments separated by pipes or bullets
  if ((lower.match(/\|/g) || []).length > 3) return true;
  if ((lower.match(/[•·]/g) || []).length > 3) return true;

  // Nav/UI dump: high ratio of very short "words" (1-3 chars) typical of
  // "Skip to Content Open Menu Close Menu Rentals 0 0" type text
  const shortTokens = words.filter(w => w.length <= 2).length;
  if (wordCount >= 10 && shortTokens / wordCount > 0.4) return true;

  // Nav patterns: starts with typical site chrome
  if (/^(?:skip to|sign in|sign up|log in|cart|menu|home|search|close|open)/i.test(lower)) return true;

  // E-commerce/cart patterns
  if (/\$\d+\.\d{2}.*\(\d+\)/i.test(text)) return true; // "$0.00 (0)" cart pattern

  // Language selector patterns (e.g. "English 简体中文 繁体中文")
  if (/(?:english|español|français|deutsch)\s+[\u4e00-\u9fff]/i.test(text)) return true;
  // CJK-heavy text blocks (likely language selectors or non-English nav)
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3040-\u30ff]/g) || []).length;
  if (cjkChars > 5 && cjkChars / text.length > 0.1) return true;

  // Repeated short fragments — nav menus often repeat words like "Menu" "Shop" "Home"
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (wordCount >= 15 && uniqueWords.size / wordCount < 0.5) return true;

  // Hours/schedule patterns
  if (/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*\b(?:am|pm|\d{1,2}:\d{2})\b/i.test(text)) return true;

  // Reservation / ordering CTA-only blocks
  if (/^(?:make a reservation|book now|order online|reserve a table|click here)/i.test(lower)) return true;

  // Cookie consent / legal boilerplate
  if (/(?:cookie policy|privacy policy|terms of service|all rights reserved)/i.test(lower)) return true;

  // Generic site footer patterns
  if (/(?:©\s*\d{4}|all rights reserved|powered by)/i.test(lower)) return true;

  // Sentence structure check: real About paragraphs tend to have sentence-ending punctuation.
  // Nav dumps rarely do. If 30+ words and no period/exclamation/question mark, suspicious.
  const hasSentenceEnding = /[.!?]/.test(text);
  if (wordCount >= 30 && !hasSentenceEnding) return true;

  return false;
}

/**
 * Check if a text block describes the place (vs. being a menu, address, etc.)
 * Returns true if the block is likely descriptive About content.
 */
function isDescriptiveContent(text: string): boolean {
  const wordCount = text.split(/\s+/).length;

  // Must meet minimum length
  if (wordCount < MIN_WORDS_TIER1) return false;

  // Must not exceed maximum (full-page dumps)
  if (wordCount > MAX_WORDS_TIER1) return false;

  // Must not be boilerplate
  if (isBoilerplate(text)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Tier 1 — Verbatim extraction
// ---------------------------------------------------------------------------

/**
 * Attempt Tier 1 extraction: find the best verbatim About paragraph from
 * the entity's merchant surfaces.
 *
 * Surface priority: about > homepage (spec Section 3, Tier 1).
 * Within a surface, pick the longest coherent text block.
 */
export function extractTier1(surfaces: SurfaceData[]): Tier1ExtractionResult | null {
  // Priority order for Tier 1
  const priorityOrder = ['about', 'homepage'];

  for (const surfaceType of priorityOrder) {
    const surface = surfaces.find(s => s.surfaceType === surfaceType);
    if (!surface || surface.textBlocks.length === 0) continue;

    // Find the longest coherent block
    const candidates = surface.textBlocks
      .filter(isDescriptiveContent)
      .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length);

    if (candidates.length > 0) {
      const text = candidates[0].trim();
      return {
        tier: 1,
        text,
        quality: {
          source_tier: 1,
          source_coverage_score: 1.0,
          signal_density: 'high',
        },
        surfaceType: surface.surfaceType,
        sourceUrl: surface.sourceUrl,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Tier selection
// ---------------------------------------------------------------------------

/**
 * Determine which description tier applies for an entity, per spec Section 4.
 *
 * Gate: entity must have at least one of: merchant surfaces, identity signals,
 * or (category + neighborhood).
 */
export function selectTier(record: EntityDescriptionRecord): TierSelectionResult {
  const hasSurfaces = record.surfaces.length > 0 && record.surfaces.some(s => s.textBlocks.length > 0);
  const hasIdentitySignals = record.identitySignals !== null && Object.keys(record.identitySignals).length > 0;
  const hasCategoryContext = !!(record.category && record.neighborhood);

  // Gate: minimum data requirement
  if (!hasSurfaces && !hasIdentitySignals && !hasCategoryContext) {
    return { tier: null, reason: 'below_minimum_data_gate' };
  }

  // Tier 1: verbatim merchant copy
  if (hasSurfaces) {
    const tier1 = extractTier1(record.surfaces);
    if (tier1) {
      return {
        tier: 1,
        reason: `verbatim_from_${tier1.surfaceType}`,
        tier1Result: tier1,
      };
    }
  }

  // Tier 2: surfaces exist but no single coherent paragraph — synthesize
  if (hasSurfaces) {
    // Collect usable text blocks from all surfaces, prioritized
    const priorityOrder = ['about', 'homepage', 'menu'];
    let bestSurface: SurfaceData | null = null;
    let bestBlocks: string[] = [];

    for (const surfaceType of priorityOrder) {
      const surface = record.surfaces.find(s => s.surfaceType === surfaceType);
      if (!surface) continue;

      const usable = surface.textBlocks.filter(
        tb => !isBoilerplate(tb) && tb.split(/\s+/).length >= MIN_WORDS_USABLE
      );

      if (usable.length > bestBlocks.length) {
        bestSurface = surface;
        bestBlocks = usable;
      }
    }

    if (bestSurface && bestBlocks.length > 0) {
      return {
        tier: 2,
        reason: `synthesize_from_${bestSurface.surfaceType}`,
        tier2Inputs: {
          textBlocks: bestBlocks,
          surfaceType: bestSurface.surfaceType,
          sourceUrl: bestSurface.sourceUrl,
        },
      };
    }
  }

  // Tier 3: compose from signals
  if (hasIdentitySignals || hasCategoryContext) {
    return {
      tier: 3,
      reason: hasIdentitySignals ? 'compose_from_signals' : 'compose_from_category_context',
      tier3Inputs: {
        name: record.name,
        category: record.category,
        neighborhood: record.neighborhood,
      },
    };
  }

  return { tier: null, reason: 'no_viable_tier' };
}

// ---------------------------------------------------------------------------
// Quality metadata computation
// ---------------------------------------------------------------------------

/**
 * Compute description quality metadata for Tier 2 or Tier 3.
 * Tier 1 always returns fixed values (1.0 coverage, high density).
 */
export function computeQuality(
  tier: DescriptionTier,
  options: {
    textBlockCount?: number;
    identitySignals?: Record<string, unknown> | null;
    hasCoverageSources?: boolean;
  }
): DescriptionQuality {
  if (tier === 1) {
    return { source_tier: 1, source_coverage_score: 1.0, signal_density: 'high' };
  }

  // Count meaningful identity signals
  const signals = options.identitySignals ?? {};
  const signalKeys = [
    'cuisine_posture', 'service_model', 'price_tier',
    'wine_program_intent', 'place_personality',
    'signature_dishes', 'key_producers', 'language_signals', 'origin_story_type',
  ];
  const filledSignals = signalKeys.filter(k => {
    const val = signals[k];
    if (val === null || val === undefined) return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;

  // Signal density
  let signal_density: SignalDensity;
  const totalInputs = filledSignals + (options.textBlockCount ?? 0) + (options.hasCoverageSources ? 1 : 0);
  if (totalInputs >= 4) signal_density = 'high';
  else if (totalInputs >= 2) signal_density = 'medium';
  else signal_density = 'low';

  // Source coverage score
  let source_coverage_score: number;
  if (tier === 2) {
    // Tier 2: primarily based on how much merchant copy is available
    const blockScore = Math.min((options.textBlockCount ?? 0) / 5, 0.7);
    const signalBonus = Math.min(filledSignals / 9, 0.3);
    source_coverage_score = Math.round((blockScore + signalBonus) * 100) / 100;
  } else {
    // Tier 3: based on signal richness
    const signalScore = Math.min(filledSignals / 9, 0.8);
    const coverageBonus = options.hasCoverageSources ? 0.2 : 0;
    source_coverage_score = Math.round((signalScore + coverageBonus) * 100) / 100;
  }

  return {
    source_tier: tier,
    source_coverage_score: Math.min(source_coverage_score, 1.0),
    signal_density,
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

/**
 * Fetch entities with their merchant surface artifacts and identity signals
 * for description generation. Returns records shaped for tier selection.
 */
export async function fetchRecordsForDescriptionGeneration(
  db: PrismaClient,
  options: {
    limit?: number;
    reprocess?: boolean;
    placeName?: string;
    entityId?: string;
  }
): Promise<EntityDescriptionRecord[]> {
  // Build entity filter
  const entityWhere: Record<string, unknown> = {};
  if (options.entityId) {
    entityWhere.id = options.entityId;
  }
  if (options.placeName) {
    entityWhere.name = { contains: options.placeName, mode: 'insensitive' };
  }

  // Fetch entities with surfaces
  const entities = await db.entities.findMany({
    where: entityWhere,
    select: {
      id: true,
      name: true,
      category: true,
      neighborhood: true,
      description: true,
      description_source: true,
      merchant_surfaces: {
        where: {
          surface_type: { in: ['about', 'homepage', 'menu'] },
          parse_status: 'parse_success',
        },
        select: {
          surface_type: true,
          source_url: true,
          artifacts: {
            where: {
              artifact_type: 'parse_v1',
            },
            select: {
              artifact_json: true,
            },
            take: 1,
            orderBy: { created_at: 'desc' },
          },
        },
        orderBy: { discovered_at: 'desc' },
      },
    },
    take: options.limit ?? undefined,
    orderBy: { name: 'asc' },
  });

  // Filter: skip entities that already have a description (unless reprocessing)
  const filtered = options.reprocess
    ? entities
    : entities.filter(e => {
        // Skip if description exists and came from a strong source
        if (e.description && e.description_source === 'editorial') return false;
        return true;
      });

  // Fetch identity signals for all entity IDs in a single query
  const entityIds = filtered.map(e => e.id);
  const signalRows = await db.derived_signals.findMany({
    where: {
      entity_id: { in: entityIds },
      signal_key: 'identity_signals',
    },
    select: {
      entity_id: true,
      signal_value: true,
    },
    orderBy: { computed_at: 'desc' },
    distinct: ['entity_id'],
  });
  const signalMap = new Map(signalRows.map(r => [r.entity_id, r.signal_value as Record<string, unknown>]));

  // Shape records
  return filtered.map(e => {
    const surfaces: SurfaceData[] = e.merchant_surfaces
      .filter(ms => ms.artifacts.length > 0)
      .map(ms => {
        const artifact = ms.artifacts[0].artifact_json as { text_blocks?: string[] } | null;
        return {
          surfaceType: ms.surface_type,
          sourceUrl: ms.source_url,
          textBlocks: artifact?.text_blocks ?? [],
        };
      });

    return {
      id: e.id,
      name: e.name,
      category: e.category,
      neighborhood: e.neighborhood,
      description: e.description,
      description_source: e.description_source,
      identitySignals: signalMap.get(e.id) ?? null,
      surfaces,
    };
  });
}
