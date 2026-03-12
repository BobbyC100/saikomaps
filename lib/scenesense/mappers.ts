/**
 * Mappers: DB/API shape → PlaceForPRL, legacy canonical → CanonicalSceneSense
 */

import type { PlaceForPRL } from './prl';
import type { CanonicalSceneSense } from './voice-engine';

/**
 * Maps raw language signals to canonical energy tokens for the Energy lens.
 * Energy/sensory signals route to energy; role signals route to scene.
 */
const LANGUAGE_SIGNAL_TO_ENERGY: Record<string, 'BUZZY' | 'CHILL' | 'LIVELY' | 'LOW_KEY' | 'CALM' | 'STEADY' | 'ELECTRIC'> = {
  buzzy: 'BUZZY',
  chill: 'CHILL',
  lively: 'LIVELY',
  'low-key': 'LOW_KEY',
  lowkey: 'LOW_KEY',
  calm: 'CALM',
  steady: 'STEADY',
  electric: 'ELECTRIC',
  cozy: 'CHILL',
  intimate: 'CALM',
  energetic: 'LIVELY',
  moody: 'CALM',
  airy: 'CALM',
  'sun-drenched': 'CALM',
};

/** Map our API/DB place shape to PlaceForPRL */
export function mapPlaceToPlaceForPRL(place: {
  name?: string | null;
  address?: string | null;
  latitude?: unknown;
  longitude?: unknown;
  googlePhotos?: unknown;
  hours?: unknown;
  description?: string | null;
  pullQuote?: string | null;
  category?: string | null;
  tagline?: string | null;
  tips?: string[] | null;
  curatorNote?: string | null;
  editorialSources?: unknown;
  prlOverride?: number | null;
  /** From golden_records or place_photo_eval */
  heroApproved?: boolean;
  hasInteriorOrContextApproved?: boolean;
  /** From energy_scores */
  energyScore?: number | null;
  /** From place_tag_scores */
  hasTagSignals?: boolean;
  hasFormality?: boolean;
  /** From identity_signals */
  hasIdentitySignals?: boolean;
  hasTemporalSignals?: boolean;
  /** From map_places / appearsOn */
  appearsOnCount?: number;
  fieldsMembershipCount?: number;
}): PlaceForPRL {
  const googlePhotos = place.googlePhotos;
  const googlePhotosCount = Array.isArray(googlePhotos) ? googlePhotos.length : 0;

  const hasEditorial =
    ((place.editorialSources as Array<unknown> | null)?.length ?? 0) > 0;
  const hasDescription = (place.description?.trim().length ?? 0) >= 40;
  const hasCuratorNote = (place.curatorNote?.trim().length ?? 0) >= 40;
  const hasEnergyOrTags =
    typeof place.energyScore === 'number' || Boolean(place.hasTagSignals);
  const hasPullQuote = !!(place.pullQuote?.trim());
  const hasTagline = !!(place.tagline?.trim());

  return {
    name: place.name,
    category: place.category,
    address_street: place.address,
    lat: typeof place.latitude === 'number' ? place.latitude : (place.latitude != null ? Number(place.latitude) : null),
    lng: typeof place.longitude === 'number' ? place.longitude : (place.longitude != null ? Number(place.longitude) : null),
    lifecycle_status: 'ACTIVE',
    business_status: 'OPERATIONAL',
    hours_json: place.hours,
    googlePhotosCount,
    userPhotosCount: 0,
    heroApproved: place.heroApproved ?? (googlePhotosCount > 0),
    hasInteriorOrContextApproved: place.hasInteriorOrContextApproved ?? false,
    curatorPhotoOverride: false,
    description: place.description,
    curatorNote: place.curatorNote,
    energyScore: place.energyScore ?? null,
    hasTagSignals: place.hasTagSignals ?? hasEnergyOrTags,
    hasFormality: place.hasFormality ?? false,
    hasIdentitySignals: place.hasIdentitySignals ?? false,
    hasTemporalSignals: place.hasTemporalSignals ?? false,
    fieldsMembershipCount: place.fieldsMembershipCount ?? 0,
    appearsOnCount: place.appearsOnCount ?? 0,
    hasCoverageSource: hasEditorial,
  };
}

