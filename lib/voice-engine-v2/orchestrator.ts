/**
 * Saiko Voice Engine v2.0 - Orchestrator
 * End-to-end pipeline for tagline generation using identity signals
 */

import {
  TaglineGenerationInputV2,
  TaglineGenerationResultV2,
  getPatternWeights,
} from './types';
import { generateTaglineCandidatesWithRetryV2, getFallbackTaglines } from './generator';
import { selectBestTaglineV2 } from './selector';
import { assignAdUnitType } from '../voice-engine/ad-units';

const VOICE_ENGINE_VERSION = 2;

// ============================================
// CORE PIPELINE
// ============================================

/**
 * Full tagline generation pipeline (v2.0)
 * 1. Generate 4 candidates using identity signals
 * 2. Validate against banned words (with retry)
 * 3. Select best candidate using pattern weights
 * 4. Return complete result
 */
export async function generateTaglineV2(
  input: TaglineGenerationInputV2
): Promise<TaglineGenerationResultV2> {
  // Step 1 & 2: Generate candidates with validation + retry
  const generationResult = await generateTaglineCandidatesWithRetryV2(input);
  
  // Log if still invalid after retry
  if (!generationResult.allValid) {
    console.warn(
      '[Voice Engine v2.0] Tagline candidates contain banned words after retry:',
      generationResult.validationResults
        .map((r, i) => (!r.valid ? `Candidate ${i}: ${r.bannedWords?.join(', ')}` : null))
        .filter(Boolean)
    );
  }
  
  // Calculate pattern weights based on identity signals
  const patternWeights = getPatternWeights(input.signals);
  
  // Step 3: Select best candidate
  const selectionResult = await selectBestTaglineV2(
    input.context,
    generationResult.candidates,
    patternWeights
  );
  
  return {
    candidates: generationResult.candidates,
    selected: selectionResult.selectedTagline,
    selectedIndex: selectionResult.selectedIndex,
    selectedPattern: selectionResult.selectedPattern,
    signalsSnapshot: input.signals,
    version: VOICE_ENGINE_VERSION,
  };
}

/**
 * Generate tagline with fallback on failure
 * Uses fallback tagline if generation fails
 */
export async function generateTaglineWithFallbackV2(
  input: TaglineGenerationInputV2
): Promise<TaglineGenerationResultV2> {
  try {
    return await generateTaglineV2(input);
  } catch (err) {
    console.error('[Voice Engine v2.0] Tagline generation failed:', err);
    
    // Fallback tagline
    const fallbackCandidates = getFallbackTaglines();
    
    return {
      candidates: fallbackCandidates,
      selected: fallbackCandidates[0],
      selectedIndex: 0,
      selectedPattern: 'authority',
      signalsSnapshot: input.signals,
      version: VOICE_ENGINE_VERSION,
    };
  }
}

// ============================================
// PLACE ENRICHMENT
// ============================================

/**
 * Complete place enrichment: tagline + ad unit
 * Returns all Voice Engine v2.0 data for a place
 */
export async function enrichPlaceV2(input: TaglineGenerationInputV2): Promise<{
  tagline: string;
  taglineCandidates: string[];
  taglinePattern: string;
  taglineSignals: any;
  taglineVersion: number;
  adUnitType: string;
}> {
  // Generate tagline
  const taglineResult = await generateTaglineWithFallbackV2(input);
  
  // Assign ad unit (use category if available, fallback to 'E')
  const category = deriveCategory(input.signals.cuisine_posture, input.signals.service_model);
  const adUnitAssignment = assignAdUnitType(category);
  
  return {
    tagline: taglineResult.selected,
    taglineCandidates: taglineResult.candidates,
    taglinePattern: taglineResult.selectedPattern,
    taglineSignals: taglineResult.signalsSnapshot,
    taglineVersion: VOICE_ENGINE_VERSION,
    adUnitType: adUnitAssignment.adUnitType,
  };
}

/**
 * Batch process multiple places
 * Parallelizes with concurrency limit
 */
export async function batchEnrichPlacesV2(
  inputs: TaglineGenerationInputV2[],
  concurrency = 10
): Promise<
  Array<{
    input: TaglineGenerationInputV2;
    result: Awaited<ReturnType<typeof enrichPlaceV2>>;
  }>
> {
  const results: Array<{
    input: TaglineGenerationInputV2;
    result: Awaited<ReturnType<typeof enrichPlaceV2>>;
  }> = [];
  
  // Process in batches
  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency);
    
    console.log(
      `[Voice Engine v2.0] Processing batch ${i / concurrency + 1}/${Math.ceil(
        inputs.length / concurrency
      )} (${batch.length} places)`
    );
    
    const batchResults = await Promise.all(
      batch.map(async (input) => ({
        input,
        result: await enrichPlaceV2(input),
      }))
    );
    
    results.push(...batchResults);
  }
  
  return results;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Derive a pseudo-category from identity signals
 * Used for ad unit assignment
 */
function deriveCategory(
  cuisinePosture: string | null,
  serviceModel: string | null
): string {
  // Map signals to Google Places-like categories for ad unit assignment
  if (serviceModel === 'tasting-menu') return 'fine_dining_restaurant';
  if (serviceModel === 'counter') return 'fast_food_restaurant';
  if (cuisinePosture === 'seafood-focused') return 'seafood_restaurant';
  if (cuisinePosture === 'protein-centric') return 'steak_house';
  
  // Default to generic restaurant
  return 'restaurant';
}
