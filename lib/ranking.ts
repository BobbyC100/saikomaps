/**
 * Ranking utilities for non-algorithmic editorial scoring
 */

/**
 * Apply diversity filter to prevent too many consecutive places of the same cuisine type
 * 
 * This is an anti-repetition rule, not an algorithm. It ensures variety in discovery
 * without changing the underlying ranking scores.
 * 
 * Uses cuisinePrimary (Saiko-curated taxonomy) with fallback to cuisineType (legacy).
 * 
 * @param places - Array of places with cuisinePrimary and/or cuisineType
 * @param maxConsecutive - Maximum number of consecutive places with same cuisine (default: 3)
 * @returns Filtered array with diversity applied
 */
export function applyDiversityFilter<T extends { cuisinePrimary?: string | null; cuisineType?: string | null }>(
  places: T[],
  maxConsecutive: number = 3
): T[] {
  const result: T[] = [];
  const recentCuisines: (string | null | undefined)[] = [];
  const deferred: T[] = []; // Places to add at the end

  for (const place of places) {
    // EOS: Prefer curated cuisinePrimary, fallback to legacy cuisineType
    const cuisine = place.cuisinePrimary || place.cuisineType;
    
    // Count how many of this cuisine type in recent window
    const consecutiveCount = recentCuisines.filter(c => c === cuisine).length;
    
    if (consecutiveCount >= maxConsecutive) {
      // Defer this place (add to end to not lose it)
      deferred.push(place);
      continue;
    }

    result.push(place);
    recentCuisines.push(cuisine);
    
    // Keep only last `maxConsecutive` items in window
    if (recentCuisines.length > maxConsecutive) {
      recentCuisines.shift();
    }
  }

  // Add deferred places at the end (maintains their relative order)
  return [...result, ...deferred];
}

/**
 * Get inclusion status for a place
 * 
 * Checks if a place meets the minimum criteria to appear in discovery:
 * - Has ≥2 verified editorial sources, OR
 * - Has ≥1 chef recommendation, OR
 * - Has ≥1 Jonathan Gold mention
 */
export function meetsInclusionRules(place: {
  coverageCount: number;
  hasChefRec: boolean;
  hasGoldMention: boolean;
}): boolean {
  return (
    place.coverageCount >= 2 ||
    place.hasChefRec ||
    place.hasGoldMention
  );
}

/**
 * Calculate ranking score for a place
 * 
 * Formula:
 * - Coverage count × 2 (broad editorial consensus)
 * - Chef rec × 3 (high-signal authority)
 * - Gold mention × 2 (legacy authority bonus)
 */
export function calculateRankingScore(place: {
  coverageCount: number;
  hasChefRec: boolean;
  hasGoldMention: boolean;
}): number {
  const coverageScore = place.coverageCount * 2;
  const chefRecScore = place.hasChefRec ? 3 : 0;
  const goldScore = place.hasGoldMention ? 2 : 0;
  
  return coverageScore + chefRecScore + goldScore;
}