/** Map language_signals / place_personality / etc. to CanonicalSceneSense */
export function mapToCanonicalSceneSense(input: {
  /** Raw phrases from golden_records.identity_signals.language_signals */
  language_signals?: string[];
  place_personality?: string | null;
  signature_dishes?: string[];
  neighborhood?: string | null;
  category?: string | null;
  /** Optional structured signals from golden_records.identity_signals */
  identitySignals?: {
    formality?: string;
    service_model?: string;
    seating?: string[];
    noise?: string;
    lighting?: string;
    density?: string;
    roles?: string[];
    context?: string[];
  } | null;
}): CanonicalSceneSense {
  const signals = input.language_signals ?? [];
  const energy: Array<'BUZZY' | 'CHILL' | 'LIVELY' | 'LOW_KEY' | 'CALM' | 'STEADY' | 'ELECTRIC'> = [];
  for (const w of signals) {
    const key = w.toLowerCase().replace(/\s+/g, '-');
    const mapped = LANGUAGE_SIGNAL_TO_ENERGY[key];
    if (mapped && !energy.includes(mapped)) energy.push(mapped);
  }
  const p = input.place_personality?.toLowerCase();
  if (p === 'scene' && !energy.includes('LIVELY')) energy.unshift('LIVELY');
  if (p === 'neighborhood-spot' && !energy.includes('LOW_KEY')) energy.unshift('LOW_KEY');
  if (p === 'hidden-gem' && !energy.includes('CHILL')) energy.unshift('CHILL');
  if (p === 'institution' && energy.length === 0) energy.push('STEADY');
  if (energy.length === 0 && signals.length > 0) energy.push('CHILL');

  const id = input.identitySignals;
  const formalityMap: Record<string, 'CASUAL' | 'CASUAL_REFINED' | 'REFINED'> = {
    casual: 'CASUAL',
    'casual-refined': 'CASUAL_REFINED',
    refined: 'REFINED',
  };
  const roleMap: Record<string, 'DATE_FRIENDLY' | 'AFTER_WORK' | 'GROUP_FRIENDLY' | 'SOLO_FRIENDLY'> = {
    'date-friendly': 'DATE_FRIENDLY',
    'after-work': 'AFTER_WORK',
    'group-friendly': 'GROUP_FRIENDLY',
    'solo-friendly': 'SOLO_FRIENDLY',
  };

  return {
    atmosphere: {
      noise: id?.noise ? (id.noise.toUpperCase() as 'LOUD' | 'CONVERSATIONAL' | 'QUIET') : undefined,
      lighting: id?.lighting ? (id.lighting.toUpperCase() as 'DIM' | 'WARM' | 'BRIGHT') : undefined,
      density: id?.density ? (id.density.toUpperCase() as 'TIGHT' | 'AIRY' | 'PACKED') : undefined,
      seating: id?.seating?.map((s) =>
        s === 'bar' ? 'BAR_FORWARD' : s === 'patio' ? 'PATIO_FRIENDLY' : 'COUNTER_FIRST'
      ) as Array<'BAR_FORWARD' | 'PATIO_FRIENDLY' | 'COUNTER_FIRST'> | undefined,
    },
    energy: {
      tokens: energy.length > 0 ? energy : undefined,
    },
    scene:
      input.signature_dishes?.length || input.neighborhood || id?.roles?.length || id?.context?.length || id?.formality
        ? {
            roles: id?.roles?.map((r) => roleMap[r] ?? 'GROUP_FRIENDLY'),
            context: input.neighborhood
              ? ['NEIGHBORHOOD_STAPLE']
              : id?.context?.map((c) => (c === 'destination' ? 'DESTINATION_LEANING' : 'NEIGHBORHOOD_STAPLE')),
            formality: id?.formality ? formalityMap[id.formality] : undefined,
            register: id ? ['RELAXED'] : undefined,
          }
        : undefined,
  };
}
