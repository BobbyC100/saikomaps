/**
 * Saiko Voice Engine v2.0 - Signal Extraction
 * Extract identity signals from entities + derived_signals (Fields v2 path).
 *
 * Signal shape: extract-identity-signals.ts writes a single comprehensive
 * derived_signal row with signal_key='identity_signals' whose signal_value
 * JSON includes BOTH the flat fields (cuisine_posture, service_model,
 * price_tier, wine_program_intent, place_personality) AND the extended fields
 * (language_signals, signature_dishes, key_producers, etc.).
 *
 * Individual derived_signal rows are also written per flat field key for
 * targeted filtering, but the identity_signals row is the canonical read path.
 */

import { PrismaClient } from '@prisma/client';
import { IdentitySignals, PlaceContext, TaglineGenerationInputV2 } from './types';

const prisma = new PrismaClient();

// ============================================
// SIGNAL EXTRACTION FROM GOLDEN RECORDS
// ============================================

/**
 * Extract identity signals and context from a record shaped like a golden_records row
 * (or the shim produced by fetchRecordsForTaglineGeneration from entities + derived_signals).
 */
export function extractSignalsFromGoldenRecord(record: any): {
  signals: IdentitySignals;
  context: PlaceContext;
} {
  // Parse identity_signals JSON field
  const identitySignalsJson = record.identity_signals || {};
  
  // Extract core signals from flat fields
  const signals: IdentitySignals = {
    cuisine_posture: record.cuisine_posture,
    service_model: record.service_model,
    price_tier: record.price_tier,
    wine_program_intent: record.wine_program_intent,
    place_personality: record.place_personality,
    
    // Extended signals from JSON
    signature_dishes: identitySignalsJson.signature_dishes || [],
    key_producers: identitySignalsJson.key_producers || [],
    language_signals: identitySignalsJson.language_signals || [],
    origin_story_type: identitySignalsJson.origin_story_type || null,
    
    // Confidence metadata
    extraction_confidence: identitySignalsJson.extraction_confidence || 0,
    confidence_tier: identitySignalsJson.confidence_tier || 'hold',
    input_quality: identitySignalsJson.input_quality?.overallQuality || 'none',
  };
  
  // Extract place context
  const context: PlaceContext = {
    name: record.name,
    neighborhood: record.neighborhood,
    street: record.address_street,
    outdoor_seating: null, // Not in derived_signals yet; could be added from googlePlacesAttributes
    popularity_tier: derivePopularityTier(record),
    curator_note: null, // Could be added if available
  };
  
  return { signals, context };
}

/**
 * Build complete tagline generation input from golden record
 */
export function buildTaglineInputFromGoldenRecord(
  record: any,
  mapNeighborhood?: string
): TaglineGenerationInputV2 {
  const { signals, context } = extractSignalsFromGoldenRecord(record);
  
  return {
    signals,
    context,
    mapNeighborhood,
  };
}

/**
 * Fetch entities ready for tagline generation (Fields v2 path).
 * Criteria: Has a derived_signal row with signal_key='identity_signals'.
 *
 * Returns records shaped to match the interface expected by extractSignalsFromGoldenRecord,
 * so callers need no change. Flat signal fields (cuisine_posture etc.) are read from
 * signal_value JSON where they are embedded alongside extended signals.
 *
 * NOTE: The county filter (previously 'Los Angeles') is dropped here because
 * entities does not have a county column. Scope filtering should happen via
 * entity.id or entity.neighborhood at the call site if needed.
 */
export async function fetchRecordsForTaglineGeneration(options: {
  limit?: number;
  reprocess?: boolean;
  placeId?: string;
  county?: string;
}): Promise<any[]> {
  const derivedWhere: Record<string, unknown> = {
    signal_key: 'identity_signals',
  };
  if (options.placeId) {
    derivedWhere.entity_id = options.placeId;
  }

  // Query derived_signals joined to entities — one row per entity, latest signal
  const derivedRows = await prisma.derived_signals.findMany({
    where: derivedWhere as Parameters<typeof prisma.derived_signals.findMany>[0]['where'],
    orderBy: [{ entity_id: 'asc' }, { computed_at: 'desc' }],
    distinct: ['entity_id'],
    take: options.limit,
    select: {
      entity_id: true,
      signal_value: true,
      computed_at: true,
      entity: {
        select: {
          id: true,
          name: true,
          neighborhood: true,
          address: true,
          tagline: true,
        },
      },
    },
  });

  // Shape into golden_records-compatible records for downstream compatibility
  return derivedRows
    .filter((d) => options.reprocess || !d.entity.tagline)
    .map((d) => {
      const sv = d.signal_value as Record<string, unknown> | null;
      return {
        // canonical_id compatibility shim
        canonical_id: d.entity_id,
        name: d.entity.name,
        neighborhood: d.entity.neighborhood ?? null,
        address_street: d.entity.address ?? null,
        // Flat signal fields: embedded in signal_value JSON by extract-identity-signals.ts.
        cuisine_posture: (sv?.cuisine_posture as string | null) ?? null,
        service_model: (sv?.service_model as string | null) ?? null,
        price_tier: (sv?.price_tier as string | null) ?? null,
        wine_program_intent: (sv?.wine_program_intent as string | null) ?? null,
        place_personality: (sv?.place_personality as string | null) ?? null,
        // identity_signals JSON (contains language_signals, signature_dishes, etc.)
        identity_signals: sv ?? null,
        signals_generated_at: d.computed_at,
        // source_count and data_completeness are not on derived_signals; use safe defaults
        source_count: 1,
        data_completeness: null,
      };
    });
}

// ============================================
// UTILITIES
// ============================================

/**
 * Derive popularity tier from golden record metadata
 */
function derivePopularityTier(record: any): 'institution' | 'known' | 'discovery' | null {
  // Use place_personality if it's 'institution'
  if (record.place_personality === 'institution') {
    return 'institution';
  }
  
  // Use source_count as a proxy
  const sourceCount = record.source_count || 1;
  
  if (sourceCount >= 3) return 'known';
  if (sourceCount >= 2) return 'discovery';
  
  return 'discovery';
}

/**
 * Check if record has sufficient signals for tagline generation
 */
export function hasMinimumSignals(signals: IdentitySignals): boolean {
  // Must have at least one of: place_personality, cuisine_posture, or language_signals
  return (
    signals.place_personality !== null ||
    signals.cuisine_posture !== null ||
    signals.language_signals.length > 0
  );
}

/**
 * Assess signal quality for tagline generation
 */
export function assessSignalQuality(signals: IdentitySignals): {
  quality: 'excellent' | 'good' | 'minimal' | 'insufficient';
  reason: string;
} {
  // Count filled signals
  const coreSignals = [
    signals.place_personality,
    signals.cuisine_posture,
    signals.service_model,
    signals.wine_program_intent,
  ].filter(s => s !== null).length;
  
  const hasSignatureDishes = signals.signature_dishes.length > 0 && signals.confidence_tier === 'publish';
  const hasLanguageSignals = signals.language_signals.length > 0;
  
  if (coreSignals >= 3 && (hasSignatureDishes || hasLanguageSignals)) {
    return { quality: 'excellent', reason: 'Rich signal set with specific details' };
  }
  
  if (coreSignals >= 2) {
    return { quality: 'good', reason: 'Sufficient signals for pattern generation' };
  }
  
  if (coreSignals >= 1 || hasLanguageSignals) {
    return { quality: 'minimal', reason: 'Limited signals, will use fallback patterns' };
  }
  
  return { quality: 'insufficient', reason: 'Not enough signals for confident tagline' };
}
