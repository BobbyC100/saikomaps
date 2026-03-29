export const ORCHESTRATION_REASON = {
  // Discovery / fetch handoff
  NO_MENU_SURFACES_DISCOVERED: 'NO_MENU_SURFACES_DISCOVERED',
  MENU_SURFACES_DISCOVERED_NOT_FETCHED: 'MENU_SURFACES_DISCOVERED_NOT_FETCHED',
  MENU_FETCH_HTTP_ERROR: 'MENU_FETCH_HTTP_ERROR',
  MENU_FETCH_FAILED: 'MENU_FETCH_FAILED',
  MENU_FETCH_EMPTY_TEXT: 'MENU_FETCH_EMPTY_TEXT',
  MENU_CORPUS_STALE: 'MENU_CORPUS_STALE',

  // Interpretation readiness
  NO_MENU_IDENTITY_SIGNAL: 'NO_MENU_IDENTITY_SIGNAL',
  NO_MENU_STRUCTURE_SIGNAL: 'NO_MENU_STRUCTURE_SIGNAL',
  MENU_IDENTITY_STALE: 'MENU_IDENTITY_STALE',
  MENU_STRUCTURE_STALE: 'MENU_STRUCTURE_STALE',

  // Coverage readiness
  NO_COVERAGE_EVIDENCE: 'NO_COVERAGE_EVIDENCE',
  COVERAGE_STALE: 'COVERAGE_STALE',
} as const;

export type OrchestrationReason = (typeof ORCHESTRATION_REASON)[keyof typeof ORCHESTRATION_REASON];

export const FRESHNESS_WINDOWS_MS = {
  MENU_SIGNAL_MAX_AGE: 1000 * 60 * 60 * 24 * 3, // 72h
  COVERAGE_MAX_AGE: 1000 * 60 * 60 * 24 * 7, // 7d
} as const;

export function ageMs(isoOrDate: string | Date | null | undefined): number | null {
  if (!isoOrDate) return null;
  const ts = typeof isoOrDate === 'string' ? new Date(isoOrDate).getTime() : isoOrDate.getTime();
  if (!Number.isFinite(ts)) return null;
  return Date.now() - ts;
}
