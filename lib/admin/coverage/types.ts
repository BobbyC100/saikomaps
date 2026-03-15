/**
 * Data Coverage Audit Types
 * Internal admin tool for measuring structural completeness
 */

// Overview counts
export interface OverviewCounts {
  total_db: bigint;
  open_count: bigint;
  candidate_count: bigint;
  addressable: bigint;
  reachable: bigint;
  neighborhoods: bigint;
  has_gpid: bigint;
}

export interface ReachableNotActiveSanity {
  reachable_not_active: bigint;
}

// Missing fields view
export interface MissingFieldRow {
  field: string;
  missing: bigint;
  total: bigint;
}

export type FieldTier = 'Tier 1' | 'Tier 2' | 'Tier 3';

export interface MissingFieldWithTier extends MissingFieldRow {
  tier: FieldTier;
}

// Neighborhoods scorecard
export interface NeighborhoodScorecard {
  neighborhood: string;
  places: bigint;
  entities: bigint;
  open_count: bigint;
  candidate_count: bigint;
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

// ── Dashboard v2 types (4-tab redesign) ──

// Tier completion (Overview tier bars)
export interface TierCompletion {
  total: bigint;
  tier1_complete: bigint;
  tier2_complete: bigint;
  tier3_complete: bigint;
}

// Enrichment stage distribution (Pipeline view)
export interface EnrichmentStage {
  stage: string;
  count: number;
}

// Recent enrichment runs (Pipeline view)
export interface RecentRun {
  id: string;
  entity_name: string;
  slug: string | null;
  run_status: string | null;
  last_attempt_at: Date | null;
  source: string | null;
  last_missing_groups: string | null;
}

// Per-field stats across tiers (Tier Health view)
export interface TierFieldStat {
  tier: number;
  field: string;
  has: number;
  missing: number;
  total: number;
}

// Tier 1 issue entities (Tier Health drill-down)
export interface Tier1Issue {
  id: string;
  slug: string | null;
  name: string;
  entity_status: string;
  neighborhood: string;
  issues: string[];
}
