/**
 * Canonical Cuisine List — v1
 *
 * SKAI-DOC-CUISINES-CANONICAL-V1
 *
 * The authoritative source for all cuisine taxonomy in Saiko.
 *
 * PRINCIPLES:
 *  1. Cuisine ≠ program. Cuisine is stable, slow-moving system structure.
 *  2. Cuisine is background. Programs (sushi, ramen, dumpling, taco) are foreground.
 *  3. ~25-40 primary cuisines max. Sub-cuisines only when structurally meaningful.
 *  4. Everything in the system maps to this list.
 *
 * RULES:
 *  - Primary cuisines are globally recognizable, stable culinary traditions
 *  - Sub-cuisines represent distinct regional/technical variations with different sourcing/technique
 *  - If it's primarily a program distinction, it goes in offering_programs, not here
 *  - Sub-cuisines are optional; primary cuisines are canonical
 */

// ---------------------------------------------------------------------------
// Primary Cuisines (v1)
// ---------------------------------------------------------------------------

export const PRIMARY_CUISINES_V1 = [
  // East Asia
  'Japanese',
  'Chinese',
  'Korean',
  'Vietnamese',
  'Thai',
  'Filipino',
  'Singaporean',
  'Malaysian',

  // South & Southeast Asia
  'Indian',
  'Pakistani',
  'Sri Lankan',
  'Bangladeshi',
  'Indonesian',

  // Middle East & Mediterranean
  'Lebanese',
  'Persian',
  'Turkish',
  'Israeli',
  'Egyptian',
  'Moroccan',
  'Greek',

  // Europe
  'Italian',
  'French',
  'Spanish',
  'Portuguese',
  'German',
  'British',
  'Scandinavian',
  'Polish',

  // Americas
  'Mexican',
  'Brazilian',
  'Argentinian',
  'Peruvian',
  'Caribbean',
  'American',
  'Southern (US)',

  // African
  'Ethiopian',
  'West African',

  // Catch-all / Fusion
  'Pan-Asian',
  'Mediterranean',
  'Contemporary',
] as const;

export type PrimaryCuisine = (typeof PRIMARY_CUISINES_V1)[number];

// ---------------------------------------------------------------------------
// Sub-Cuisines (Regional/Technical Variants)
// ---------------------------------------------------------------------------

export const SUB_CUISINES_V1: Record<PrimaryCuisine, string[]> = {
  // East Asia
  Japanese: ['Hokkaido', 'Kanto', 'Kansai', 'Okinawan'],
  Chinese: ['Sichuan', 'Cantonese', 'Hunanese', 'Jiangsu', 'Shanghainese', 'Northern'],
  Korean: ['Seoul-style', 'Busan-style', 'Jeolla-style'],
  Vietnamese: ['Northern', 'Central', 'Southern'],
  Thai: ['Central', 'Northern', 'Northeastern', 'Southern'],
  Filipino: [],
  Singaporean: [],
  Malaysian: [],

  // South & Southeast Asia
  Indian: ['North Indian', 'South Indian', 'Bengali', 'Punjabi', 'Gujarati', 'Coastal'],
  Pakistani: [],
  'Sri Lankan': [],
  Bangladeshi: [],
  Indonesian: ['Javanese', 'Balinese', 'Sundanese'],

  // Middle East & Mediterranean
  Lebanese: [],
  Persian: [],
  Turkish: [],
  Israeli: [],
  Egyptian: [],
  Moroccan: [],
  Greek: [],

  // Europe
  Italian: ['Northern', 'Central', 'Southern', 'Sicilian'],
  French: ['Parisian', 'Provençal', 'Alsatian', 'Lyonnais', 'Burgundy'],
  Spanish: ['Basque', 'Catalan', 'Andalusian'],
  Portuguese: [],
  German: [],
  British: [],
  Scandinavian: [],
  Polish: [],

  // Americas
  Mexican: ['Oaxacan', 'Yucatecan', 'Veracruzano', 'Northern', 'Mexico City'],
  Brazilian: ['Bahian', 'Paulista'],
  Argentinian: [],
  Peruvian: ['Coastal', 'Andean', 'Amazonian'],
  Caribbean: [],
  American: ['New York', 'Southern', 'Midwest', 'Texas'],
  'Southern (US)': [],

  // African
  Ethiopian: [],
  'West African': [],

  // Fusion / Other
  'Pan-Asian': [],
  Mediterranean: [],
  Contemporary: [],
};

// ---------------------------------------------------------------------------
// Lookup & Validation
// ---------------------------------------------------------------------------

/**
 * Check if a cuisine string is valid (primary or recognized sub-cuisine).
 * Case-insensitive.
 */
export function isValidCuisine(cuisine: string | null): cuisine is PrimaryCuisine {
  if (!cuisine) return false;
  return PRIMARY_CUISINES_V1.includes(cuisine as PrimaryCuisine);
}

/**
 * Normalize a cuisine string to canonical primary cuisine.
 * Returns null if no match found.
 *
 * Examples:
 *   "japanese" → "Japanese"
 *   "sushi" → null (it's a program, not cuisine)
 *   "ramen" → null (it's a program, not cuisine)
 */
export function normalizeCuisine(input: string | null): PrimaryCuisine | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();

  // Exact match (case-insensitive)
  for (const cuisine of PRIMARY_CUISINES_V1) {
    if (cuisine.toLowerCase() === trimmed) return cuisine as PrimaryCuisine;
  }

  // Common aliases
  const aliases: Record<string, PrimaryCuisine> = {
    'sushi': null,
    'ramen': null,
    'dumpling': null,
    'taco': null,
    'dim sum': null, // program, not cuisine
    'japanese food': 'Japanese',
    'chinese food': 'Chinese',
    'asian fusion': 'Pan-Asian',
    'american food': 'American',
    'southern food': 'Southern (US)',
  };

  return aliases[trimmed] ?? null;
}

/**
 * Get all sub-cuisines for a primary cuisine.
 */
export function getSubCuisines(primary: PrimaryCuisine): string[] {
  return SUB_CUISINES_V1[primary] ?? [];
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export const CUISINES_V1_STATS = {
  primary_count: PRIMARY_CUISINES_V1.length,
  total_sub_count: Object.values(SUB_CUISINES_V1).reduce((sum, subs) => sum + subs.length, 0),
  max_subs_in_cuisine: Math.max(...Object.values(SUB_CUISINES_V1).map((subs) => subs.length)),
  cuisines_with_subs: Object.entries(SUB_CUISINES_V1)
    .filter(([, subs]) => subs.length > 0)
    .map(([cuisine]) => cuisine).length,
};
