/**
 * Saiko Voice Engine v1.1
 * Controlled vocabulary system for generating restaurant taglines
 * 
 * Main exports for tagline generation pipeline
 */

// Core orchestrator
export { generateTagline, generateTaglineWithFallback, enrichPlace, batchEnrichPlaces } from './orchestrator';

// Individual components
export { generateTaglineCandidates, generateTaglineCandidatesWithRetry } from './generator';
export { selectBestTagline } from './selector';
export { assignAdUnitType, batchAssignAdUnitTypes } from './ad-units';

// Signal extraction and derivation
export {
  extractMerchantSignals,
  deriveAttributes,
  extractSignalsAndAttributes,
  mapGooglePriceLevel,
  extractStreetName,
  extractNeighborhood,
  type GooglePlaceData,
} from './signal-extraction';

// Validation
export {
  validateTagline,
  validateTaglineCandidates,
  filterValidTaglines,
  hasValidCandidate,
} from './validation';

// Vocabulary system
export { VOCABULARY, FOOD_DRINK_REFERENCES, NEIGHBORHOOD_PATTERNS } from './vocabulary';

// Types
export type {
  MerchantSignals,
  DerivedAttributes,
  TaglineGenerationInput,
  TaglineGenerationResult,
  AdUnitType,
  AdUnitAssignment,
  PhrasePattern,
  PopularityTier,
  Vibe,
  TimeOfDay,
  PriceLevel,
  VocabularyPools,
  ValidationResult,
} from './types';
