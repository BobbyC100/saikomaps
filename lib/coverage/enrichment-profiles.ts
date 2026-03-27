/**
 * Enrichment Profiles — Vertical-Aware Completeness
 *
 * Implements SKAI-DOC-FIELDS-ENRICHMENT-MODEL-V1.
 *
 * Four enrichment layers:
 *   1. Identity       — does this place exist? (name, coords, GPID, vertical)
 *   2. Access         — can a person reach it? (website, phone, hours, IG, reservations)
 *   3. Offering       — what does it do? (programs, SceneSense, events, editorial, menu)
 *   4. Interpretation — can Saiko express a point of view? (tagline, future: summary, vibe)
 *
 * Identity is required for all entities and scored separately (issue scanner).
 * Access, Offering, and Interpretation expectations vary by primary_vertical.
 *
 * "Complete" = all expected fields for that vertical's layer are present.
 * Fields not expected for a vertical don't count against it.
 *
 * NOTE: The Interpretation layer (interpretation_expected) is defined in the
 * lane-first enrichment spec (lane-first-enrichment-v1.md) and will be added
 * to EnrichmentProfile when that spec is implemented. Currently, only Identity,
 * Access, and Offering are modeled in this file.
 */

// ---------------------------------------------------------------------------
// Field Keys
// ---------------------------------------------------------------------------

/** Access layer fields — how a user reaches/visits the place */
export type AccessFieldKey =
  | 'website'
  | 'phone'
  | 'hours'
  | 'instagram'
  | 'reservation_url';

/** Offering layer fields — what we know about the place's experience */
export type OfferingFieldKey =
  | 'menu_url'
  | 'offering_programs'
  | 'scenesense'
  | 'event_programs'
  | 'editorial';

/** Interpretation layer outputs (extensible) */
export type InterpretationKey = 'TAGLINE';

