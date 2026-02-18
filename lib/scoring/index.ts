/**
 * Energy + Formality scoring — pipeline-generated, auditable.
 * Specs: docs/ENERGY_SCORE_SPEC.md, docs/FORMALITY_SCORE_SPEC.md
 */

export { computeEnergyScore } from './energy';
export { computeFormalityScore } from './formality';
export * from './lexicons';
export type { EnergyScoreInputs, FormalityScoreInputs, ScoreResult } from './types';
