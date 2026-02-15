/**
 * Search Intent Mapping
 * 
 * Maps generic user intents to canonical search buckets.
 * This is NOT algorithmic - it's a deterministic lookup table.
 * 
 * Used to prevent dead-ends when users search for "dinner" or "drinks"
 * instead of specific cuisines or place names.
 */

export const INTENT_MAP: Record<string, { category?: string; description: string }> = {
  // Meal times
  dinner: {
    category: 'eat',
    description: 'Dinner spots'
  },
  lunch: {
    category: 'eat',
    description: 'Lunch spots'
  },
  breakfast: {
    category: 'eat',
    description: 'Breakfast spots'
  },
  brunch: {
    category: 'eat',
    description: 'Brunch spots'
  },
  
  // Beverage intents
  drinks: {
    category: 'drink',
    description: 'Drink spots'
  },
  cocktails: {
    category: 'drink',
    description: 'Cocktail bars'
  },
  wine: {
    category: 'drink',
    description: 'Wine bars'
  },
  beer: {
    category: 'drink',
    description: 'Beer bars'
  },
};

/**
 * Check if a query matches a known intent
 * Returns the category to filter by, or null if no match
 */
export function getIntentCategory(query: string): string | null {
  const normalized = query.toLowerCase().trim();
  return INTENT_MAP[normalized]?.category || null;
}

/**
 * Get intent description for UI display (optional)
 */
export function getIntentDescription(query: string): string | null {
  const normalized = query.toLowerCase().trim();
  return INTENT_MAP[normalized]?.description || null;
}
