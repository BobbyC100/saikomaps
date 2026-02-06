/**
 * Saiko Voice Engine v1.1 - Orchestrator
 * End-to-end pipeline for tagline generation
 */

import { TaglineGenerationResult, TaglineGenerationInput } from './types';
import { generateTaglineCandidatesWithRetry } from './generator';
import { selectBestTagline } from './selector';
import { assignAdUnitType } from './ad-units';

/**
 * Full tagline generation pipeline
 * 1. Generate 4 candidates
 * 2. Validate against banned words (with retry)
 * 3. Select best candidate
 * 4. Return complete result
 */
export async function generateTagline(
  input: TaglineGenerationInput
): Promise<TaglineGenerationResult> {
  // Step 1 & 2: Generate candidates with validation + retry
  const generationResult = await generateTaglineCandidatesWithRetry(input);
  
  // Log if still invalid after retry
  if (!generationResult.allValid) {
    console.warn(
      '[Voice Engine] Tagline candidates contain banned words after retry:',
      generationResult.validationResults
        .map((r, i) => (!r.valid ? `Candidate ${i}: ${r.bannedWords?.join(', ')}` : null))
        .filter(Boolean)
    );
  }
  
  // Step 3: Select best candidate
  const selectionResult = await selectBestTagline(
    input.signals,
    generationResult.candidates
  );
  
  return {
    candidates: generationResult.candidates,
    selected: selectionResult.selectedTagline,
    selectedIndex: selectionResult.selectedIndex,
    selectedPattern: selectionResult.selectedPattern,
    signals: input.signals, // Store snapshot
  };
}

/**
 * Generate tagline with fallback on failure
 * Uses fallback tagline if generation fails
 */
export async function generateTaglineWithFallback(
  input: TaglineGenerationInput
): Promise<TaglineGenerationResult> {
  try {
    return await generateTagline(input);
  } catch (err) {
    console.error('[Voice Engine] Tagline generation failed:', err);
    
    // Fallback tagline
    const fallback = 'A fine establishment. Saiko approved.';
    
    return {
      candidates: [fallback, fallback, fallback, fallback],
      selected: fallback,
      selectedIndex: 0,
      selectedPattern: 'authority',
      signals: input.signals,
    };
  }
}

/**
 * Complete place enrichment: tagline + ad unit
 * Returns all Voice Engine data for a place
 */
export async function enrichPlace(input: TaglineGenerationInput): Promise<{
  tagline: string;
  taglineCandidates: string[];
  taglinePattern: string;
  taglineSignals: any;
  adUnitType: string;
}> {
  // Generate tagline
  const taglineResult = await generateTaglineWithFallback(input);
  
  // Assign ad unit
  const adUnitAssignment = assignAdUnitType(input.signals.category);
  
  return {
    tagline: taglineResult.selected,
    taglineCandidates: taglineResult.candidates,
    taglinePattern: taglineResult.selectedPattern,
    taglineSignals: taglineResult.signals,
    adUnitType: adUnitAssignment.adUnitType,
  };
}

/**
 * Batch process multiple places
 * Parallelizes with concurrency limit
 */
export async function batchEnrichPlaces(
  inputs: TaglineGenerationInput[],
  concurrency = 10
): Promise<
  Array<{
    input: TaglineGenerationInput;
    result: Awaited<ReturnType<typeof enrichPlace>>;
  }>
> {
  const results: Array<{
    input: TaglineGenerationInput;
    result: Awaited<ReturnType<typeof enrichPlace>>;
  }> = [];
  
  // Process in batches
  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency);
    
    console.log(
      `[Voice Engine] Processing batch ${i / concurrency + 1}/${Math.ceil(
        inputs.length / concurrency
      )} (${batch.length} places)`
    );
    
    const batchResults = await Promise.all(
      batch.map(async (input) => ({
        input,
        result: await enrichPlace(input),
      }))
    );
    
    results.push(...batchResults);
  }
  
  return results;
}
