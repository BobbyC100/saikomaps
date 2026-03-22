/**
 * TimeFOLD v1 — Temporal Signal Classifier
 *
 * Proposes one of two output classes for an entity:
 *   STABILITY — "Established local presence."
 *   NEWNESS   — "Recently opened."
 *
 * Emission rules:
 *   - If signals conflict → emit nothing.
 *   - If confidence insufficient → emit nothing.
 *   - Silence is correct behavior.
 *
 * System proposes. Human approves or suppresses via editorial gate.
 * No editing allowed. No phrase changes allowed.
 *
 * @see TimeFOLD v1 — Locked Spec
 */

// ---------------------------------------------------------------------------
// Output Classes (locked)
// ---------------------------------------------------------------------------

export type TimeFoldClass = 'STABILITY' | 'NEWNESS';

export const TIMEFOLD_PHRASES: Record<TimeFoldClass, string> = {
  STABILITY: 'Established local presence.',
  NEWNESS: 'Recently opened.',
} as const;

// ---------------------------------------------------------------------------
// Classification Result
// ---------------------------------------------------------------------------

export interface TimeFoldProposal {
  class: TimeFoldClass;
  phrase: string;
  proposed_by: 'system';
  approved_by: null;
  /** Signals that contributed to the classification (for provenance) */
  input_signals: string[];
  /** Confidence: 'high' means clear signal, 'marginal' means close to threshold */
  confidence: 'high' | 'marginal';
}

// ---------------------------------------------------------------------------
// Input Signals
// ---------------------------------------------------------------------------

export interface TimeFoldInput {
  /** Entity created_at timestamp */
  entityCreatedAt: Date;
  /** When Google Places data was first cached (proxy for real-world discovery) */
  placesDataCachedAt: Date | null;
  /** Entity business status */
  businessStatus: string | null;
  /** Any coverage sources with published dates (editorial mentions) */
  earliestCoverageDate: Date | null;
  /** Number of coverage sources (indicator of establishment) */
  coverageSourceCount: number;
  /** Whether entity has a curator note (indicator of editorial attention) */
  hasCuratorNote: boolean;
  /** Whether entity has SceneSense output (indicator of community signal density) */
  hasSceneSense: boolean;
  /** PRL score (higher = more established community signal) */
  prl: number;
}

// ---------------------------------------------------------------------------
// Thresholds (tunable — start conservative, tighten via editorial review)
// ---------------------------------------------------------------------------

/**
 * Recency window for NEWNESS classification.
 * Entity must show creation signals within this window.
 * Default: 6 months. Bobby can tune this after reviewing proposals.
 */
const NEWNESS_WINDOW_DAYS = 180;

/**
 * Minimum age for STABILITY classification.
 * Entity must have signals older than this.
 * Default: 3 years.
 */
const STABILITY_MIN_AGE_DAYS = 365 * 3;

/**
 * Minimum PRL for STABILITY to fire.
 * Ensures the entity has enough community signal to call it "established."
 */
const STABILITY_MIN_PRL = 2;

/**
 * If PRL is this high + age threshold met, confidence is 'high'.
 */
const STABILITY_HIGH_CONFIDENCE_PRL = 4;

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Classify an entity's temporal signal.
 *
 * Returns a proposal or null (silence).
 * The caller is responsible for writing to interpretation_cache
 * and routing through the editorial gate.
 */
export function classifyTimeFold(input: TimeFoldInput): TimeFoldProposal | null {
  const now = new Date();
  const signals: string[] = [];

  // Don't classify non-operational entities
  if (
    input.businessStatus === 'CLOSED_PERMANENTLY' ||
    input.businessStatus === 'CLOSED_TEMPORARILY'
  ) {
    return null;
  }

  // ── Compute age signals ──────────────────────────────────────────────

  const entityAgeDays = daysBetween(input.entityCreatedAt, now);
  signals.push(`entity_age_days:${entityAgeDays}`);

  // Best estimate of real-world age: earliest of (created_at, placesDataCachedAt, earliestCoverage)
  const ageCandidates = [input.entityCreatedAt];
  if (input.placesDataCachedAt) ageCandidates.push(input.placesDataCachedAt);
  if (input.earliestCoverageDate) ageCandidates.push(input.earliestCoverageDate);
  const earliestSignal = ageCandidates.reduce((a, b) => (a < b ? a : b));
  const realWorldAgeDays = daysBetween(earliestSignal, now);
  signals.push(`real_world_age_days:${realWorldAgeDays}`);

  // ── Check for NEWNESS ────────────────────────────────────────────────

  const isRecent = realWorldAgeDays <= NEWNESS_WINDOW_DAYS;

  // Contradictory stability signals: if the entity has old coverage or high PRL, it's not new
  const hasStabilityContradiction =
    input.prl >= STABILITY_MIN_PRL ||
    input.coverageSourceCount >= 3 ||
    (input.earliestCoverageDate && daysBetween(input.earliestCoverageDate, now) > NEWNESS_WINDOW_DAYS);

  if (isRecent && hasStabilityContradiction) {
    // Signals conflict → emit nothing
    return null;
  }

  if (isRecent && !hasStabilityContradiction) {
    signals.push('classification:newness');
    return {
      class: 'NEWNESS',
      phrase: TIMEFOLD_PHRASES.NEWNESS,
      proposed_by: 'system',
      approved_by: null,
      input_signals: signals,
      confidence: realWorldAgeDays <= NEWNESS_WINDOW_DAYS / 2 ? 'high' : 'marginal',
    };
  }

  // ── Check for STABILITY ──────────────────────────────────────────────

  const isOldEnough = realWorldAgeDays >= STABILITY_MIN_AGE_DAYS;
  const hasMinPrl = input.prl >= STABILITY_MIN_PRL;

  // Contradictory newness signals: if entity was just created in the system, don't call it stable
  const hasNewnessContradiction = entityAgeDays <= NEWNESS_WINDOW_DAYS;

  if (isOldEnough && hasMinPrl && hasNewnessContradiction) {
    // System just discovered an old place — could be new to us but not new to the world.
    // Emit stability only if we have strong corroborating evidence (coverage, scenesense).
    if (input.coverageSourceCount >= 2 || input.hasSceneSense) {
      signals.push('classification:stability', 'override:new_to_system_but_established');
      return {
        class: 'STABILITY',
        phrase: TIMEFOLD_PHRASES.STABILITY,
        proposed_by: 'system',
        approved_by: null,
        input_signals: signals,
        confidence: 'marginal',
      };
    }
    // Not enough evidence → silence
    return null;
  }

  if (isOldEnough && hasMinPrl && !hasNewnessContradiction) {
    signals.push('classification:stability');
    const isHighConfidence =
      input.prl >= STABILITY_HIGH_CONFIDENCE_PRL ||
      (input.coverageSourceCount >= 2 && input.hasSceneSense);

    return {
      class: 'STABILITY',
      phrase: TIMEFOLD_PHRASES.STABILITY,
      proposed_by: 'system',
      approved_by: null,
      input_signals: signals,
      confidence: isHighConfidence ? 'high' : 'marginal',
    };
  }

  // ── Neither class applies → silence ──────────────────────────────────
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
