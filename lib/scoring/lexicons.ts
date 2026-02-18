/**
 * Energy + Formality scoring — lexicons and weights (tunable; dimensions locked).
 * See docs/ENERGY_SCORE_SPEC.md and docs/FORMALITY_SCORE_SPEC.md.
 */

// =============================================================================
// ENERGY LEXICONS
// =============================================================================

export const ENERGY_HIGH_TERMS: string[] = [
  'bustling', 'packed', 'loud', 'buzzing', 'electric', 'lively', 'raucous',
  'scene', 'party', 'roaring', 'pumping', 'chaotic', 'wild',
];

export const ENERGY_LOW_TERMS: string[] = [
  'quiet', 'calm', 'intimate', 'hushed', 'peaceful', 'low-key', 'relaxed',
  'serene', 'gentle', 'whisper', 'subdued', 'mellow',
];

export const ENERGY_COMPRESSION_TERMS: string[] = [
  'tiny dining room', 'tight space', 'bar packed', 'hard to get in',
  'shoulder to shoulder', 'no empty seats', 'standing room',
  'tiny', 'tight', 'packed', 'cramped', 'small room', 'booked out',
];

/** Sensory: sound (DJ/live music specificity vs quiet) */
export const ENERGY_SENSORY_SOUND_HIGH: string[] = [
  'dj', 'live band', 'live music', 'dj night', 'dj nights', 'acoustic', 'band',
];
export const ENERGY_SENSORY_SOUND_LOW: string[] = [
  'no music', 'ambient playlist', 'quiet background', 'silent',
];

/** Sensory: sight (neon/bright vs dim) */
export const ENERGY_SENSORY_SIGHT_HIGH: string[] = [
  'neon', 'vibrant', 'bright', 'warm lighting', 'lit',
];
export const ENERGY_SENSORY_SIGHT_LOW: string[] = [
  'dim', 'dark', 'candlelit', 'muted', 'moody',
];

/** Sensory: smell (open kitchen, fire, etc.) */
export const ENERGY_SENSORY_SMELL: string[] = [
  'open kitchen', 'wood-fire', 'wood fire', 'charcoal', 'live cooking',
  'bakery', 'coffee roaster', 'roaster', 'smoker', 'grill',
];

export const ENERGY_SENSORY_TERMS = {
  sound: { high: ENERGY_SENSORY_SOUND_HIGH, low: ENERGY_SENSORY_SOUND_LOW },
  sight: { high: ENERGY_SENSORY_SIGHT_HIGH, low: ENERGY_SENSORY_SIGHT_LOW },
  smell: ENERGY_SENSORY_SMELL,
};

// =============================================================================
// FORMALITY LEXICONS
// =============================================================================

export const FORMALITY_HIGH_TERMS: string[] = [
  'refined', 'elegant', 'polished', 'upscale', 'white-tablecloth', 'white tablecloth',
  'jacket', 'formal', 'ceremony', 'pairings', 'sommelier-led', 'choreographed',
];

export const FORMALITY_LOW_TERMS: string[] = [
  'casual', 'laid-back', 'no-fuss', 'come-as-you-are', 'counter-service',
  'shorts welcome', 'beachy',
];

export const FORMALITY_RESERVATION_TERMS: string[] = [
  'reservation required', 'reservations required', 'hard to get', 'booked out',
  'reservations recommended', 'reservation recommended',
  'waitlist', 'deposit', 'cancellation policy',
];

export const FORMALITY_RITUAL_TERMS: string[] = [
  ...FORMALITY_HIGH_TERMS,
  ...FORMALITY_LOW_TERMS,
];

export const FORMALITY_MATERIAL_HIGH: string[] = [
  'linen', 'white tablecloth', 'crystal', 'fine china', 'tablecloth',
];
export const FORMALITY_MATERIAL_LOW: string[] = [
  'paper plates', 'plastic cups', 'standing room',
];

export const FORMALITY_MATERIAL_TERMS = {
  high: FORMALITY_MATERIAL_HIGH,
  low: FORMALITY_MATERIAL_LOW,
};

// =============================================================================
// WEIGHTS (config objects — tune here, not inside scoring functions)
// =============================================================================

export const ENERGY_WEIGHTS = {
  popularity: 0.40,
  language: 0.30,
  flags: 0.10,
  compression: 0.10,
  sensory: 0.10,
} as const;

/** Point caps per component (Energy) */
export const ENERGY_CAPS = {
  popularity: { min: 0, max: 50 },
  language: { min: -25, max: 25 },
  flags: { min: 0, max: 15 },
  compression: { min: 0, max: 15 },
  sensory: { min: -5, max: 10 },
} as const;

/** When popular-times missing: reweight divisor (max of remaining = 25+15+15+10 = 65) */
export const ENERGY_REWEIGHT_DIVISOR = 65;

export const FORMALITY_WEIGHTS = {
  service_model: 0.40,
  price_tier: 0.25,
  reservation: 0.20,
  language: 0.10,
  materials: 0.05,
} as const;

/** Point caps per component (Formality) */
export const FORMALITY_CAPS = {
  service_model: { min: 0, max: 40 },
  price_tier: { min: 0, max: 25 },
  reservation: { min: 0, max: 20 },
  language: { min: -5, max: 10 },
  materials: { min: 0, max: 5 },
} as const;
