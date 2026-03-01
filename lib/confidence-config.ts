/**
 * Confidence System v1 — tunable constants.
 * Single config file; all constants editable for tuning.
 */

export const CONFIDENCE_CONFIG = {
  /** Bonus when 2+ sources agree on the chosen value */
  agreement_boost: 0.1,
  /** Penalty when 2+ sources disagree (conflicting normalized values) */
  conflict_penalty: 0.15,
  /** Bonus for address when lat/lng exists (geocode validation signal) */
  geocode_boost: 0.1,
} as const;

/** Weights for overall confidence (weighted average). Only v1 fields. */
export const OVERALL_CONFIDENCE_WEIGHTS: Record<string, number> = {
  name: 0.25,
  address: 0.25,
  hours: 0.15,
  description: 0.15,
  phone: 0.1,
  website: 0.1,
};

/** v1 fields only — do not expand beyond this set */
export const CONFIDENCE_V1_FIELDS = [
  'name',
  'address',
  'phone',
  'website',
  'hours',
  'description',
] as const;

export type ConfidenceV1Field = (typeof CONFIDENCE_V1_FIELDS)[number];

/** Canonical source ids that have trust_tier in sources table. Lookups must hit these. */
export const CANONICAL_SOURCE_IDS = [
  'google_places',
  'michelin',
  'resy',
  'instagram_verified',
  'instagram_scraped',
  'manual_bobby',
] as const;

/** Map raw ingestion source_name → canonical sources.id for trust-tier lookup. */
export const RAW_SOURCE_TO_CANONICAL: Record<string, string> = {
  google_places: 'google_places',
  michelin: 'michelin',
  resy: 'resy',
  instagram_verified: 'instagram_verified',
  instagram_scraped: 'instagram_scraped',
  manual_bobby: 'manual_bobby',
  saiko_seed: 'manual_bobby',
  editorial_eater: 'manual_bobby',
  editorial_infatuation: 'manual_bobby',
  editorial_timeout: 'manual_bobby',
  saiko_ai: 'manual_bobby',
};
