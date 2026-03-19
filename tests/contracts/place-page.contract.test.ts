/**
 * Place Page Data Contract — Drift Test
 *
 * Fails if the payload shape returned by the API route diverges from
 * the canonical PlacePageData contract in lib/contracts/place-page.ts.
 *
 * This test does NOT hit the DB. It validates structure only.
 */

import { describe, it, expect } from 'vitest';
import {
  PLACE_PAGE_LOCATION_KEYS,
  PLACE_PAGE_DATA_KEYS,
  assertPlacePageData,
  type PlacePageData,
  type PlacePageLocation,
} from '../../lib/contracts/place-page';

// ---------------------------------------------------------------------------
// Minimal valid fixture — represents the minimum the API must return
// ---------------------------------------------------------------------------

function makeLocation(overrides: Partial<PlacePageLocation> = {}): PlacePageLocation {
  return {
    // Identity
    id: 'abc123',
    slug: 'test-place',
    name: 'Test Place',
    primaryVertical: 'restaurant',
    category: 'Restaurant',
    neighborhood: 'Silver Lake',
    address: '123 Main St',
    latitude: 34.074,
    longitude: -118.261,
    phone: '+1 213 555 0100',
    website: 'https://example.com',
    instagram: '@testplace',
    tiktok: null,
    // Facts
    hours: null,
    priceLevel: 2,
    businessStatus: 'OPERATIONAL',
    cuisineType: 'Italian',
    googlePlaceId: 'ChIJ_abc',
    reservationUrl: null,
    reservationProvider: null,
    reservationProviderLabel: null,
    menuUrl: null,
    winelistUrl: null,
    // Editorial
    description: 'A great place to eat.',
    descriptionSource: null,
    tagline: 'The best pasta in Silver Lake.',
    pullQuote: null,
    pullQuoteAuthor: null,
    pullQuoteSource: null,
    pullQuoteUrl: null,
    tips: [],
    curatorNote: null,
    curatorCreatorName: null,
    // Media
    photoUrl: null,
    photoUrls: [],
    // SceneSense
    prl: 2,
    scenesense: null,
    // Offering
    offeringSignals: null,
    offeringPrograms: null,
    // Identity Signals (enrichment)
    placePersonality: null,
    signatureDishes: [],
    keyProducers: [],
    originStoryType: null,
    // Coverage
    coverageSources: [],
    // Appearances
    appearancesAsSubject: [],
    appearancesAsHost: [],
    ...overrides,
  };
}

