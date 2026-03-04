/**
 * Resolver Policy Configuration
 *
 * Single source of truth for identity-resolution thresholds.
 * Edit values here to tune matching policy without touching pipeline logic.
 *
 * Schema:
 *   autoLinkThreshold  — confidence >= this → auto-link to existing golden
 *   reviewThreshold    — confidence in [reviewThreshold, autoLinkThreshold) → human review queue
 *   below reviewThreshold → kept separate (new golden minted)
 *
 * Current policy (v1):
 *   autoLinkThreshold : 0.90  (≥90% confident → link)
 *   reviewThreshold   : 0.70  (70–90% → review)
 *   h3BatchSize       : 100   (records processed per H3-blocking run)
 */

export type ResolverConfig = {
  /** Minimum match confidence to auto-link a raw record to an existing golden. */
  autoLinkThreshold: number;
  /** Minimum confidence to send to human review. Below this the record is kept separate. */
  reviewThreshold: number;
  /** Batch size for the H3-blocking phase (raw records processed per run). */
  h3BatchSize: number;
};

export const RESOLVER_CONFIG: ResolverConfig = {
  autoLinkThreshold: 0.90,
  reviewThreshold: 0.70,
  h3BatchSize: 100,
};
