/**
 * Cuisine Taxonomy - Saiko Maps Editorial Classification
 * 
 * Single source of truth for cuisine classification.
 * This is human-authored, non-algorithmic, and deterministic.
 * 
 * Design Principles:
 * - Editorial > algorithmic
 * - Compact primary list (no Yelp bloat)
 * - Max 2 secondaries per place
 * - Descriptive, not exhaustive
 * 
 * Last Updated: 2026-02-14
 */

// ─────────────────────────────────────────────────────────────────────────
// PRIMARY CUISINES
// ─────────────────────────────────────────────────────────────────────────

export const CUISINE_PRIMARY = [
  // Asian
  'Sushi',
  'Ramen',
  'Japanese',
  'Korean',
  'Chinese',
  'Thai',
  'Vietnamese',
  'Indian',
  
  // European
  'Italian',
  'Pizza',
  'French',
  'Spanish',
  'Greek',
  'Mediterranean',
  
  // American & Latin
  'American',
  'Mexican',
  'Barbecue',
  'Latin American',
  'Caribbean',
  
  // Middle Eastern
  'Middle Eastern',
  'Lebanese',
  'Persian',
  
  // Beverage & Specialty
  'Coffee',
  'Bakery',
  'Wine Bar',
  'Cocktail Bar',
  'Brewery',
  
  // Other
  'Seafood',
  'Steakhouse',
  'Vegetarian',
  'Fusion',
] as const;

export type CuisinePrimary = typeof CUISINE_PRIMARY[number];

// ─────────────────────────────────────────────────────────────────────────
// SECONDARY CUISINES (by Primary)
// ─────────────────────────────────────────────────────────────────────────

export const CUISINE_SECONDARY_MAP: Record<CuisinePrimary, string[]> = {
  // Sushi (validated with real LA data)
  'Sushi': [
    'Omakase',
    'Edomae',
    'Hand Roll Bar',
    'Sushi Bar',
    'Takeout Sushi',
    'Chirashi',
    'Kaiseki-Adjacent',
    'Value',
    'Mid',
    'Splurge',
  ],
  
  // Ramen
  'Ramen': [
    'Tonkotsu',
    'Shoyu',
    'Miso',
    'Tsukemen',
    'Mazemen',
  ],
  
  // Japanese (non-sushi/ramen)
  'Japanese': [
    'Izakaya',
    'Yakitori',
    'Tempura',
    'Kaiseki',
    'Donburi',
    'Udon/Soba',
    'Okonomiyaki',
  ],
  
  // Korean
  'Korean': [
    'KBBQ',
    'Banchan-Forward',
    'Korean Fried Chicken',
    'Jjigae',
    'Bibimbap',
  ],
  
  // Chinese
  'Chinese': [
    'Cantonese',
    'Szechuan',
    'Hunan',
    'Dim Sum',
    'Hot Pot',
    'Hand-Pulled Noodles',
  ],
  
  // Thai
  'Thai': [
    'Northern Thai',
    'Southern Thai',
    'Isaan',
    'Street Food',
  ],
  
  // Vietnamese
  'Vietnamese': [
    'Pho',
    'Banh Mi',
    'Regional',
  ],
  
  // Indian
  'Indian': [
    'North Indian',
    'South Indian',
    'Street Food',
    'Dosa',
  ],
  
  // Italian
  'Italian': [
    'Neapolitan',
    'Roman',
    'Sicilian',
    'Pasta-Focused',
    'Wine-Driven',
  ],
  
  // Pizza
  'Pizza': [
    'Neapolitan',
    'New York Style',
    'Detroit Style',
    'Roman',
    'Sourdough',
    'By-the-Slice',
  ],
  
  // Mexican
  'Mexican': [
    'Taco Stand',
    'Regional',
    'Oaxacan',
    'Baja',
    'Street Food',
    'Fine Dining',
  ],
  
  // Barbecue
  'Barbecue': [
    'Texas Style',
    'Kansas City',
    'Carolina',
    'Korean BBQ',
    'Smoked Meats',
  ],
  
  // American
  'American': [
    'New American',
    'Southern',
    'Diner',
    'Comfort Food',
    'Farm-to-Table',
  ],
  
  // French
  'French': [
    'Bistro',
    'Brasserie',
    'Fine Dining',
    'Pastry',
  ],
  
  // Mediterranean
  'Mediterranean': [
    'Greek',
    'Turkish',
    'Levantine',
    'Mezze-Focused',
  ],
  
  // Middle Eastern
  'Middle Eastern': [
    'Levantine',
    'Persian',
    'Israeli',
    'Kebab',
  ],
  
  // Coffee
  'Coffee': [
    'Third Wave',
    'Espresso Bar',
    'Pastry Program',
  ],
  
  // Bakery
  'Bakery': [
    'Sourdough',
    'Pastry',
    'French',
    'Jewish',
  ],
  
  // Wine Bar
  'Wine Bar': [
    'Natural Wine',
    'Old World Focus',
    'New World Focus',
    'Small Plates',
  ],
  
  // Cocktail Bar
  'Cocktail Bar': [
    'Classic Cocktails',
    'Tiki',
    'Agave-Focused',
    'Low-ABV',
  ],
  
  // Brewery (FINAL - validated)
  'Brewery': [
    'Sours / Saison Focus',
    'IPA Focus',
    'Food Program',
  ],
  
  // Other primaries (no common secondaries yet)
  'Spanish': [],
  'Greek': [],
  'Latin American': [],
  'Caribbean': [],
  'Lebanese': [],
  'Persian': [],
  'Seafood': [],
  'Steakhouse': [],
  'Vegetarian': [],
  'Fusion': [],
};

