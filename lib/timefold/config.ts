/**
 * TimeFOLD v1 — Configuration
 *
 * Configurable thresholds for the TimeFOLD signal evaluator.
 * Mirrors the pattern established in lib/resolver/config.ts.
 *
 * Numeric thresholds are intentionally not hard-coded in the System Contract;
 * they live here as the single mutable control surface.
 */

export type TimeFOLDConfig = {
  /**
   * Days since ENTITY_CREATED trace (or golden_records.created_at fallback)
   * required to qualify a place as "established." Below this window, a place
   * may qualify for New / Recently Opened instead.
   */
  continuityWindowDays: number;

  /**
   * Days after ENTITY_CREATED within which a place qualifies as "recently opened."
   * Must be < continuityWindowDays.
   */
  newWindowDays: number;

  /**
   * Minimum confidence score for auto-eligible output classes. Classes that
   * compute confidence below this threshold are routed to editorial approval
   * rather than surfaced automatically.
   */
  autoConfidenceThreshold: number;

  /**
   * Days to look back when evaluating recent actor / ownership change traces.
   * Also used as the window for recent HUMAN_OVERRIDE events that block
   * Continuity / Established output.
   */
  changeTransitionWindowDays: number;
};

/**
 * Default production thresholds (v1 — calibration clamp applied).
 * Adjust here to tune policy without touching evaluator logic.
 *
 *   continuityWindowDays      730  — 2 years → "established" (conservative; silence preferred over false positive)
 *   newWindowDays              30  — 30 days → "recently opened" (clamped down; silence preferred over incorrect "new")
 *   autoConfidenceThreshold   0.85 — 85%+ → auto gate passes
 *   changeTransitionWindowDays 90  — 3 months of recent actor/change lookback
 */
export const TIMEFOLD_CONFIG: TimeFOLDConfig = {
  continuityWindowDays: 730,
  newWindowDays: 30,
  autoConfidenceThreshold: 0.85,
  changeTransitionWindowDays: 90,
};
