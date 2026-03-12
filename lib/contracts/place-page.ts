/**
 * Place Page Data Contract — v1
 *
 * Canonical type for the /api/places/[slug] response shape.
 * The API must return exactly this structure — no extra keys, no missing keys.
 *
 * Drift is caught by tests/contracts/place-page.contract.test.ts.
 */

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export type PlacePageSceneSense = {
  atmosphere: string[];
  energy: string[];
  scene: string[];
};

export type PlacePageOfferingSignals = {
  servesBeer: boolean | null;
  servesWine: boolean | null;
  servesVegetarianFood: boolean | null;
  servesLunch: boolean | null;
  servesDinner: boolean | null;
  servesCocktails: boolean | null;
  cuisinePosture: string | null;
  serviceModel: string | null;
  priceTier: string | null;
  wineProgramIntent: string | null;
};

export type PlacePageCoverageSource = {
  sourceName: string;
  url: string;
  excerpt: string | null;
  publishedAt: string | null;
};

export type PlacePageAppearanceAsSubject = {
  id: string;
  hostPlaceId: string | null;
  hostPlace: { id: string; name: string; slug: string } | null;
  latitude: number | null;
  longitude: number | null;
  addressText: string | null;
  scheduleText: string;
  status: string;
};

export type PlacePageAppearanceAsHost = {
  id: string;
  subjectPlaceId: string;
  subjectPlace: { id: string; name: string; slug: string } | null;
  scheduleText: string;
  status: string;
};

export type PlacePageProgramEntry = {
  maturity: 'none' | 'incidental' | 'considered' | 'dedicated' | 'unknown';
  signals: string[];
};

export type PlacePageOfferingPrograms = {
  food_program: PlacePageProgramEntry;
  wine_program: PlacePageProgramEntry;
  beer_program: PlacePageProgramEntry;
  cocktail_program: PlacePageProgramEntry;
  non_alcoholic_program: PlacePageProgramEntry;
  coffee_tea_program: PlacePageProgramEntry;
  service_program: PlacePageProgramEntry;
};

export type PlacePageAppearsOnItem = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  creatorName: string | null;
  description: string | null;
  placeCount: number;
  authorType: 'saiko' | 'user';
};

// ---------------------------------------------------------------------------
// Primary location type
// ---------------------------------------------------------------------------

export type PlacePageLocation = {
  // Identity
  id: string;
  slug: string;
  name: string;
  primaryVertical: string | null;
  category: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;

  // Facts
  hours: unknown | null;
  priceLevel: number | null;
  businessStatus: string | null;
  cuisineType: string | null;
  googlePlaceId: string | null;
  reservationUrl: string | null;
  menuUrl: string | null;
  winelistUrl: string | null;

  // Editorial
  description: string | null;
  descriptionSource: string | null;
  tagline: string | null;
  pullQuote: string | null;
  pullQuoteAuthor: string | null;
  pullQuoteSource: string | null;
  pullQuoteUrl: string | null;
  tips: string[];
  curatorNote: string | null;
  curatorCreatorName: string | null;

  // Media
  photoUrl: string | null;
  photoUrls: string[];

  // SceneSense
  prl: number;
  scenesense: PlacePageSceneSense | null;

  // Offering
  offeringSignals: PlacePageOfferingSignals | null;
  offeringPrograms: PlacePageOfferingPrograms | null;

  // Identity Signals (enrichment)
  placePersonality: string | null;
  signatureDishes: string[];

  // Coverage
  coverageSources: PlacePageCoverageSource[];

  // Appearances
  appearancesAsSubject: PlacePageAppearanceAsSubject[];
  appearancesAsHost: PlacePageAppearanceAsHost[];
};

// ---------------------------------------------------------------------------
// Full response data shape (data.* from API)
// ---------------------------------------------------------------------------

export type PlacePageData = {
  location: PlacePageLocation;
  guide: { id: string; title: string; slug: string; creatorName: string } | null;
  appearsOn: PlacePageAppearsOnItem[];
  isOwner: boolean;
};

// ---------------------------------------------------------------------------
// Canonical key list — single source of truth for drift tests
// ---------------------------------------------------------------------------

export const PLACE_PAGE_LOCATION_KEYS: ReadonlyArray<keyof PlacePageLocation> = [
  // Identity
  'id',
  'slug',
  'name',
  'primaryVertical',
  'category',
  'neighborhood',
  'address',
  'latitude',
  'longitude',
  'phone',
  'website',
  'instagram',
  // Facts
  'hours',
  'priceLevel',
  'businessStatus',
  'cuisineType',
  'googlePlaceId',
  'reservationUrl',
  'menuUrl',
  'winelistUrl',
  // Editorial
  'description',
  'descriptionSource',
  'tagline',
  'pullQuote',
  'pullQuoteAuthor',
  'pullQuoteSource',
  'pullQuoteUrl',
  'tips',
  'curatorNote',
  'curatorCreatorName',
  // Media
  'photoUrl',
  'photoUrls',
  // SceneSense
  'prl',
  'scenesense',
  // Offering
  'offeringSignals',
  'offeringPrograms',
  // Identity Signals (enrichment)
  'placePersonality',
  'signatureDishes',
  // Coverage
  'coverageSources',
  // Appearances
  'appearancesAsSubject',
  'appearancesAsHost',
] as const;

export const PLACE_PAGE_DATA_KEYS: ReadonlyArray<keyof PlacePageData> = [
  'location',
  'guide',
  'appearsOn',
  'isOwner',
] as const;

// ---------------------------------------------------------------------------
// Runtime guard
// ---------------------------------------------------------------------------

export function assertPlacePageData(x: unknown): asserts x is PlacePageData {
  if (typeof x !== 'object' || x === null) {
    throw new Error('PlacePageData: expected object');
  }

  const d = x as Record<string, unknown>;

  // Top-level keys
  for (const key of PLACE_PAGE_DATA_KEYS) {
    if (!(key in d)) {
      throw new Error(`PlacePageData: missing required key "${key}"`);
    }
  }

  if (typeof d.location !== 'object' || d.location === null) {
    throw new Error('PlacePageData: location must be an object');
  }

  const loc = d.location as Record<string, unknown>;

  // Required location keys
  for (const key of PLACE_PAGE_LOCATION_KEYS) {
    if (!(key in loc)) {
      throw new Error(`PlacePageData.location: missing required key "${key}"`);
    }
  }

  // Array invariants
  if (!Array.isArray(loc.tips)) {
    throw new Error('PlacePageData.location.tips must be an array');
  }
  if (!Array.isArray(loc.photoUrls)) {
    throw new Error('PlacePageData.location.photoUrls must be an array');
  }
  if (!Array.isArray(loc.signatureDishes)) {
    throw new Error('PlacePageData.location.signatureDishes must be an array');
  }
  if (!Array.isArray(loc.coverageSources)) {
    throw new Error('PlacePageData.location.coverageSources must be an array');
  }
  if (!Array.isArray(loc.appearancesAsSubject)) {
    throw new Error('PlacePageData.location.appearancesAsSubject must be an array');
  }
  if (!Array.isArray(loc.appearancesAsHost)) {
    throw new Error('PlacePageData.location.appearancesAsHost must be an array');
  }
  if (!Array.isArray(d.appearsOn)) {
    throw new Error('PlacePageData.appearsOn must be an array');
  }

  // prl must be a number
  if (typeof loc.prl !== 'number') {
    throw new Error('PlacePageData.location.prl must be a number');
  }
}
