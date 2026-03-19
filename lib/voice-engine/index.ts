/**
 * Saiko Voice Engine v1.1
 * Controlled vocabulary system for generating restaurant taglines
 *
 * @deprecated — v2 (lib/voice-engine-v2) is the canonical voice engine.
 * Do not add new features here. Some shared utilities (vocabulary, validation,
 * ad-units) are still imported by v2 and remain stable; the rest of this
 * module (orchestrator, generator, selector, signal-extraction) is superseded.
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
  TimeOfDay,
  PriceLevel,
  VocabularyPools,
  ValidationResult,
} from './types';
