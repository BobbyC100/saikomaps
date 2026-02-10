/**
 * String Similarity Utilities
 * 
 * Various string comparison algorithms for entity matching
 */

import { jaroWinkler, levenshtein } from 'jellyfish';

/**
 * Jaro-Winkler similarity (0 to 1, higher = more similar)
 * Good for names and addresses
 */
export function jaroWinklerSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  return jaroWinkler(str1, str2);
}

/**
 * Normalized Levenshtein distance (0 to 1, higher = more similar)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshtein(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Token sort ratio - order-independent comparison
 * Good for addresses where word order might vary
 */
export function tokenSortRatio(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(' ');
  
  const norm1 = normalize(str1);
  const norm2 = normalize(str2);
  
  return jaroWinklerSimilarity(norm1, norm2);
}

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
  
  // Common substitutions
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
  
  // Common address substitutions
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

/**
 * Compare two values with similarity threshold
 */
export function isSimilar(
  val1: string | null | undefined,
  val2: string | null | undefined,
  threshold = 0.85
): boolean {
  if (!val1 || !val2) return false;
  return jaroWinklerSimilarity(val1, val2) >= threshold;
}

/**
 * Compare two values for exact match
 */
export function isExactMatch(
  val1: string | null | undefined,
  val2: string | null | undefined
): boolean {
  if (!val1 || !val2) return false;
  return val1.toLowerCase().trim() === val2.toLowerCase().trim();
}