// ─────────────────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Validate a primary cuisine
 */
export function isValidPrimary(cuisine: string): cuisine is CuisinePrimary {
  return CUISINE_PRIMARY.includes(cuisine as CuisinePrimary);
}

/**
 * Validate secondary cuisines for a given primary
 * Rules:
 * - Max 2 secondaries
 * - Must be from allowed list for that primary
 */
export function validateSecondaries(
  primary: CuisinePrimary,
  secondaries: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (secondaries.length > 2) {
    errors.push(`Max 2 secondaries allowed, got ${secondaries.length}`);
  }
  
  const allowedSecondaries = CUISINE_SECONDARY_MAP[primary];
  const invalidSecondaries = secondaries.filter(s => !allowedSecondaries.includes(s));
  
  if (invalidSecondaries.length > 0) {
    errors.push(`Invalid secondaries for ${primary}: ${invalidSecondaries.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get allowed secondaries for a primary cuisine
 */
export function getAllowedSecondaries(primary: CuisinePrimary): string[] {
  return CUISINE_SECONDARY_MAP[primary];
}

// ─────────────────────────────────────────────────────────────────────────
// INFERENCE RULES (for backfill)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Name-based inference patterns
 * These are deterministic rules, not ML
 * Used for backfilling cuisinePrimary from place names
 */
export const NAME_INFERENCE_RULES: Array<{
  pattern: RegExp;
  primary: CuisinePrimary;
  confidence: 'high' | 'medium' | 'low';
}> = [
  // High confidence - very specific
  { pattern: /sushi/i, primary: 'Sushi', confidence: 'high' },
  { pattern: /ramen/i, primary: 'Ramen', confidence: 'high' },
  { pattern: /pizza/i, primary: 'Pizza', confidence: 'high' },
  { pattern: /pho\b/i, primary: 'Vietnamese', confidence: 'high' },
  { pattern: /banh mi/i, primary: 'Vietnamese', confidence: 'high' },
  { pattern: /taco|tacos/i, primary: 'Mexican', confidence: 'high' },
  { pattern: /taqueria/i, primary: 'Mexican', confidence: 'high' },
  { pattern: /tortilleria/i, primary: 'Mexican', confidence: 'high' },
  { pattern: /bbq|barbecue/i, primary: 'Barbecue', confidence: 'high' },
  { pattern: /burger|burgers/i, primary: 'American', confidence: 'high' },
  { pattern: /bakery|boulangerie/i, primary: 'Bakery', confidence: 'high' },
  { pattern: /brewery|brewing/i, primary: 'Brewery', confidence: 'high' },
  { pattern: /wine bar|wine shop/i, primary: 'Wine Bar', confidence: 'high' },
  { pattern: /cocktail|bar & grill/i, primary: 'Cocktail Bar', confidence: 'medium' },
  
  // Medium confidence - need context
  { pattern: /japanese|izakaya|yakitori/i, primary: 'Japanese', confidence: 'medium' },
  { pattern: /korean|kbbq/i, primary: 'Korean', confidence: 'medium' },
  { pattern: /thai/i, primary: 'Thai', confidence: 'medium' },
  { pattern: /chinese|szechuan|cantonese/i, primary: 'Chinese', confidence: 'medium' },
  { pattern: /vietnamese/i, primary: 'Vietnamese', confidence: 'medium' },
  { pattern: /italian|trattoria|osteria/i, primary: 'Italian', confidence: 'medium' },
  { pattern: /mexican/i, primary: 'Mexican', confidence: 'medium' },
  { pattern: /french|bistro|brasserie/i, primary: 'French', confidence: 'medium' },
  { pattern: /mediterranean/i, primary: 'Mediterranean', confidence: 'medium' },
  { pattern: /indian/i, primary: 'Indian', confidence: 'medium' },
  { pattern: /seafood|oyster/i, primary: 'Seafood', confidence: 'medium' },
  { pattern: /steakhouse|steak house/i, primary: 'Steakhouse', confidence: 'medium' },
  { pattern: /cafe|coffee/i, primary: 'Coffee', confidence: 'medium' },
];

/**
 * Category-based inference
 * Maps existing category field to primary cuisine
 */
export function inferFromCategory(category: string | null): CuisinePrimary | null {
  if (!category) return null;
  
  const lower = category.toLowerCase();
  
  // Don't infer from format categories
  if (lower === 'eat' || lower === 'drinks' || lower === 'shop') {
    return null;
  }
  
  // Direct mappings
  if (lower.includes('japanese')) return 'Japanese';
  if (lower.includes('sushi')) return 'Sushi';
  if (lower.includes('italian')) return 'Italian';
  if (lower.includes('mexican')) return 'Mexican';
  if (lower.includes('chinese')) return 'Chinese';
  if (lower.includes('thai')) return 'Thai';
  if (lower.includes('korean')) return 'Korean';
  if (lower.includes('vietnamese')) return 'Vietnamese';
  if (lower.includes('french')) return 'French';
  if (lower.includes('indian')) return 'Indian';
  
  return null;
}

/**
 * Infer primary cuisine from place data
 * Uses name patterns and category (deterministic, no ML)
 */
export function inferPrimary(place: {
  name: string;
  category?: string | null;
  cuisineType?: string | null;
}): CuisinePrimary | null {
  // Try name-based inference first (most reliable)
  for (const rule of NAME_INFERENCE_RULES) {
    if (rule.pattern.test(place.name)) {
      return rule.primary;
    }
  }
  
  // Try category-based inference
  const categoryInferred = inferFromCategory(place.category);
  if (categoryInferred) return categoryInferred;
  
  // Try existing cuisineType (if not a format category)
  if (place.cuisineType) {
    const lower = place.cuisineType.toLowerCase();
    
    // Skip format categories
    if (lower === 'bar' || lower === 'café' || lower === 'cafe' || lower === 'bakery') {
      // These are valid primaries, return them
      if (lower === 'bakery') return 'Bakery';
      if (lower === 'café' || lower === 'cafe') return 'Coffee';
      // 'bar' is too ambiguous, skip
      return null;
    }
    
    // Try direct match with primary list
    const match = CUISINE_PRIMARY.find(p => 
      p.toLowerCase() === lower || 
      lower.includes(p.toLowerCase())
    );
    if (match) return match;
  }
  
  return null;
}
