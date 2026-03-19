/**
 * Coverage Operations — Type Definitions
 */

export interface IssueRow {
  id: string;
  entity_id: string;
  entity_name: string;
  entity_slug: string;
  problem_class: string;
  issue_type: string;
  status: string;
  severity: string;
  blocking_publish: boolean;
  recommended_tool: string | null;
  detail: Record<string, unknown> | null;
  suppressed_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SummaryData {
  total_active: number;
  blocking_publish_entities: number;
  by_type: { issue_type: string; severity: string; count: number }[];
}

export interface CompareEntity {
  id: string;
  name: string;
  slug: string;
  googlePlaceId: string | null;
  website: string | null;
  phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  _counts: {
    merchant_surfaces: number;
    merchant_surface_artifacts: number;
    coverage_issues: number;
  };
}

export interface MergeState {
  issueId: string;
  entityA: CompareEntity;
  entityB: CompareEntity;
}

export interface EnrichProgress {
  slug: string;
  stage: number | null;
  done: boolean;
  error?: string;
}

export type ActionState = 'idle' | 'running' | 'done' | 'error';

/** Typed accessors for the polymorphic `detail` field per issue_type */
export interface GoogleSaysClosedDetail {
  googleStatus?: string;
}

export interface PotentialDuplicateDetail {
  duplicate_of_id?: string;
  duplicate_of_name?: string;
  match_reasons?: string[];
}
