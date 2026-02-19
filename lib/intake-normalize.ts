/**
 * Shared normalization for golden-first intake and resolver.
 * Deterministic: same input → same normalized name and slug.
 */

const SUFFIX_TOKENS = [
  'restaurant',
  'cafe',
  'kitchen',
  'house',
  'noodle house',
  'dumpling house',
  'dim sum house',
  'inc',
  'llc',
  'co',
  'company',
  'bar',
  'grill',
  'eatery',
  'bistro',
  'brasserie',
]

/**
 * Normalize name for matching only (not for display).
 * Lowercase, trim, & → and, remove punctuation, collapse spaces,
 * strip trailing (Location), strip suffix tokens at end.
 */
export function normalizeNameForMatch(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
  s = s.replace(/\s*&\s*/g, ' and ')
  s = s.replace(/[.,'’\-()\/]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/\s*\([^)]+\)\s*$/, '').trim()
  for (const token of SUFFIX_TOKENS) {
    const re = new RegExp(`\\s+${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
    s = s.replace(re, '').trim()
  }
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Slug for matching only (deterministic from name).
 * Used by resolver to compare with golden_records.slug.
 */
export function slugForMatch(name: string): string {
  if (!name || typeof name !== 'string') return ''
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/[.,'’\-()\/]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}
