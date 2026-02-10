/**
 * Saiko Voice Engine v2.0 - Type Definitions
 * Identity signals from scraped content, not Google Places API
 */

// ============================================
// IDENTITY SIGNALS (from golden_records)
// ============================================

export interface IdentitySignals {
  // Core identity signals (flat fields in DB)
  cuisine_posture: 'produce-driven' | 'protein-centric' | 'carb-forward' | 'seafood-focused' | 'balanced' | null;
  service_model: 'tasting-menu' | 'a-la-carte' | 'small-plates' | 'family-style' | 'counter' | null;
  price_tier: '$' | '$$' | '$$$' | '$$$$' | null;
  wine_program_intent: 'natural' | 'classic' | 'eclectic' | 'minimal' | 'none' | null;
  place_personality: 'neighborhood-spot' | 'destination' | 'chef-driven' | 'scene' | 'hidden-gem' | 'institution' | null;
  
  // Extended signals (from identity_signals JSON field)
  signature_dishes: string[];
  key_producers: string[];
  vibe_words: string[];
  origin_story_type: 'chef-journey' | 'family-legacy' | 'neighborhood-love' | 'concept-first' | 'partnership' | null;
  
  // Confidence metadata
  extraction_confidence: number;
  confidence_tier: 'publish' | 'review' | 'hold';
  input_quality: 'good' | 'partial' | 'minimal' | 'none';
}

// ============================================
// PLACE CONTEXT (supplemental data)
// ============================================

export interface PlaceContext {
  name: string;
  neighborhood: string | null;
  street: string | null;                    // parsed from address_street
  outdoor_seating: boolean | null;          // If available from Google Places
  popularity_tier: 'institution' | 'known' | 'discovery' | null;
  curator_note: string | null;              // Optional editorial context
}

// ============================================
// TAGLINE GENERATION INPUT
// ============================================

export interface TaglineGenerationInputV2 {
  signals: IdentitySignals;
  context: PlaceContext;
  mapNeighborhood?: string;                 // If map title already contains neighborhood, use street instead
}

// ============================================
// TAGLINE GENERATION RESULT
// ============================================

export interface TaglineGenerationResultV2 {
  candidates: [string, string, string, string]; // Exactly 4 candidates (one per pattern)
  selected: string;
  selectedIndex: number;
  selectedPattern: PhrasePattern;
  signalsSnapshot: IdentitySignals;         // Snapshot for storage
  version: number;                          // Voice engine version (2)
}

// ============================================
// PHRASE PATTERNS
// ============================================

export type PhrasePattern = 'food' | 'neighborhood' | 'vibe' | 'authority';

// ============================================
// PATTERN SELECTION LOGIC
// ============================================

export interface PatternWeights {
  food: number;
  neighborhood: number;
  vibe: number;
  authority: number;
}

/**
 * Determine pattern weights based on identity signals
 * Higher weight = more likely pattern to win in auto-selection
 */
export function getPatternWeights(signals: IdentitySignals): PatternWeights {
  const personality = signals.place_personality;
  const hasDishes = signals.signature_dishes.length > 0 && signals.confidence_tier === 'publish';
  const hasVibe = signals.vibe_words.length > 0;
  
  // Default equal weights
  const weights: PatternWeights = { food: 1, neighborhood: 1, vibe: 1, authority: 1 };
  
  // Boost patterns based on personality
  if (personality === 'institution') {
    weights.authority = 3;
    weights.neighborhood = 2;
  } else if (personality === 'neighborhood-spot') {
    weights.neighborhood = 3;
    weights.vibe = 2;
  } else if (personality === 'chef-driven') {
    weights.food = 3;
  } else if (personality === 'scene') {
    weights.vibe = 3;
  } else if (personality === 'hidden-gem') {
    weights.authority = 3;
  } else if (personality === 'destination') {
    weights.food = 2;
    weights.neighborhood = 2;
  }
  
  // Boost food pattern if we have high-confidence dishes
  if (hasDishes) {
    weights.food += 2;
  }
  
  // Boost vibe pattern if we have vibe words
  if (hasVibe) {
    weights.vibe += 1;
  }
  
  return weights;
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  bannedWords?: string[];
}