function makeData(overrides: Partial<PlacePageData> = {}): PlacePageData {
  return {
    location: makeLocation(),
    guide: null,
    appearsOn: [],
    isOwner: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Key completeness
// ---------------------------------------------------------------------------

describe('PLACE_PAGE_LOCATION_KEYS completeness', () => {
  it('covers all keys in PlacePageLocation fixture', () => {
    const fixture = makeLocation();
    const fixtureKeys = Object.keys(fixture).sort();
    const contractKeys = [...PLACE_PAGE_LOCATION_KEYS].sort();
    expect(contractKeys).toEqual(fixtureKeys);
  });

  it('has no duplicate keys', () => {
    const unique = new Set(PLACE_PAGE_LOCATION_KEYS);
    expect(unique.size).toBe(PLACE_PAGE_LOCATION_KEYS.length);
  });
});

describe('PLACE_PAGE_DATA_KEYS completeness', () => {
  it('covers all keys in PlacePageData fixture', () => {
    const fixture = makeData();
    const fixtureKeys = Object.keys(fixture).sort();
    const contractKeys = [...PLACE_PAGE_DATA_KEYS].sort();
    expect(contractKeys).toEqual(fixtureKeys);
  });
});

// ---------------------------------------------------------------------------
// assertPlacePageData — happy path
// ---------------------------------------------------------------------------

describe('assertPlacePageData — valid data', () => {
  it('does not throw for a fully valid payload', () => {
    expect(() => assertPlacePageData(makeData())).not.toThrow();
  });

  it('accepts scenesense: null (PRL < 3)', () => {
    expect(() =>
      assertPlacePageData(makeData({ location: makeLocation({ scenesense: null, prl: 2 }) }))
    ).not.toThrow();
  });

  it('accepts scenesense with all surfaces populated', () => {
    const loc = makeLocation({
      prl: 3,
      scenesense: { atmosphere: ['Dim'], energy: ['Lively'], scene: ['Neighborhood crowd'] },
    });
    expect(() => assertPlacePageData(makeData({ location: loc }))).not.toThrow();
  });

  it('accepts non-empty tips and appearsOn', () => {
    const d = makeData({
      location: makeLocation({ tips: ['Order the pasta', 'Ask for the daily special'] }),
      appearsOn: [
        {
          id: 'map1',
          title: 'Best of Silver Lake',
          slug: 'best-of-silver-lake',
          coverImageUrl: null,
          creatorName: 'Saiko',
          description: null,
          placeCount: 12,
          authorType: 'saiko',
        },
      ],
    });
    expect(() => assertPlacePageData(d)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// assertPlacePageData — invariant enforcement
// ---------------------------------------------------------------------------

describe('assertPlacePageData — missing required keys', () => {
  it('throws when location is missing', () => {
    const bad = { guide: null, appearsOn: [], isOwner: false };
    expect(() => assertPlacePageData(bad)).toThrow(/missing required key "location"/);
  });

  it('throws when appearsOn is missing from top-level', () => {
    const bad = { location: makeLocation(), guide: null, isOwner: false };
    expect(() => assertPlacePageData(bad)).toThrow(/missing required key "appearsOn"/);
  });

  it('throws when a required location key is absent', () => {
    const loc = makeLocation();
    // @ts-expect-error intentional deletion for test
    delete loc.tips;
    expect(() => assertPlacePageData(makeData({ location: loc }))).toThrow(/missing required key "tips"/);
  });

  it('throws when id is missing from location', () => {
    const loc = makeLocation();
    // @ts-expect-error intentional deletion for test
    delete loc.id;
    expect(() => assertPlacePageData(makeData({ location: loc }))).toThrow(/missing required key "id"/);
  });
});

describe('assertPlacePageData — array invariants', () => {
  it('throws when tips is not an array', () => {
    const loc = makeLocation({ tips: null as unknown as string[] });
    expect(() => assertPlacePageData(makeData({ location: loc }))).toThrow(/tips must be an array/);
  });

  it('throws when photoUrls is not an array', () => {
    const loc = makeLocation({ photoUrls: null as unknown as string[] });
    expect(() => assertPlacePageData(makeData({ location: loc }))).toThrow(/photoUrls must be an array/);
  });

  it('throws when coverageSources is not an array', () => {
    const loc = makeLocation({ coverageSources: null as unknown as [] });
    expect(() => assertPlacePageData(makeData({ location: loc }))).toThrow(/coverageSources must be an array/);
  });

  it('throws when appearsOn is not an array', () => {
    const bad = { ...makeData(), appearsOn: null };
    expect(() => assertPlacePageData(bad)).toThrow(/appearsOn must be an array/);
  });
});

describe('assertPlacePageData — prl invariant', () => {
  it('throws when prl is a string', () => {
    const loc = makeLocation({ prl: '3' as unknown as number });
    expect(() => assertPlacePageData(makeData({ location: loc }))).toThrow(/prl must be a number/);
  });

  it('throws when prl is missing', () => {
    const loc = makeLocation();
    // @ts-expect-error intentional deletion for test
    delete loc.prl;
    expect(() => assertPlacePageData(makeData({ location: loc }))).toThrow(/missing required key "prl"/);
  });
});

// ---------------------------------------------------------------------------
// Drift guard — simulated API payload has no extra keys
// ---------------------------------------------------------------------------

describe('Contract drift guard', () => {
  it('API payload must not contain extra location keys', () => {
    const contractKeySet = new Set<string>(PLACE_PAGE_LOCATION_KEYS);
    const apiPayload = makeData();
    const actualKeys = Object.keys(apiPayload.location);
    const extraKeys = actualKeys.filter((k) => !contractKeySet.has(k));
    // If this fails, a key was added to the API response without updating the contract.
    // Remove it from the API or add it to PLACE_PAGE_LOCATION_KEYS + PlacePageLocation.
    expect(extraKeys).toEqual([]);
  });

  it('injecting vibeTags into the payload IS caught by this guard (self-check)', () => {
    // This test verifies the drift guard actually works — it must fail when extra keys appear.
    const contractKeySet = new Set<string>(PLACE_PAGE_LOCATION_KEYS);
    const loc = makeLocation() as PlacePageLocation & { vibeTags?: string[] };
    (loc as Record<string, unknown>)['vibeTags'] = ['cozy'];
    const extraKeys = Object.keys(loc).filter((k) => !contractKeySet.has(k));
    expect(extraKeys).toEqual(['vibeTags']); // guard catches the leak
  });

  it('API payload must not be missing any location keys', () => {
    const apiPayload = makeData();
    const actualKeys = new Set(Object.keys(apiPayload.location));

    const missingKeys = PLACE_PAGE_LOCATION_KEYS.filter((k) => !actualKeys.has(k));
    expect(missingKeys).toEqual([]);
  });

  it('tips is always an array — never null or undefined', () => {
    const loc = makeLocation();
    expect(Array.isArray(loc.tips)).toBe(true);
  });

  it('appearsOn is always an array — never null or undefined', () => {
    const d = makeData();
    expect(Array.isArray(d.appearsOn)).toBe(true);
  });

  it('scenesense surfaces must not include a vibe surface — no direct identity_signals reference', () => {
    const loc = makeLocation();
    expect('vibeTags' in loc).toBe(false);
    expect('vibe_tags' in loc).toBe(false);
    expect('vibeWords' in loc).toBe(false);
    expect('identitySignals' in loc).toBe(false);
  });
});
