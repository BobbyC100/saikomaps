/**
 * Enrichment Profiles — Vertical-Aware Completeness
 *
 * Implements SKAI-DOC-FIELDS-ENRICHMENT-MODEL-V1.
 *
 * Three buckets:
 *   1. Identity   — existence layer (name, coords, GPID, vertical)
 *   2. Access     — contact surface (website, phone, hours, IG, reservations)
 *   3. Offering   — content depth (programs, SceneSense, events, editorial, menu)
 *
 * Identity is required for all entities and scored separately (issue scanner).
 * Access and Offering expectations vary by primary_vertical.
 *
 * "Complete" = all expected fields for that vertical's bucket are present.
 * Fields not expected for a vertical don't count against it.
 */

// ---------------------------------------------------------------------------
// Field Keys
// ---------------------------------------------------------------------------

/** Access bucket fields — how a user reaches/visits the place */
export type AccessFieldKey =
  | 'website'
  | 'phone'
  | 'hours'
  | 'instagram'
  | 'reservation_url';

/** Offering bucket fields — what we know about the place's experience */
export type OfferingFieldKey =
  | 'menu_url'
  | 'offering_programs'
  | 'scenesense'
  | 'event_programs'
  | 'editorial';

export type FieldKey = AccessFieldKey | OfferingFieldKey;

// ---------------------------------------------------------------------------
// Profile Shape
// ---------------------------------------------------------------------------

export interface EnrichmentProfile {
  /** Which verticals this profile applies to */
  verticals: string[];
  /** Access fields expected for this vertical group */
  access_expected: AccessFieldKey[];
  /** Offering fields expected for this vertical group */
  offering_expected: OfferingFieldKey[];
}

// ---------------------------------------------------------------------------
// Profile Definitions (from enrichment-model-v1.md §4)
// ---------------------------------------------------------------------------

export const ENRICHMENT_PROFILES: EnrichmentProfile[] = [
  {
    // §4.1 + §4.2 — Food & Beverage
    verticals: ['EAT', 'DRINKS', 'BAKERY', 'COFFEE', 'WINE'],
    access_expected: ['hours', 'website', 'instagram', 'phone', 'reservation_url'],
    offering_expected: ['menu_url', 'offering_programs', 'scenesense', 'event_programs', 'editorial'],
  },
  {
    // §4.3 — Culture
    verticals: ['CULTURE'],
    access_expected: ['website', 'hours', 'instagram'],
    offering_expected: ['scenesense', 'editorial'],
  },
  {
    // §4.4 — Shop
    verticals: ['SHOP'],
    access_expected: ['website', 'hours', 'phone', 'instagram'],
    offering_expected: ['scenesense', 'editorial'],
  },
  {
    // §4.5 — Activity
    verticals: ['ACTIVITY'],
    access_expected: ['website'],
    offering_expected: ['scenesense', 'editorial'],
  },
  {
    // §4.6 — Nature
    verticals: ['NATURE'],
    access_expected: [],
    offering_expected: ['scenesense'],
  },
  {
    // §4.7a — Hospitality (hotels/lodging)
    // Hotels generally don't have "operating hours" in the same sense as venues.
    verticals: ['STAY'],
    access_expected: ['website', 'instagram', 'phone'],
    offering_expected: ['scenesense', 'editorial'],
  },
  {
    // §4.7b — Wellness / Purveyors (default high-touch)
    verticals: ['WELLNESS', 'PURVEYORS'],
    access_expected: ['hours', 'website', 'instagram', 'phone'],
    offering_expected: ['scenesense', 'editorial'],
  },
];

// ---------------------------------------------------------------------------
// Lookup Helpers
// ---------------------------------------------------------------------------

/** Map from vertical string → profile (built once at module load) */
const PROFILE_BY_VERTICAL = new Map<string, EnrichmentProfile>();
for (const profile of ENRICHMENT_PROFILES) {
  for (const v of profile.verticals) {
    PROFILE_BY_VERTICAL.set(v, profile);
  }
}

/** Default profile for unknown verticals — same as STAY/WELLNESS */
const DEFAULT_PROFILE: EnrichmentProfile = {
  verticals: [],
  access_expected: ['hours', 'website', 'instagram', 'phone'],
  offering_expected: ['scenesense', 'editorial'],
};

/**
 * Get the enrichment profile for a given vertical.
 * Returns the default profile if vertical is null or unrecognized.
 */
export function getProfileForVertical(vertical: string | null): EnrichmentProfile {
  if (!vertical) return DEFAULT_PROFILE;
  return PROFILE_BY_VERTICAL.get(vertical) ?? DEFAULT_PROFILE;
}

/** True if this vertical expects the given access field. */
export function expectsAccessField(
  vertical: string | null,
  field: AccessFieldKey,
): boolean {
  const profile = getProfileForVertical(vertical);
  return profile.access_expected.includes(field);
}

export interface AccessFieldContext {
  vertical: string | null;
  category?: string | null;
  slug?: string | null;
  name?: string | null;
}

function isHoursOptionalSubtype(context: AccessFieldContext): boolean {
  if (context.vertical !== 'CULTURE') return false;

  const signals = [
    context.category ?? '',
    context.slug ?? '',
    context.name ?? '',
  ]
    .join(' ')
    .toLowerCase();

  if (!signals.trim()) return false;

  const musicVenueTokens = [
    'music venue',
    'theater',
    'theatre',
    'concert hall',
    'live music',
    'performance venue',
  ];

  return musicVenueTokens.some((token) => signals.includes(token));
}

/**
 * Entity-aware access expectation.
 * Default is vertical profile behavior, with subtype exceptions layered on top.
 */
export function expectsAccessFieldForEntity(
  context: AccessFieldContext,
  field: AccessFieldKey,
): boolean {
  if (field === 'hours' && isHoursOptionalSubtype(context)) return false;
  return expectsAccessField(context.vertical, field);
}

/**
 * Compute access completeness for an entity.
 * Returns { complete: boolean, satisfied: number, expected: number }
 */
export function computeAccessCompleteness(
  vertical: string | null,
  fields: Record<AccessFieldKey, boolean>,
): { complete: boolean; satisfied: number; expected: number } {
  const profile = getProfileForVertical(vertical);
  const expected = profile.access_expected.length;
  if (expected === 0) return { complete: true, satisfied: 0, expected: 0 };
  const satisfied = profile.access_expected.filter((k) => fields[k]).length;
  return { complete: satisfied === expected, satisfied, expected };
}

/**
 * Compute offering completeness for an entity.
 * Returns { complete: boolean, satisfied: number, expected: number }
 */
export function computeOfferingCompleteness(
  vertical: string | null,
  fields: Record<OfferingFieldKey, boolean>,
): { complete: boolean; satisfied: number; expected: number } {
  const profile = getProfileForVertical(vertical);
  const expected = profile.offering_expected.length;
  if (expected === 0) return { complete: true, satisfied: 0, expected: 0 };
  const satisfied = profile.offering_expected.filter((k) => fields[k]).length;
  return { complete: satisfied === expected, satisfied, expected };
}
