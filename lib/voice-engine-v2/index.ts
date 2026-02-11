/**
 * Saiko Voice Engine v2.0
 * Main exports for tagline generation using identity signals
 */

// Types
export type {
  IdentitySignals,
  PlaceContext,
  TaglineGenerationInputV2,
  TaglineGenerationResultV2,
  PhrasePattern,
  PatternWeights,
  ValidationResult,
} from './types';

export { getPatternWeights } from './types';

// Signal Extraction
export {
  extractSignalsFromGoldenRecord,
  buildTaglineInputFromGoldenRecord,
  fetchRecordsForTaglineGeneration,
  hasMinimumSignals,
  assessSignalQuality,
} from './signal-extraction';

// Generation
export {
  generateTaglineCandidatesV2,
  generateTaglineCandidatesWithRetryV2,
  getFallbackTaglines,
  getThinDataFallbacks,
} from './generator';

// Selection
export {
  selectBestTaglineV2,
} from './selector';

// Orchestration
export {
  generateTaglineV2,
  generateTaglineWithFallbackV2,
  enrichPlaceV2,
  batchEnrichPlacesV2,
} from './orchestrator';

// Re-export vocabulary and validation from v1.1 (unchanged)
export { VOCABULARY } from '../voice-engine/vocabulary';
export {
  validateTagline,
  validateTaglineCandidates,
  filterValidTaglines,
} from '../voice-engine/validation';

// Re-export ad units (unchanged)
export { assignAdUnitType } from '../voice-engine/ad-units';
