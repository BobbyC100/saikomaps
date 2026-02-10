/**
 * Saiko Voice Engine v2.0 - Signal Extraction
 * Extract identity signals from golden_records for tagline generation
 */

import { PrismaClient } from '@prisma/client';
import { IdentitySignals, PlaceContext, TaglineGenerationInputV2 } from './types';

const prisma = new PrismaClient();

// ============================================
// SIGNAL EXTRACTION FROM GOLDEN RECORDS
// ============================================

/**
 * Extract identity signals and context from a golden record
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
    vibe_words: identitySignalsJson.vibe_words || [],
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
    outdoor_seating: null, // Not in golden_records, could be added from Google Places if needed
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
 * Fetch golden records ready for tagline generation
 * Criteria: Has identity signals, no tagline yet (or reprocessing)
 */
export async function fetchRecordsForTaglineGeneration(options: {
  limit?: number;
  reprocess?: boolean;
  placeId?: string;
  county?: string;
}): Promise<any[]> {
  const whereClause: any = {
    county: options.county || 'Los Angeles',
    signals_generated_at: { not: null }, // Must have identity signals
  };
  
  // Skip places that already have taglines unless reprocessing
  if (!options.reprocess) {
    // Check if tagline field exists (it's in the old 'places' table, not golden_records)
    // For now, we'll always generate since golden_records doesn't have tagline field
  }
  
  // Filter to specific place if requested
  if (options.placeId) {
    whereClause.canonical_id = options.placeId;
  }
  
  const records = await prisma.golden_records.findMany({
    where: whereClause,
    select: {
      canonical_id: true,
      name: true,
      neighborhood: true,
      address_street: true,
      cuisine_posture: true,
      service_model: true,
      price_tier: true,
      wine_program_intent: true,
      place_personality: true,
      identity_signals: true,
      signals_generated_at: true,
      source_count: true,
      data_completeness: true,
    },
    orderBy: { name: 'asc' },
    take: options.limit,
  });
  
  return records;
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
  // Must have at least one of: place_personality, cuisine_posture, or vibe_words
  return (
    signals.place_personality !== null ||
    signals.cuisine_posture !== null ||
    signals.vibe_words.length > 0
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
  const hasVibeWords = signals.vibe_words.length > 0;
  
  if (coreSignals >= 3 && (hasSignatureDishes || hasVibeWords)) {
    return { quality: 'excellent', reason: 'Rich signal set with specific details' };
  }
  
  if (coreSignals >= 2) {
    return { quality: 'good', reason: 'Sufficient signals for pattern generation' };
  }
  
  if (coreSignals >= 1 || hasVibeWords) {
    return { quality: 'minimal', reason: 'Limited signals, will use fallback patterns' };
  }
  
  return { quality: 'insufficient', reason: 'Not enough signals for confident tagline' };
}