export type FieldKey = AccessFieldKey | OfferingFieldKey | InterpretationKey;

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
  /** Interpretation outputs expected for this vertical group */
  interpretation_expected: InterpretationKey[];
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
    interpretation_expected: ['TAGLINE'],
  },
  {
    // §4.3 — Culture
    verticals: ['CULTURE'],
    access_expected: ['website', 'hours', 'instagram'],
    offering_expected: ['scenesense', 'editorial'],
    interpretation_expected: ['TAGLINE'],
  },
  {
    // §4.4 — Shop
    verticals: ['SHOP'],
    access_expected: ['website', 'hours', 'phone', 'instagram'],
    offering_expected: ['scenesense', 'editorial'],
    interpretation_expected: ['TAGLINE'],
  },
  {
    // §4.5 — Activity
    verticals: ['ACTIVITY'],
    access_expected: ['website'],
    offering_expected: ['scenesense', 'editorial'],
    interpretation_expected: [],
  },
  {
    // §4.6 — Nature
    verticals: ['NATURE'],
    access_expected: [],
    offering_expected: ['scenesense'],
    interpretation_expected: [],
  },
  {
    // §4.7a — Hospitality (hotels/lodging)
    // Hotels generally don't have "operating hours" in the same sense as venues.
    verticals: ['STAY'],
    access_expected: ['website', 'instagram', 'phone'],
    offering_expected: ['scenesense', 'editorial'],
    interpretation_expected: ['TAGLINE'],
  },
  {
    // §4.7b — Wellness / Purveyors (default high-touch)
    verticals: ['WELLNESS', 'PURVEYORS'],
    access_expected: ['hours', 'website', 'instagram', 'phone'],
    offering_expected: ['scenesense', 'editorial'],
    interpretation_expected: ['TAGLINE'],
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
  interpretation_expected: ['TAGLINE'],
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

export interface EntityForAssessment extends AccessFieldContext {
  isNomadic?: boolean;
  googlePlaceId: string | null;
  website: string | null;
  instagram: string | null;
  phone: string | null;
  latitude: unknown;
  longitude: unknown;
  neighborhood: string | null;
  reservationUrl?: string | null;
  cesWebsite?: string | null;
  cesInstagram?: string | null;
  cesPhone?: string | null;
  cesHoursJson?: unknown;
  cesReservationUrl?: string | null;
  cesMenuUrl?: string | null;
  cesEventsUrl?: string | null;
  hasOfferingPrograms?: boolean;
  hasScenesense?: boolean;
  hasEditorialCoverage?: boolean;
  hasCurrentTagline?: boolean;
}

export interface EnrichmentAssessment {
  done: boolean;
  identity: {
    met: boolean;
    score: number;
    threshold: number;
    missing: string[];
  };
  access: {
    complete: boolean;
    satisfied: number;
    expected: number;
    missing: string[];
  };
  offering: {
    complete: boolean;
    satisfied: number;
    expected: number;
    missing: string[];
  };
  interpretation: {
    met: boolean;
    required: boolean;
    satisfied: number;
    expected: number;
    missing: string[];
  };
}

const IDENTITY_WEIGHTS = {
  gpid: 4,
  website: 3,
  instagram: 2,
  coords: 2,
  neighborhood: 1,
  phone: 1,
} as const;

export function isEntityEnriched(entity: EntityForAssessment): EnrichmentAssessment {
  const profile = getProfileForVertical(entity.vertical);

  const hasWebsite = Boolean((entity.cesWebsite ?? entity.website)?.trim());
  const hasInstagram = Boolean((entity.cesInstagram ?? entity.instagram)?.trim());
  const hasPhone = Boolean((entity.cesPhone ?? entity.phone)?.trim());
  const hasCoords = entity.latitude !== null && entity.latitude !== undefined
    && entity.longitude !== null && entity.longitude !== undefined;
  const hasNeighborhood = Boolean(entity.neighborhood?.trim());
  const hasGpid = Boolean(entity.googlePlaceId?.trim());

  const identityScore =
    (hasGpid ? IDENTITY_WEIGHTS.gpid : 0) +
    (hasWebsite ? IDENTITY_WEIGHTS.website : 0) +
    (hasInstagram ? IDENTITY_WEIGHTS.instagram : 0) +
    (hasCoords ? IDENTITY_WEIGHTS.coords : 0) +
    (hasNeighborhood ? IDENTITY_WEIGHTS.neighborhood : 0) +
    (hasPhone ? IDENTITY_WEIGHTS.phone : 0);
  const identityThreshold = entity.isNomadic ? 2 : 4;
  const identityMet = identityScore >= identityThreshold;

  const identityMissing: string[] = [];
  if (!hasGpid) identityMissing.push('gpid');
  if (!hasWebsite) identityMissing.push('website');
  if (!hasInstagram) identityMissing.push('instagram');
  if (!hasCoords) identityMissing.push('coords');
  if (!hasNeighborhood) identityMissing.push('neighborhood');
  if (!hasPhone) identityMissing.push('phone');

  const accessFieldState: Record<AccessFieldKey, boolean> = {
    website: hasWebsite,
    phone: hasPhone,
    hours: (entity.cesHoursJson ?? null) !== null && (entity.cesHoursJson ?? null) !== undefined,
    instagram: hasInstagram,
    reservation_url: Boolean((entity.cesReservationUrl ?? entity.reservationUrl ?? null)?.toString().trim()),
  };
  const expectedAccess = profile.access_expected.filter((field) =>
    expectsAccessFieldForEntity(entity, field),
  );
  const accessSatisfied = expectedAccess.filter((field) => accessFieldState[field]).length;
  const accessMissing = expectedAccess.filter((field) => !accessFieldState[field]);
  const accessComplete = accessMissing.length === 0;

  const offeringFieldState: Record<OfferingFieldKey, boolean> = {
    menu_url: Boolean((entity.cesMenuUrl ?? null)?.toString().trim()),
    offering_programs: Boolean(entity.hasOfferingPrograms),
    scenesense: Boolean(entity.hasScenesense),
    event_programs: Boolean((entity.cesEventsUrl ?? null)?.toString().trim()),
    editorial: Boolean(entity.hasEditorialCoverage),
  };
  const expectedOffering = profile.offering_expected;
  const offeringSatisfied = expectedOffering.filter((field) => offeringFieldState[field]).length;
  const offeringMissing = expectedOffering.filter((field) => !offeringFieldState[field]);
  const offeringComplete = offeringMissing.length === 0;

  const interpretationExpected = profile.interpretation_expected;
  const interpretationState: Record<InterpretationKey, boolean> = {
    TAGLINE: Boolean(entity.hasCurrentTagline),
  };
  const interpretationSatisfied = interpretationExpected.filter((field) => interpretationState[field]).length;
  const interpretationMissing = interpretationExpected.filter((field) => !interpretationState[field]);
  const interpretationRequired = interpretationExpected.length > 0;
  const interpretationMet = interpretationMissing.length === 0;

  return {
    done: identityMet && accessComplete && offeringComplete && interpretationMet,
    identity: {
      met: identityMet,
      score: identityScore,
      threshold: identityThreshold,
      missing: identityMet ? [] : identityMissing,
    },
    access: {
      complete: accessComplete,
      satisfied: accessSatisfied,
      expected: expectedAccess.length,
      missing: accessMissing,
    },
    offering: {
      complete: offeringComplete,
      satisfied: offeringSatisfied,
      expected: expectedOffering.length,
      missing: offeringMissing,
    },
    interpretation: {
      met: interpretationMet,
      required: interpretationRequired,
      satisfied: interpretationSatisfied,
      expected: interpretationExpected.length,
      missing: interpretationMissing,
    },
  };
}
