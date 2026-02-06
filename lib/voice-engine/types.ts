/**
 * Saiko Voice Engine v1.1 - Type Definitions
 * Merchant signals, derived attributes, and tagline generation types
 */

// ============================================
// MERCHANT SIGNALS (from Google Places API)
// ============================================

export interface MerchantSignals {
  name: string;
  category: string;              // primaryType from Google Places
  neighborhood: string;
  street: string;                // parsed from formattedAddress
  priceLevel: PriceLevel;
  outdoorSeating: boolean;
  servesBeer: boolean;
  servesWine: boolean;
  servesCocktails: boolean;
  servesBreakfast: boolean;
  servesBrunch: boolean;
  liveMusic: boolean;
  serviceStyle: string[];        // dine_in, takeout, delivery
  userRatingCount: number;
}

export type PriceLevel = 'INEXPENSIVE' | 'MODERATE' | 'EXPENSIVE' | 'VERY_EXPENSIVE' | 'UNKNOWN';

// ============================================
// DERIVED ATTRIBUTES
// ============================================

export interface DerivedAttributes {
  popularityTier: PopularityTier;
  vibe: Vibe;
  timeOfDay: TimeOfDay;
}

export type PopularityTier = 'institution' | 'known' | 'discovery';
export type Vibe = 'hang' | 'occasion' | 'quick' | 'neighborhood';
export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'anytime';

// ============================================
// PHRASE PATTERNS
// ============================================

export type PhrasePattern = 'food' | 'neighborhood' | 'vibe' | 'authority';

// ============================================
// TAGLINE GENERATION
// ============================================

export interface TaglineGenerationInput {
  signals: MerchantSignals;
  derived: DerivedAttributes;
  mapNeighborhood?: string;      // If map title already contains neighborhood, use street instead
}

export interface TaglineGenerationResult {
  candidates: [string, string, string, string]; // Exactly 4 candidates
  selected: string;
  selectedIndex: number;
  selectedPattern: PhrasePattern;
  signals: MerchantSignals;      // Snapshot for storage
}

// ============================================
// AD UNIT TYPES
// ============================================

export type AdUnitType = 'A' | 'B' | 'D' | 'E';

export interface AdUnitAssignment {
  adUnitType: AdUnitType;
  reason: string;
}

// ============================================
// VOCABULARY SYSTEM
// ============================================

export interface VocabularyPools {
  praise: string[];
  place: string[];
  action: string[];
  deadpanClosers: string[];
  banned: string[];
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  bannedWords?: string[];
}
