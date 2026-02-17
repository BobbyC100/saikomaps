/**
 * Data Coverage Audit Types
 * Internal admin tool for measuring structural completeness
 */

// Overview counts
export interface OverviewCounts {
  total_db: bigint;
  addressable: bigint;
  reachable: bigint;
  dark_inventory: bigint;
}

export interface ReachableNotActiveSanity {
  reachable_not_active: bigint;
}

// Missing fields view
export interface MissingFieldRow {
  field: string;
  missing: bigint;
}

export type FieldTier = 'Tier 1' | 'Tier 2' | 'Tier 3';

export interface MissingFieldWithTier extends MissingFieldRow {
  tier: FieldTier;
}

// Neighborhoods scorecard
export interface NeighborhoodScorecard {
  neighborhood: string;
  places: bigint;
  has_slug: bigint;
  has_name: bigint;
  has_latlng: bigint;
  has_google_id: bigint;
  has_hours: bigint;
  has_phone: bigint;
  has_website: bigint;
  tier1_complete: bigint;
}

export interface NeighborhoodScorecardWithPct extends NeighborhoodScorecard {
  tier1_pct: number;
}

// Red flags
export interface RedFlag {
  id: string;
  slug: string | null;
  name: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  severity: number;
  reasons: string[];
}

// Field breakdown (cross-cohort)
export interface FieldBreakdown {
  total: bigint;
  has_slug: bigint;
  has_name: bigint;
  has_latlng: bigint;
  has_google_id: bigint;
  has_hours: bigint;
  has_phone: bigint;
  has_website: bigint;
  has_instagram: bigint;
  has_neighborhood: bigint;
}

export interface CrossCohortRow {
  field: string;
  reachable_count: bigint;
  reachable_pct: number;
  addressable_count: bigint;
  addressable_pct: number;
  total_db_count: bigint;
  total_db_pct: number;
}
