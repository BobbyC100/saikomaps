/**
 * PRL (Place Readiness Level) Enforcement
 * Spec: PRL Enforcement Rules v1 — Bobby pseudocode
 *
 * - computed_prl (derived from requirements)
 * - prl_override (manual override)
 * - Displayed PRL = override if present else computed
 * - Publishing gate: Published requires PRL ≥ 3 unless override exists
 */

export type PRL = 1 | 2 | 3 | 4;

export type PRLRequirement =
  | 'HAS_NAME'
  | 'HAS_CATEGORY'
  | 'HAS_ADDRESS_OR_LATLNG'
  | 'LIFECYCLE_ACTIVE'
  | 'HAS_HOURS'
  | 'HAS_BUSINESS_STATUS'
  | 'HAS_ANY_PHOTO'
  | 'HAS_DESCRIPTION_OR_CURATOR_NOTE'
  | 'HAS_ENERGY_OR_TAG_SIGNALS'
  | 'HAS_PHOTO_QUALITY_THRESHOLD'
  | 'HAS_MULTI_SCENESENSE_INPUTS'
  | 'HAS_REINFORCEMENT_SIGNAL';

export type PRLResult = {
  prl: PRL; // effective (override if present)
  computed_prl: PRL;
  prl_override: number | null;
  hasOverride: boolean;
  requirements: Record<PRLRequirement, boolean>;
  unmetRequirements: PRLRequirement[];
};

export type PlaceForPRL = {
  name?: string | null;
  category?: string | null;
  address_street?: string | null;
  lat?: number | null;
  lng?: number | null;

  lifecycle_status?: string | null;
  business_status?: string | null;

  hours_json?: unknown | null;

  googlePhotosCount?: number;
  userPhotosCount?: number;
  heroApproved?: boolean;
  hasInteriorOrContextApproved?: boolean;
  curatorPhotoOverride?: boolean;

  description?: string | null;
  curatorNote?: string | null;

  energyScore?: number | null;
  hasTagSignals?: boolean;
  hasFormality?: boolean;
  hasIdentitySignals?: boolean;
  hasTemporalSignals?: boolean;

  fieldsMembershipCount?: number;
  appearsOnCount?: number;
  hasCoverageSource?: boolean;
};

function nonTrivialText(s?: string | null, minLen = 40): boolean {
  if (!s) return false;
  return s.trim().length >= minLen;
}

function hasAddressOrLatLng(p: PlaceForPRL): boolean {
  return (
    Boolean(p.address_street?.trim()) ||
    (typeof p.lat === 'number' && typeof p.lng === 'number')
  );
}

function isActiveLifecycle(p: PlaceForPRL): boolean {
  return (p.lifecycle_status ?? 'ACTIVE') === 'ACTIVE';
}

function hasAnyPhoto(p: PlaceForPRL): boolean {
  const count = (p.googlePhotosCount ?? 0) + (p.userPhotosCount ?? 0);
  return count > 0;
}

function hasPhotoQuality(p: PlaceForPRL): boolean {
  return Boolean(
    p.heroApproved || p.hasInteriorOrContextApproved || p.curatorPhotoOverride
  );
}

function hasEnergyOrTags(p: PlaceForPRL): boolean {
  return typeof p.energyScore === 'number' || Boolean(p.hasTagSignals);
}

function hasMultiSceneSenseInputs(p: PlaceForPRL): boolean {
  const hits = [
    typeof p.energyScore === 'number' || Boolean(p.hasTagSignals),
    Boolean(p.hasFormality),
    Boolean(p.hasIdentitySignals),
    Boolean(p.hasTemporalSignals),
  ].filter(Boolean).length;
  return hits >= 3;
}

function hasReinforcement(p: PlaceForPRL): boolean {
  return (
    (p.fieldsMembershipCount ?? 0) > 0 ||
    (p.appearsOnCount ?? 0) > 0 ||
    Boolean(p.hasCoverageSource)
  );
}

export function computePRL(
  place: PlaceForPRL,
  prlOverride?: number | null
): PRLResult {
  const requirements: Record<PRLRequirement, boolean> = {
    HAS_NAME: Boolean(place.name?.trim()),
    HAS_CATEGORY: Boolean(place.category?.trim()),
    HAS_ADDRESS_OR_LATLNG: hasAddressOrLatLng(place),
    LIFECYCLE_ACTIVE: isActiveLifecycle(place),

    HAS_HOURS: Boolean(place.hours_json),
    HAS_BUSINESS_STATUS: Boolean(place.business_status),
    HAS_ANY_PHOTO: hasAnyPhoto(place),

    HAS_DESCRIPTION_OR_CURATOR_NOTE:
      nonTrivialText(place.description) || nonTrivialText(place.curatorNote),

    HAS_ENERGY_OR_TAG_SIGNALS: hasEnergyOrTags(place),

    HAS_PHOTO_QUALITY_THRESHOLD: hasPhotoQuality(place),

    HAS_MULTI_SCENESENSE_INPUTS: hasMultiSceneSenseInputs(place),
    HAS_REINFORCEMENT_SIGNAL: hasReinforcement(place),
  };

  let computed: PRL = 1;

  const prl1ok =
    requirements.HAS_NAME &&
    requirements.HAS_CATEGORY &&
    requirements.HAS_ADDRESS_OR_LATLNG &&
    requirements.LIFECYCLE_ACTIVE;

  if (!prl1ok) {
    computed = 1;
  } else {
    const prl2ok =
      requirements.HAS_HOURS &&
      requirements.HAS_BUSINESS_STATUS &&
      requirements.HAS_ANY_PHOTO;

    computed = prl2ok ? 2 : 1;

    const prl3ok =
      prl2ok &&
      requirements.HAS_DESCRIPTION_OR_CURATOR_NOTE &&
      requirements.HAS_ENERGY_OR_TAG_SIGNALS &&
      requirements.HAS_PHOTO_QUALITY_THRESHOLD;

    if (prl3ok) computed = 3;

    const prl4ok =
      prl3ok &&
      requirements.HAS_MULTI_SCENESENSE_INPUTS &&
      requirements.HAS_REINFORCEMENT_SIGNAL;

    if (prl4ok) computed = 4;
  }

  const hasOverride =
    typeof prlOverride === 'number' && [1, 2, 3, 4].includes(prlOverride);
  const effective: PRL = hasOverride ? (prlOverride as PRL) : computed;

  const unmet = (Object.keys(requirements) as PRLRequirement[]).filter(
    (k) => !requirements[k]
  );

  return {
    prl: effective,
    computed_prl: computed,
    prl_override: hasOverride ? prlOverride! : null,
    hasOverride,
    requirements,
    unmetRequirements: unmet,
  };
}

export function canPublish(
  place: PlaceForPRL,
  prlOverride?: number | null
): boolean {
  const r = computePRL(place, prlOverride);
  return r.prl >= 3 || r.hasOverride;
}
