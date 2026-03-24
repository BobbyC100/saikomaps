/**
 * Coverage Ops issue policy (single source of truth).
 *
 * This module defines which issue types are operationally actionable vs
 * informational. Summary metrics and UI grouping should import from here
 * instead of duplicating local lists.
 */

export type IssueActionability = 'actionable' | 'informational';

/**
 * Low-priority completeness gaps that should not inflate "actionable open"
 * operator workload metrics.
 */
export const INFORMATIONAL_ISSUE_TYPES = new Set<string>([
  'missing_menu_link',
  'missing_reservations',
  'missing_price_level',
  'missing_phone',
  'missing_instagram',
  'missing_tiktok',
  'missing_events_surface',
]);

/**
 * Returns whether an issue type should count toward operator action queue.
 */
export function getIssueActionability(issueType: string): IssueActionability {
  return INFORMATIONAL_ISSUE_TYPES.has(issueType) ? 'informational' : 'actionable';
}

