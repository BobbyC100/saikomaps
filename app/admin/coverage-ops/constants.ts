/**
 * Coverage Operations — Constants & Configuration
 */
import { getIssueActionability } from '@/lib/coverage/issue-policy';

export const C = {
  bg: '#F5F0E1',
  cardBg: '#FFFFFF',
  text: '#36454F',
  muted: '#8B7355',
  accent: '#5BA7A7',
  border: '#C3B091',
  green: '#166534',
  greenBg: '#DCFCE7',
  amber: '#92400E',
  amberBg: '#FEF3C7',
  red: '#991B1B',
  redBg: '#FEE2E2',
} as const;

export const STAGE_LABELS: Record<number, string> = {
  1: 'Google Places',
  2: 'Surface discovery',
  3: 'Surface fetch',
  4: 'Surface parse',
  5: 'AI signals',
  6: 'Website enrichment',
  7: 'Tagline AI',
};
export const TOTAL_STAGES = 7;

export const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: '#FEE2E2', color: '#991B1B', label: 'CRIT' },
  high: { bg: '#FEF3C7', color: '#92400E', label: 'HIGH' },
  medium: { bg: '#F5F0E1', color: '#8B7355', label: 'MED' },
  low: { bg: '#F5F0E1', color: '#A09078', label: 'LOW' },
};

export const LANE_META: Record<string, { icon: string; label: string; order: number }> = {
  identity: { icon: '⊕', label: 'Identity', order: 0 },
  location: { icon: '◎', label: 'Location', order: 1 },
  contact: { icon: '☎', label: 'Contact', order: 2 },
  social: { icon: '◉', label: 'Social', order: 3 },
  editorial: { icon: '◈', label: 'Editorial', order: 4 },
};

/* ------------------------------------------------------------------ */
/*  Need-oriented sections (Actions tab redesign)                      */
/* ------------------------------------------------------------------ */

export const SECTION_META = {
  blocked: { label: 'Blocked from Publishing', order: 0, accent: '#991B1B', accentBg: '#FEE2E2', accentBorder: '#FCA5A5' },
  review: { label: 'Needs Human Review', order: 1, accent: '#92400E', accentBg: '#FEF3C7', accentBorder: '#FCD34D' },
  enrich: { label: 'Automatable Gaps', order: 2, accent: '#0F766E', accentBg: '#CCFBF1', accentBorder: '#5EEAD4' },
  completeness: { label: 'Data Completeness', order: 3, accent: '#8B7355', accentBg: '#F5F0E1', accentBorder: '#C3B091' },
} as const;

export type SectionKey = keyof typeof SECTION_META;

/** Maps each issue type to its need-oriented section */
export const ISSUE_SECTION: Record<string, SectionKey> = {
  // Blocked: cannot publish
  unresolved_identity: 'blocked',
  enrichment_incomplete: 'blocked',
  missing_coords: 'blocked',
  // Review: requires human judgment
  potential_duplicate: 'review',
  google_says_closed: 'review',
  // Enrich: automatable gaps, medium+ severity
  missing_gpid: 'enrich',
  missing_website: 'enrich',
  missing_hours: 'enrich',
  missing_neighborhood: 'enrich',
  operating_status_unknown: 'enrich',
  // Completeness: low severity nice-to-haves
  missing_menu_link: 'completeness',
  missing_reservations: 'completeness',
  missing_price_level: 'completeness',
  missing_phone: 'completeness',
  missing_instagram: 'completeness',
  missing_tiktok: 'completeness',
  missing_events_surface: 'completeness',
};

/** Problem-oriented descriptions (what's wrong, not what tool to run) */
export const ISSUE_NEED_LABELS: Record<string, string> = {
  unresolved_identity: 'Insufficient identity anchors (website/social/location) to publish',
  enrichment_incomplete: 'Has GPID but never enriched',
  missing_coords: "Can\u2019t be placed on the map",
  potential_duplicate: 'May be a duplicate of another entity',
  google_says_closed: 'Google reports this place is closed',
  missing_gpid: 'No Google Place ID (non-blocking)',
  missing_website: 'No website discovered',
  missing_hours: 'No operating hours',
  missing_neighborhood: 'No neighborhood assigned',
  operating_status_unknown: 'Operating status not confirmed',
  missing_menu_link: 'No menu link',
  missing_reservations: 'No reservation link',
  missing_price_level: 'No price level',
  missing_phone: 'No phone number',
  missing_instagram: 'No Instagram handle',
  missing_tiktok: 'No TikTok handle',
  missing_events_surface: 'No events / private dining surface',
};

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  unresolved_identity: 'Unresolved Identity (insufficient signals)',
  enrichment_incomplete: 'Never Enriched',
  missing_coords: 'Missing Coordinates',
  missing_neighborhood: 'Missing Neighborhood',
  missing_hours: 'Missing Operating Hours',
  missing_price_level: 'Missing Price Level',
  missing_menu_link: 'Missing Menu Link',
  missing_reservations: 'Missing Reservation Link',
  operating_status_unknown: 'Operating Status Unknown',
  missing_website: 'Missing Website',
  missing_phone: 'Missing Phone',
  missing_instagram: 'Missing Instagram',
  missing_tiktok: 'Missing TikTok',
  missing_gpid: 'Missing GPID (not blocking)',
  google_says_closed: 'Google Says Closed',
  potential_duplicate: 'Potential Duplicate',
  missing_events_surface: 'Missing Events / Private Dining Surface',
};

/** Optional UI badge copy for per-issue actionability */
export const ISSUE_ACTIONABILITY_LABELS: Record<string, 'actionable' | 'informational'> = {
  unresolved_identity: getIssueActionability('unresolved_identity'),
  enrichment_incomplete: getIssueActionability('enrichment_incomplete'),
  missing_coords: getIssueActionability('missing_coords'),
  missing_neighborhood: getIssueActionability('missing_neighborhood'),
  missing_hours: getIssueActionability('missing_hours'),
  missing_price_level: getIssueActionability('missing_price_level'),
  missing_menu_link: getIssueActionability('missing_menu_link'),
  missing_reservations: getIssueActionability('missing_reservations'),
  operating_status_unknown: getIssueActionability('operating_status_unknown'),
  missing_website: getIssueActionability('missing_website'),
  missing_phone: getIssueActionability('missing_phone'),
  missing_instagram: getIssueActionability('missing_instagram'),
  missing_tiktok: getIssueActionability('missing_tiktok'),
  missing_gpid: getIssueActionability('missing_gpid'),
  google_says_closed: getIssueActionability('google_says_closed'),
  potential_duplicate: getIssueActionability('potential_duplicate'),
  missing_events_surface: getIssueActionability('missing_events_surface'),
};

/** Maps issue types to the entity field that can be manually entered */
export const INLINE_EDITABLE: Record<string, { field: string; placeholder: string }> = {
  missing_gpid: { field: 'google_place_id', placeholder: 'ChIJ...' },
  missing_website: { field: 'website', placeholder: 'https://...' },
  missing_hours: { field: 'hours', placeholder: '{"weekday_text":["Mon: 8:00 AM - 4:00 PM"]}' },
  missing_phone: { field: 'phone', placeholder: '(213) 555-1234' },
  missing_instagram: { field: 'instagram', placeholder: '@handle' },
  missing_tiktok: { field: 'tiktok', placeholder: '@handle' },
  missing_events_surface: { field: 'events_url', placeholder: 'https://...' },
};

export const SUPPRESS_REASON = 'skipped';
