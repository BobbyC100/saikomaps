/**
 * Identity helper — derives display-ready strings from EntityPageLocation.
 *
 * Pure function: no DB access, no side effects.
 * Caller is responsible for passing open-state (parsed from hours) if needed.
 */

import type { EntityPageLocation } from './entity-page';

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
 * @deprecated Use getIdentitySublineV2() for the canonical identity line.
 * Returns the three display-ready strings the identity block needs.
 *
 * @param place   - EntityPageLocation (from contract)
 * @param openStateLabel - Pre-derived open/closed label, or null
 */
export function getIdentityBlockInputs(
  place: Pick<EntityPageLocation, 'neighborhood' | 'category' | 'cuisineType' | 'offeringSignals'>,
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
 * @deprecated Use getIdentitySublineV2() for the canonical identity line.
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
  place: Pick<EntityPageLocation, 'neighborhood' | 'cuisineType' | 'offeringSignals'>
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
// Identity Line — canonical structural sentence
// Pattern: "[Offering] [Format] [and Secondary] in [Neighborhood]"
//
// Examples:
//   "French restaurant in the Arts District"
//   "Natural wine bar in Silver Lake"
//   "Wood-fired bakery in Venice"
//   "All-day café in Echo Park"
//   "Restaurant in Silver Lake"  (fallback)
//
// Design: calm, precise, industry-native, guidebook-like.
// Uses hospitality vocabulary — Saiko standardizes grammar, removes hype.
// Target: 6–12 words.
// ---------------------------------------------------------------------------

const VERTICAL_NOUN: Record<string, string> = {
  EAT: 'restaurant',
  COFFEE: 'café',
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

/** Wine program qualifiers that add meaning when prepended to "wine bar" */
const WINE_QUALIFIER: Record<string, string> = {
  natural: 'Natural',
  // 'classic' is the default expectation for a wine bar — omit
  // 'eclectic', 'minimal', 'none' don't add clarity — omit
};

/**
 * Returns a natural-language identity sentence for the top-of-page identity block.
 *
 * This is the canonical structural description of a place on Saiko.
 * Replaces the older dot-separated subline format.
 *
 * Model: [Offering] [Format] in [Neighborhood]
 *
 * Example outputs:
 *   "French restaurant in the Arts District"
 *   "Natural wine bar in Silver Lake"
 *   "Café in Los Feliz"
 *   "Restaurant in Echo Park"          (fallback: no cuisine)
 *   "French restaurant"                 (fallback: no neighborhood)
 *   null                                (no data at all)
 *
 * Pure function — no DB access.
 */
export function getIdentitySublineV2(
  place: Pick<
    EntityPageLocation,
    'neighborhood' | 'primaryVertical' | 'cuisineType' | 'offeringSignals'
  >
): string | null {
  const vertical = place.primaryVertical ?? null;
  const noun = vertical ? (VERTICAL_NOUN[vertical] ?? null) : null;
  const neighborhood = place.neighborhood?.trim() || null;
  const cuisineType = place.cuisineType?.trim() || null;
  const wineProgramIntent = place.offeringSignals?.wineProgramIntent ?? null;

  // No noun and no neighborhood → nothing useful to say
  if (!noun && !neighborhood) return null;

  // Build the qualified format phrase: "[Qualifier] [noun]"
  let formatPhrase: string;

  if (vertical === 'WINE' && noun) {
    // Wine bars: qualify with program intent (e.g. "Natural wine bar")
    const qualifier = wineProgramIntent ? (WINE_QUALIFIER[wineProgramIntent] ?? null) : null;
    formatPhrase = qualifier ? `${qualifier} ${noun}` : noun;
  } else if (vertical === 'EAT' && noun) {
    // Restaurants: qualify with cuisine (e.g. "French restaurant")
    formatPhrase = cuisineType ? `${cuisineType} ${noun}` : noun;
  } else if (noun) {
    // Other verticals: use noun as-is (bakery, café, bar, etc.)
    formatPhrase = noun;
  } else {
    // No vertical — best-effort from cuisine
    formatPhrase = cuisineType ? `${cuisineType} restaurant` : 'restaurant';
  }

  // Capitalize first letter
  formatPhrase = formatPhrase.charAt(0).toUpperCase() + formatPhrase.slice(1);

  // Append location
  if (neighborhood) {
    return `${formatPhrase} in ${neighborhood}`;
  }

  return formatPhrase;
}
