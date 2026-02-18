/**
 * Input and output types for Energy + Formality scoring.
 */

// =============================================================================
// ENERGY INPUTS
// =============================================================================

/** Optional: 0–50 from popular-times density (peak intensity + width + consistency). If missing, we reweight. */
export interface EnergyPopularityInput {
  /** 0–30 from max(popularity) over week */
  peakIntensity?: number;
  /** 0–15 from contiguous minutes above 70% of peak */
  peakWidth?: number;
  /** 0–5 from inverse variance */
  sustainedConsistency?: number;
}

/** Precomputed 0–50 popularity component (alternative to raw popular-times). */
export type EnergyPopularityComponent = number | null;

export interface EnergyScoreInputs {
  /** Precomputed 0–50 or null; if null, reweight remaining components */
  popularityComponent?: EnergyPopularityComponent;
  /** Concatenated coverage + about page text (for language + compression + sensory) */
  coverageAboutText?: string | null;
  /** Google: liveMusic */
  liveMusic?: boolean;
  /** Google: goodForGroups */
  goodForGroups?: boolean;
  /** Bar-forward proxy (serves beer/cocktails as primary) */
  barForward?: boolean;
}

// =============================================================================
// FORMALITY INPUTS
// =============================================================================

export type ServiceModelValue =
  | 'tasting-menu' | 'a-la-carte' | 'small-plates' | 'family-style' | 'counter'
  | 'counter / fast casual / truck' | 'bar-first' | 'full-service a la carte'
  | 'tasting menu' | 'omakase' | 'coursed prix fixe' | string;

export type PriceTierValue = '$' | '$$' | '$$$' | '$$$$' | string | null;

export interface FormalityScoreInputs {
  service_model?: ServiceModelValue | null;
  price_tier?: PriceTierValue | null;
  /** Google reservable flag */
  reservable?: boolean;
  /** Coverage + about text for reservation language + dress/ritual + materials */
  coverageAboutText?: string | null;
}

// =============================================================================
// SCORE OUTPUT (shared shape)
// =============================================================================

export interface ScoreResult {
  score: number;
  confidence: number;
  version: string;
  debug: Record<string, unknown>;
}
