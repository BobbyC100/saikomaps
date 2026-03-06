/**
 * Identity helper — derives display-ready strings from PlacePageLocation.
 *
 * Pure function: no DB access, no side effects.
 * Caller is responsible for passing open-state (parsed from hours) if needed.
 */

import type { PlacePageLocation } from './place-page';

export type IdentityBlockInputs = {
  /** "{neighborhood} {category}" subline, e.g. "Silver Lake restaurant". Null if both absent. */
  identityLine: string | null;
  /** Offering summary when enrichment is available, e.g. "Italian kitchen". Null if not derivable. */
  offeringLine: string | null;
  /**
   * Open-state label — e.g. "Open now" or "Closed now".
   * Caller must derive this from hours (we don't parse hours here).
   * Pass null if unknown or hours not parsed.
   */
  openStateLabel: string | null;
};

/**
 * Returns the three display-ready strings the identity block needs.
 *
 * @param place   - PlacePageLocation (from contract)
 * @param openStateLabel - Pre-derived open/closed label, or null
 */
export function getIdentityBlockInputs(
  place: Pick<PlacePageLocation, 'neighborhood' | 'category' | 'cuisineType' | 'offeringSignals'>,
  openStateLabel: string | null = null
): IdentityBlockInputs {
  // Identity line: "{neighborhood} {category}"
  const parts: string[] = [];
  if (place.neighborhood?.trim()) parts.push(place.neighborhood.trim());
  if (place.category?.trim()) parts.push(place.category.trim().toLowerCase());
  const identityLine = parts.length > 0 ? parts.join(' ') : null;

  // Offering line: best single summary from enrichment signals
  const os = place.offeringSignals;
  let offeringLine: string | null = null;

  const CUISINE_POSTURE: Record<string, string> = {
    'produce-driven': 'Seasonal, produce-driven kitchen',
    'protein-centric': 'Protein-focused menu',
    'carb-forward': 'Carb-forward comfort cooking',
    'seafood-focused': 'Seafood-centered menu',
    'balanced': 'Balanced, broadly composed menu',
  };

  if (os?.cuisinePosture && CUISINE_POSTURE[os.cuisinePosture]) {
    offeringLine = CUISINE_POSTURE[os.cuisinePosture];
  } else if (place.cuisineType?.trim()) {
    offeringLine = `${place.cuisineType.trim()} kitchen`;
  }

  return { identityLine, offeringLine, openStateLabel };
}

// ---------------------------------------------------------------------------
// Profile Identity Line v2 — sign-style offering composition
// Format: "{cuisine}, {Cocktails}, {Wine}" — max 3 segments — no neighborhood
// Joined with ", " — Title Case — operator sign language over inferred posture
// ---------------------------------------------------------------------------

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns a comma-separated identity line suitable for the top-of-page profile header.
 *
 * Follows sign-style offering composition: what the operator would put on a sign.
 * Neighborhood is intentionally excluded — the sign is about what you serve, not where.
 *
 * Example outputs:
 *   "Italian, Cocktails, Wine"
 *   "Japanese, Wine"
 *   "Seafood, Beer"
 *   "Italian"
 *
 * Pure function — no DB access.
 */
export function getProfileIdentityLine(
  place: Pick<PlacePageLocation, 'neighborhood' | 'cuisineType' | 'offeringSignals'>
): string | null {
  const segments: string[] = [];
  const os = place.offeringSignals;

  // Segment 1: Cuisine phrase (cuisineType, title-cased)
  if (place.cuisineType?.trim()) {
    segments.push(toTitleCase(place.cuisineType.trim()));
  }

  // Segment 2: Cocktails (explicit serving signal — operator-authored)
  if (os?.servesCocktails === true && segments.length < 3) {
    segments.push('Cocktails');
  }

  // Segment 3: Wine (explicit serving signal — operator-authored)
  if (os?.servesWine === true && segments.length < 3) {
    segments.push('Wine');
  }

  return segments.length > 0 ? segments.join(', ') : null;
}

// ---------------------------------------------------------------------------
// Identity Subline v2 — facts-based, neighborhood + base noun + max 2 facets
// ---------------------------------------------------------------------------

const VERTICAL_NOUN: Record<string, string> = {
  EAT: 'restaurant',
  COFFEE: 'cafe',
  WINE: 'wine bar',
  DRINKS: 'bar',
  BAKERY: 'bakery',
  STAY: 'hotel',
  SHOP: 'shop',
  CULTURE: 'gallery',
  WELLNESS: 'spa',
  PURVEYORS: 'market',
  NATURE: 'park',
  ACTIVITY: 'venue',
};

/**
 * Returns a facts-based identity subline for the top-of-page identity block.
 *
 * Format: "{neighborhood} {base noun} · {facet1} · {facet2}"
 * Examples:
 *   "Echo Park restaurant · dinner · wine"
 *   "Silver Lake wine bar · cocktails"
 *   "Los Feliz cafe"
 *
 * Rules:
 *   - Base noun derived from primaryVertical (never from vibe tags)
 *   - Facets: at most 2, drawn from {lunch, dinner, cocktails, wine, beer}
 *   - Never outputs an empty string — returns null if no data
 */
export function getIdentitySublineV2(
  place: Pick<PlacePageLocation, 'neighborhood' | 'primaryVertical' | 'offeringSignals'>
): string | null {
  const noun = place.primaryVertical ? (VERTICAL_NOUN[place.primaryVertical] ?? null) : null;

  const base: string[] = [];
  if (place.neighborhood?.trim()) base.push(place.neighborhood.trim());
  if (noun) base.push(noun);

  if (base.length === 0) return null;

  const os = place.offeringSignals;
  const facets: string[] = [];

  if (os) {
    if (os.servesLunch === true && facets.length < 2) facets.push('lunch');
    if (os.servesDinner === true && facets.length < 2) facets.push('dinner');
    if (os.servesCocktails === true && facets.length < 2) facets.push('cocktails');
    if (os.servesWine === true && facets.length < 2) facets.push('wine');
    // beer only surfaces if no wine/cocktail facet already used
    if (os.servesBeer === true && facets.length < 2 && !facets.includes('cocktails') && !facets.includes('wine')) {
      facets.push('beer');
    }
  }

  const baseStr = base.join(' ');
  return facets.length > 0 ? `${baseStr} · ${facets.join(' · ')}` : baseStr;
}
