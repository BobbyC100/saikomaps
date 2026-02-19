/**
 * Energy + Tag Engine v1 — Type definitions
 * CTO Spec: deterministic, versioned classification
 */

// =============================================================================
// ENERGY ENGINE
// =============================================================================

/** Optional time bucket for future time-aware energy (v1: baseline only) */
export type TimeBucket = 'baseline' | 'morning' | 'day' | 'evening' | 'late' | null;

/** Inputs for energy computation (from place/golden record) */
export interface EnergyInputs {
  /** 0-50 from Google popular-times; null if unavailable */
  popularityComponent: number | null;
  /** Editorial + about page text for language + sensory */
  coverageAboutText: string | null;
  /** Google: liveMusic */
  liveMusic?: boolean;
  /** Google: goodForGroups */
  goodForGroups?: boolean;
  /** Bar-forward proxy (category/types suggest bar-first) */
  barForward?: boolean;
}

/** Full component breakdown for energy_scores table */
export interface EnergyResult {
  energy_score: number;
  energy_confidence: number;
  popularity_component: number | null;
  language_component: number;
  flags_component: number;
  sensory_component: number;
  has_popularity: boolean;
  has_language: boolean;
  has_flags: boolean;
  has_sensory: boolean;
  version: string;
}

// =============================================================================
// TAG SCORING ENGINE
// =============================================================================

export type TagName = 'cozy' | 'date_night' | 'late_night' | 'after_work' | 'scene';

/** Inputs for tag scoring (energy + signals) */
export interface TagScoreInputs {
  energy_score: number;
  energy_confidence: number;
  coverageAboutText: string | null;
  liveMusic?: boolean;
  goodForGroups?: boolean;
  barForward?: boolean;
  /** Optional: energy for "late" bucket (eval only in v1) */
  lateNightEnergyScore?: number | null;
}

/** Full result for place_tag_scores table */
export interface TagScoresResult {
  cozy_score: number;
  date_night_score: number;
  late_night_score: number;
  after_work_score: number;
  scene_score: number;
  confidence: number;
  version: string;
  depends_on_energy_version: string;
}
