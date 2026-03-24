/**
 * Entity Page Data Contract — v1
 *
 * Canonical type for the /api/places/[slug] response shape.
 * The API must return exactly this structure — no extra keys, no missing keys.
 *
 * Drift is caught by tests/contracts/entity-page.contract.test.ts.
 */

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export type EntityPageSceneSense = {
  atmosphere: string[];
  energy: string[];
  scene: string[];
};

export type EntityPageOfferingSignals = {
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

export type EntityPageCoverageSource = {
  sourceName: string;
  url: string;
  excerpt: string | null;
  publishedAt: string | null;
};

export type EntityPageCoverageHighlights = {
  sourceCount: number;
  tier1Count: number;
  tier2Count: number;
  people: Array<{ name: string; role: string }>;
  accolades: Array<{ name: string; year: number | null; type: string }>;
  dishes: string[];
  originStory: {
    foundingYear: number | null;
    founderNames: string[];
    geographicOrigin: string | null;
  } | null;
};

export type EntityPageAppearanceAsSubject = {
  id: string;
  hostPlaceId: string | null;
  hostPlace: { id: string; name: string; slug: string } | null;
  latitude: number | null;
  longitude: number | null;
  addressText: string | null;
  scheduleText: string;
  status: string;
};

export type EntityPageAppearanceAsHost = {
  id: string;
  subjectPlaceId: string;
  subjectPlace: { id: string; name: string; slug: string } | null;
  scheduleText: string;
  status: string;
};

export type EntityPageProgramClass = 'food' | 'beverage' | 'events' | 'service';

export type EntityPageProgramEntry = {
  program_class: EntityPageProgramClass;
  maturity: 'none' | 'incidental' | 'considered' | 'dedicated' | 'unknown';
  signals: string[];
};

export type EntityPageOfferingPrograms = {
  food_program: EntityPageProgramEntry;
  wine_program: EntityPageProgramEntry;
  beer_program: EntityPageProgramEntry;
  cocktail_program: EntityPageProgramEntry;
  non_alcoholic_program: EntityPageProgramEntry;
  coffee_tea_program: EntityPageProgramEntry;
  service_program: EntityPageProgramEntry;
  private_dining_program: EntityPageProgramEntry;
  group_dining_program: EntityPageProgramEntry;
  catering_program: EntityPageProgramEntry;
  dumpling_program: EntityPageProgramEntry;
  sushi_raw_fish_program: EntityPageProgramEntry;
  ramen_noodle_program: EntityPageProgramEntry;
  taco_program: EntityPageProgramEntry;
  pizza_program: EntityPageProgramEntry;
};

export type EntityPageTimeFold = {
  class: 'STABILITY' | 'NEWNESS';
  phrase: string;
  approvedBy: string | null;
};

export type EntityPageAppearsOnItem = {
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

export type EntityPageLocation = {
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
  tiktok: string | null;

  // Facts
  hours: unknown | null;
  priceLevel: number | null;
  businessStatus: string | null;
  cuisineType: string | null;
  googlePlaceId: string | null;
  reservationUrl: string | null;
  reservationProvider: string | null; // canonical slug: opentable, resy, tock, sevenrooms, yelp
  reservationProviderLabel: string | null; // display name: "OpenTable", "Resy", etc.
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
  scenesense: EntityPageSceneSense | null;

  // TimeFOLD (temporal signal)
  timefold: EntityPageTimeFold | null;

  // Offering
  offeringSignals: EntityPageOfferingSignals | null;
  offeringPrograms: EntityPageOfferingPrograms | null;

  // Events / hospitality
  eventsUrl: string | null;
  cateringUrl: string | null;
  eventInquiryEmail: string | null;
  eventInquiryFormUrl: string | null;

  // Identity Signals (enrichment)
  placePersonality: string | null;
  signatureDishes: string[];
  keyProducers: string[];
  originStoryType: string | null;

  // Coverage
  coverageSources: EntityPageCoverageSource[];
  coverageHighlights: EntityPageCoverageHighlights | null;

  // Parks-specific (only present when primaryVertical === 'PARKS')
  amenities?: string[];
  parkFacilities?: { id: string; name: string; slug: string; category: string | null }[];
  parentPark?: { id: string; name: string; slug: string };

  // Appearances
  appearancesAsSubject: EntityPageAppearanceAsSubject[];
  appearancesAsHost: EntityPageAppearanceAsHost[];
};

// ---------------------------------------------------------------------------
// Full response data shape (data.* from API)
// ---------------------------------------------------------------------------

export type EntityPageData = {
  location: EntityPageLocation;
  guide: { id: string; title: string; slug: string; creatorName: string } | null;
  appearsOn: EntityPageAppearsOnItem[];
  isOwner: boolean;
};

// ---------------------------------------------------------------------------
// Canonical key list — single source of truth for drift tests
// ---------------------------------------------------------------------------

export const ENTITY_PAGE_LOCATION_KEYS: ReadonlyArray<keyof EntityPageLocation> = [
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
  'tiktok',
  // Facts
  'hours',
  'priceLevel',
  'businessStatus',
  'cuisineType',
  'googlePlaceId',
  'reservationUrl',
  'reservationProvider',
  'reservationProviderLabel',
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
  // TimeFOLD
  'timefold',
  // Offering
  'offeringSignals',
  'offeringPrograms',
  // Events / hospitality
  'eventsUrl',
  'cateringUrl',
  'eventInquiryEmail',
  'eventInquiryFormUrl',
  // Identity Signals (enrichment)
  'placePersonality',
  'signatureDishes',
  'keyProducers',
  'originStoryType',
  // Coverage
  'coverageSources',
  'coverageHighlights',
  // Appearances
  'appearancesAsSubject',
  'appearancesAsHost',
] as const;

export const ENTITY_PAGE_DATA_KEYS: ReadonlyArray<keyof EntityPageData> = [
  'location',
  'guide',
  'appearsOn',
  'isOwner',
] as const;

// ---------------------------------------------------------------------------
// Runtime guard
// ---------------------------------------------------------------------------

export function assertEntityPageData(x: unknown): asserts x is EntityPageData {
  if (typeof x !== 'object' || x === null) {
    throw new Error('EntityPageData: expected object');
  }

  const d = x as Record<string, unknown>;

  // Top-level keys
  for (const key of ENTITY_PAGE_DATA_KEYS) {
    if (!(key in d)) {
      throw new Error(`EntityPageData: missing required key "${key}"`);
    }
  }

  if (typeof d.location !== 'object' || d.location === null) {
    throw new Error('EntityPageData: location must be an object');
  }

  const loc = d.location as Record<string, unknown>;

  // Required location keys
  for (const key of ENTITY_PAGE_LOCATION_KEYS) {
    if (!(key in loc)) {
      throw new Error(`EntityPageData.location: missing required key "${key}"`);
    }
  }

  // Array invariants
  if (!Array.isArray(loc.tips)) {
    throw new Error('EntityPageData.location.tips must be an array');
  }
  if (!Array.isArray(loc.photoUrls)) {
    throw new Error('EntityPageData.location.photoUrls must be an array');
  }
  if (!Array.isArray(loc.signatureDishes)) {
    throw new Error('EntityPageData.location.signatureDishes must be an array');
  }
  if (!Array.isArray(loc.keyProducers)) {
    throw new Error('EntityPageData.location.keyProducers must be an array');
  }
  if (!Array.isArray(loc.coverageSources)) {
    throw new Error('EntityPageData.location.coverageSources must be an array');
  }
  if (!Array.isArray(loc.appearancesAsSubject)) {
    throw new Error('EntityPageData.location.appearancesAsSubject must be an array');
  }
  if (!Array.isArray(loc.appearancesAsHost)) {
    throw new Error('EntityPageData.location.appearancesAsHost must be an array');
  }
  if (!Array.isArray(d.appearsOn)) {
    throw new Error('EntityPageData.appearsOn must be an array');
  }

  // prl must be a number
  if (typeof loc.prl !== 'number') {
    throw new Error('EntityPageData.location.prl must be a number');
  }
}
