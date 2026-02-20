/**
 * Vibe tag display priority for place page and search cards.
 * Lower number = higher priority.
 * Store all tags, display max 5 on place page and max 3 on search cards.
 */

// Tier 1: Occasion (highest priority)
// Tier 2: Atmosphere
// Tier 3: Timing (lowest priority)

export const VIBE_TAG_PRIORITY: Record<string, number> = {
  // Occasion
  'Date Night': 1,
  'Solo-Friendly': 1,
  'Group Dinner': 1,
  'Business Meal': 1,

  // Atmosphere
  Cozy: 2,
  Airy: 2,
  Moody: 2,
  'Sun-Drenched': 2,
  Lively: 2,
  'Low-key': 2,
  'Standing room': 2,
  'Surf crowd': 2,

  // Timing
  Morning: 3,
  Brunch: 3,
  'Long Lunch': 3,
  'After Work': 3,
  'Late Night': 3,
  '24 Hours': 3,
};

const DEFAULT_PRIORITY = 999;

/**
 * Sort vibe tags by display priority (occasion > atmosphere > timing).
 * Returns new array, does not mutate input.
 */
export function sortVibeTagsByPriority(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const priorityA = VIBE_TAG_PRIORITY[a] ?? DEFAULT_PRIORITY;
    const priorityB = VIBE_TAG_PRIORITY[b] ?? DEFAULT_PRIORITY;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.localeCompare(b);
  });
}

/** Max tags to show on place page. */
export const PLACE_PAGE_TAG_LIMIT = 5;

/** Max tags to show on search/collection cards. */
export const CARD_TAG_LIMIT = 3;
