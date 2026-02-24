/**
 * SceneSense — Display Contract & Types
 * Spec: place-page-visual-design-spec.md (bundle)
 */

/** Place Readiness Level 1–4 */
export type PRL = 1 | 2 | 3 | 4;

/** SceneSense mode: Lite (max 2/ surface) or Full (max 4/ surface) */
export type SceneSenseMode = 'lite' | 'full';

/** Surfaces for SceneSense copy */
export type SceneSenseSurface = 'vibe' | 'atmosphere' | 'ambiance' | 'scene';

/** Per-surface statement arrays (alias for VoiceOutput) */
export interface SceneSenseOutput {
  vibe: string[];
  atmosphere: string[];
  ambiance: string[];
  scene: string[];
}

/** Confidence per surface (0–1) */
export interface SceneSenseConfidence {
  vibe_confidence?: number;
  atmosphere_confidence?: number;
  ambiance_confidence?: number;
  scene_confidence?: number;
}

/** Input to Voice Engine: canonical labels/enums */
export interface SceneSenseCanonicalInput {
  place_personality?: string | null;
  vibe_words?: string[];
  signature_dishes?: string[];
  neighborhood?: string | null;
  category?: string | null;
  price_tier?: string | null;
}

/** Voice Engine input */
export interface VoiceEngineInput {
  canonical: SceneSenseCanonicalInput;
  prl: PRL;
  mode: SceneSenseMode;
  confidence: SceneSenseConfidence;
}

/** Voice Engine output */
export type VoiceOutput = SceneSenseOutput;

/** Lint severity */
export type LintSeverity = 'error' | 'warning';

export interface LintIssue {
  surface?: SceneSenseSurface;
  statementIndex?: number;
  statement?: string;
  code: string;
  message: string;
  severity: LintSeverity;
}

export interface LintResult {
  valid: boolean;
  issues: LintIssue[];
  sanitized?: SceneSenseOutput; // After fail-closed sanitization
}
