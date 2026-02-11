/**
 * String normalization utilities (pure JS, no external deps)
 * Use this for build-safe imports in app and API routes.
 * For similarity algorithms that need jellyfish, use lib/similarity.ts in scripts only.
 */

/**
 * Normalize a place name for matching
 * - Lowercase
 * - Remove articles (the, a, an)
 * - Remove common suffixes (restaurant, cafe, bar, etc.)
 * - Remove punctuation
 * - Collapse whitespace
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';

  let normalized = name.toLowerCase().trim();

  const substitutions: [RegExp, string][] = [
    [/\b(the|a|an)\b/g, ''],
    [/[\'"`]/g, ''],
    [/\s+/g, ' '],
    [/\b(restaurant|cafe|bar|grill|kitchen|eatery|bistro|brasserie)\b/g, ''],
    [/[^\w\s]/g, ''],
  ];

  for (const [pattern, replacement] of substitutions) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.trim();
}

/**
 * Normalize an address for matching
 */
export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return '';

  let normalized = address.toLowerCase().trim();

  const substitutions: [RegExp, string][] = [
    [/\bstreet\b/g, 'st'],
    [/\bavenue\b/g, 'ave'],
    [/\bboulevard\b/g, 'blvd'],
    [/\bdrive\b/g, 'dr'],
    [/\broad\b/g, 'rd'],
    [/\bwest\b/g, 'w'],
    [/\beast\b/g, 'e'],
    [/\bnorth\b/g, 'n'],
    [/\bsouth\b/g, 's'],
    [/[^\w\s]/g, ''],
    [/\s+/g, ' '],
  ];

  for (const [pattern, replacement] of substitutions) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.trim();
}
