/**
 * Coverage Operations — Constants & Configuration
 */

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

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  unresolved_identity: 'Unresolved Identity (insufficient signals)',
  enrichment_incomplete: 'Never Enriched',
  missing_coords: 'Missing Coordinates',
  missing_neighborhood: 'Missing Neighborhood',
  missing_hours: 'Missing Opening Hours',
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
};

/** Maps issue types to the entity field that can be manually entered */
export const INLINE_EDITABLE: Record<string, { field: string; placeholder: string }> = {
  unresolved_identity: { field: 'google_place_id', placeholder: 'ChIJ...' },
  missing_gpid: { field: 'google_place_id', placeholder: 'ChIJ...' },
  missing_website: { field: 'website', placeholder: 'https://...' },
  missing_phone: { field: 'phone', placeholder: '(213) 555-1234' },
  missing_instagram: { field: 'instagram', placeholder: '@handle' },
  missing_tiktok: { field: 'tiktok', placeholder: '@handle' },
};

export const SUPPRESS_REASON = 'skipped';
