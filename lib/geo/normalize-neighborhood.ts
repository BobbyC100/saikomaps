/**
 * Centralized neighborhood normalization.
 * Single source of truth for alias → canonical name mapping.
 *
 * Used by: derive-neighborhood, neighborhood-lookup, coverage dashboard (SQL kept in sync).
 */

const NEIGHBORHOOD_ALIASES: Record<string, string> = {
  'art district': 'arts district',
  'downtown los angeles': 'downtown',
  'south los angeles': 'south central',
  'dtla': 'downtown',
  'east la': 'east los angeles',
  'north hollywood': 'noho',
  'weho': 'west hollywood',
};

/**
 * Normalize a neighborhood name to its canonical form.
 * Returns lowercased, trimmed, alias-resolved string.
 * Returns null if input is null/undefined/empty.
 */
export function normalizeNeighborhood(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase();
  return NEIGHBORHOOD_ALIASES[key] ?? key;
}
