/**
 * SceneSense — Display, PRL, Voice Engine, Lint
 * Spec: place-page-visual-design-spec.md (bundle)
 */

export * from './types';
export {
  computePRL,
  canPublish,
  type PRLResult,
  type PRLRequirement,
  type PlaceForPRL,
} from './prl';
export {
  generateSceneSenseCopy,
  type Mode,
  type VoiceCtx,
  type VoiceOutput,
  type CanonicalSceneSense,
} from './voice-engine';
export { lintSceneSenseOutput, type LintResult } from './lint';
export { mapPlaceToPlaceForPRL, mapToCanonicalSceneSense } from './mappers';
export {
  fetchPlaceForPRLBySlug,
  fetchPlaceForPRLBatch,
} from './prl-materialize';
export {
  assembleSceneSense,
  assembleSceneSenseFromMaterialized,
  type SceneSenseAssemblyResult,
} from './assembly';
