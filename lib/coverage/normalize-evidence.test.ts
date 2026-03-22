/**
 * Unit tests for Coverage Evidence Normalizer
 *
 * Tests pure logic functions without database access.
 * Uses the test-visible exports (prefixed with _) from normalize-evidence.ts.
 */

import { describe, it, expect } from 'vitest';
import {
  _computeStalenessBand as computeStalenessBand,
  _computeTrustTier as computeTrustTier,
  _countOccurrences as countOccurrences,
  _normalizePeople as normalizePeople,
  _normalizeAccolades as normalizeAccolades,
  _normalizePullQuotes as normalizePullQuotes,
  _normalizeOriginStoryFacts as normalizeOriginStoryFacts,
  _normalizeOriginStoryInterpretation as normalizeOriginStoryInterpretation,
  _normalizeFood as normalizeFood,
  _normalizeBeverage as normalizeBeverage,
  _normalizeAtmosphere as normalizeAtmosphere,
  _normalizeSentiment as normalizeSentiment,
  _materializeProvenance as materializeProvenance,
  type _RawExtractionRow as RawExtractionRow,
} from './normalize-evidence';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<RawExtractionRow> = {}): RawExtractionRow {
  return {
    id: 'ext-1',
    coverageSourceId: 'cs-1',
    entityId: 'ent-1',
    extractionVersion: 'coverage-extract-v2',
    extractedAt: new Date('2026-01-15'),
    isCurrent: true,
    people: null,
    foodEvidence: null,
    beverageEvidence: null,
    serviceEvidence: null,
    atmosphereSignals: null,
    originStory: null,
    accolades: null,
    pullQuotes: null,
    sentiment: null,
    articleType: null,
    relevanceScore: 0.8,
    coverageSource: {
      id: 'cs-1',
      url: 'https://example.com/article',
      publicationName: 'Eater LA',
      articleTitle: 'Best New Restaurants',
      publishedAt: new Date('2025-09-01'),
      sourceType: 'ARTICLE',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeStalenessBand
// ---------------------------------------------------------------------------

describe('computeStalenessBand', () => {
  const now = new Date('2026-03-22');

  it('returns "current" for sources < 12 months old', () => {
    expect(computeStalenessBand(new Date('2025-06-01'), now)).toBe('current');
    expect(computeStalenessBand(new Date('2025-12-01'), now)).toBe('current');
  });

  it('returns "aging" for sources 12–24 months old', () => {
    expect(computeStalenessBand(new Date('2024-06-01'), now)).toBe('aging');
    expect(computeStalenessBand(new Date('2024-10-01'), now)).toBe('aging');
  });

  it('returns "stale" for sources > 24 months old', () => {
    expect(computeStalenessBand(new Date('2023-01-01'), now)).toBe('stale');
    expect(computeStalenessBand(new Date('2022-01-01'), now)).toBe('stale');
  });

  it('returns "stale" when publishedAt is null (weak confidence)', () => {
    expect(computeStalenessBand(null, now)).toBe('stale');
  });
});

// ---------------------------------------------------------------------------
// computeTrustTier
// ---------------------------------------------------------------------------

describe('computeTrustTier', () => {
  it('returns tier 1 for known tier-1 publications', () => {
    expect(computeTrustTier('Eater LA')).toBe(1);
    expect(computeTrustTier('Los Angeles Times')).toBe(1);
    expect(computeTrustTier('Bon Appétit')).toBe(1);
    expect(computeTrustTier('The Infatuation')).toBe(1);
  });

  it('returns tier 2 for known tier-2 publications', () => {
    expect(computeTrustTier('Thrillist')).toBe(2);
    expect(computeTrustTier('LA Weekly')).toBe(2);
    expect(computeTrustTier('Los Angeles Magazine')).toBe(2);
  });

  it('returns tier 3 for unknown publications', () => {
    expect(computeTrustTier('Random Blog')).toBe(3);
    expect(computeTrustTier('SomeonesFoodBlog.com')).toBe(3);
  });

  it('is case-insensitive', () => {
    expect(computeTrustTier('EATER LA')).toBe(1);
    expect(computeTrustTier('eater la')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// countOccurrences
// ---------------------------------------------------------------------------

describe('countOccurrences', () => {
  it('counts and sorts by frequency descending', () => {
    const result = countOccurrences(['a', 'b', 'a', 'c', 'a', 'b']);
    expect(result[0]).toEqual({ value: 'a', count: 3 });
    expect(result[1]).toEqual({ value: 'b', count: 2 });
    expect(result[2]).toEqual({ value: 'c', count: 1 });
  });

  it('is case-insensitive', () => {
    const result = countOccurrences(['Japanese', 'japanese', 'JAPANESE']);
    expect(result).toEqual([{ value: 'japanese', count: 3 }]);
  });

  it('handles empty array', () => {
    expect(countOccurrences([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// normalizePeople
// ---------------------------------------------------------------------------

describe('normalizePeople', () => {
  const now = new Date('2026-03-22');

  it('merges same person across multiple sources', () => {
    const rows = [
      makeRow({
        people: [{ name: 'Ray Garcia', role: 'chef', context: 'runs the kitchen', isPrimary: true }],
        coverageSource: { ...makeRow().coverageSource, publicationName: 'Eater LA', publishedAt: new Date('2025-09-01') },
      }),
      makeRow({
        id: 'ext-2',
        coverageSourceId: 'cs-2',
        people: [{ name: 'Ray Garcia', role: 'chef', context: 'executive chef', isPrimary: false }],
        coverageSource: { ...makeRow().coverageSource, id: 'cs-2', publicationName: 'LA Times', publishedAt: new Date('2025-06-01') },
      }),
    ];

    const result = normalizePeople(rows, now);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Ray Garcia');
    expect(result[0].sourceCount).toBe(2);
    expect(result[0].isPrimary).toBe(true); // any source marking primary = primary
    expect(result[0].mostRecentSource).toBe('Eater LA');
    expect(result[0].stalenessBand).toBe('current');
  });

  it('separates people with different roles', () => {
    const rows = [
      makeRow({
        people: [
          { name: 'John Doe', role: 'chef', context: '', isPrimary: true },
          { name: 'John Doe', role: 'owner', context: '', isPrimary: false },
        ],
      }),
    ];

    const result = normalizePeople(rows, now);
    expect(result).toHaveLength(2);
  });

  it('assigns correct staleness bands', () => {
    const rows = [
      makeRow({
        people: [{ name: 'Old Chef', role: 'chef', context: '' }],
        coverageSource: { ...makeRow().coverageSource, publishedAt: new Date('2023-01-01') },
      }),
    ];

    const result = normalizePeople(rows, now);
    expect(result[0].stalenessBand).toBe('stale');
  });

  it('returns empty array when no people extracted', () => {
    const rows = [makeRow({ people: null })];
    expect(normalizePeople(rows, now)).toEqual([]);
  });

  it('sorts primary before non-primary, current before stale', () => {
    const rows = [
      makeRow({
        people: [
          { name: 'Stale Chef', role: 'chef', context: '', isPrimary: true },
        ],
        coverageSource: { ...makeRow().coverageSource, publishedAt: new Date('2022-01-01') },
      }),
      makeRow({
        id: 'ext-2',
        coverageSourceId: 'cs-2',
        people: [
          { name: 'Current Sommelier', role: 'sommelier', context: '', isPrimary: false },
        ],
        coverageSource: { ...makeRow().coverageSource, id: 'cs-2', publishedAt: new Date('2026-01-01') },
      }),
    ];

    const result = normalizePeople(rows, now);
    expect(result).toHaveLength(2);
    // Primary comes first despite being stale
    expect(result[0].name).toBe('Stale Chef');
    expect(result[1].name).toBe('Current Sommelier');
  });
});

// ---------------------------------------------------------------------------
// normalizeAccolades
// ---------------------------------------------------------------------------

describe('normalizeAccolades', () => {
  it('deduplicates by name+year', () => {
    const rows = [
      makeRow({
        accolades: [
          { name: 'Eater 38', source: 'Eater LA', year: 2025, type: 'list' },
        ],
      }),
      makeRow({
        id: 'ext-2',
        accolades: [
          { name: 'Eater 38', source: 'Eater', year: 2025, type: 'list' },
        ],
      }),
    ];

    const result = normalizeAccolades(rows);
    expect(result).toHaveLength(1);
    expect(result[0].sourceCount).toBe(2);
  });

  it('keeps different years as separate entries', () => {
    const rows = [
      makeRow({
        accolades: [
          { name: 'Best New Restaurant', year: 2024, type: 'award' },
          { name: 'Best New Restaurant', year: 2025, type: 'award' },
        ],
      }),
    ];

    const result = normalizeAccolades(rows);
    expect(result).toHaveLength(2);
    // Most recent year first
    expect(result[0].year).toBe(2025);
    expect(result[1].year).toBe(2024);
  });
});

// ---------------------------------------------------------------------------
// normalizePullQuotes
// ---------------------------------------------------------------------------

describe('normalizePullQuotes', () => {
  it('deduplicates by first 60 chars', () => {
    const rows = [
      makeRow({
        pullQuotes: [{ text: 'This is a great restaurant with amazing food and vibes.', context: '' }],
        relevanceScore: 0.9,
      }),
      makeRow({
        id: 'ext-2',
        pullQuotes: [{ text: 'This is a great restaurant with amazing food and vibes. Also try the wine.', context: '' }],
        relevanceScore: 0.7,
      }),
    ];

    const result = normalizePullQuotes(rows);
    // Both share the same first 60 chars, so only one should appear
    expect(result).toHaveLength(1);
    expect(result[0].relevanceScore).toBe(0.9); // higher relevance kept
  });

  it('preserves source metadata', () => {
    const rows = [
      makeRow({
        pullQuotes: [{ text: 'Incredible omakase experience.', context: 'on the food' }],
        coverageSource: {
          ...makeRow().coverageSource,
          publicationName: 'LA Times',
          articleTitle: 'Review: Seco',
          publishedAt: new Date('2025-08-15'),
        },
      }),
    ];

    const result = normalizePullQuotes(rows);
    expect(result[0].publication).toBe('LA Times');
    expect(result[0].articleTitle).toBe('Review: Seco');
  });
});

// ---------------------------------------------------------------------------
// normalizeOriginStoryFacts
// ---------------------------------------------------------------------------

describe('normalizeOriginStoryFacts', () => {
  it('extracts founding year from origin story', () => {
    const rows = [
      makeRow({
        originStory: { type: 'chef-journey', narrative: 'Opened in 2018', foundingDate: '2018' },
      }),
    ];

    const result = normalizeOriginStoryFacts(rows);
    expect(result).not.toBeNull();
    expect(result!.foundingYear).toBe('2018');
  });

  it('extracts founder names from people with founder/owner role', () => {
    const rows = [
      makeRow({
        originStory: { type: 'family-legacy', narrative: 'Family roots' },
        people: [
          { name: 'Maria Garcia', role: 'founder', context: 'founded the restaurant' },
          { name: 'Carlos Garcia', role: 'owner', context: 'co-owner' },
          { name: 'Alex Smith', role: 'chef', context: 'head chef' },
        ],
      }),
    ];

    const result = normalizeOriginStoryFacts(rows);
    expect(result!.founderNames).toContain('Maria Garcia');
    expect(result!.founderNames).toContain('Carlos Garcia');
    expect(result!.founderNames).not.toContain('Alex Smith');
  });

  it('returns null when no origin stories exist', () => {
    const rows = [makeRow({ originStory: null })];
    expect(normalizeOriginStoryFacts(rows)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// normalizeOriginStoryInterpretation
// ---------------------------------------------------------------------------

describe('normalizeOriginStoryInterpretation', () => {
  it('determines consensus when all sources agree', () => {
    const rows = [
      makeRow({ originStory: { type: 'chef-journey', narrative: 'Story 1' } }),
      makeRow({ id: 'ext-2', originStory: { type: 'chef-journey', narrative: 'Story 2' } }),
    ];

    const result = normalizeOriginStoryInterpretation(rows);
    expect(result!.archetype).toBe('chef-journey');
    expect(result!.consensus).toBe('unanimous');
    expect(result!.labels).toContain('chef-driven');
  });

  it('marks conflicting when sources disagree evenly', () => {
    const rows = [
      makeRow({ originStory: { type: 'chef-journey', narrative: '' } }),
      makeRow({ id: 'ext-2', originStory: { type: 'family-legacy', narrative: '' } }),
    ];

    const result = normalizeOriginStoryInterpretation(rows);
    expect(result!.consensus).toBe('conflicting');
  });

  it('marks majority when one type has > 50%', () => {
    const rows = [
      makeRow({ originStory: { type: 'chef-journey', narrative: '' } }),
      makeRow({ id: 'ext-2', originStory: { type: 'chef-journey', narrative: '' } }),
      makeRow({ id: 'ext-3', originStory: { type: 'family-legacy', narrative: '' } }),
    ];

    const result = normalizeOriginStoryInterpretation(rows);
    expect(result!.consensus).toBe('majority');
    expect(result!.archetype).toBe('chef-journey');
  });
});

// ---------------------------------------------------------------------------
// normalizeFood
// ---------------------------------------------------------------------------

describe('normalizeFood', () => {
  it('picks majority cuisine posture with agreement score', () => {
    const rows = [
      makeRow({ foodEvidence: { cuisinePosture: 'Japanese', dishes: [], rawMentions: [] } }),
      makeRow({ id: 'ext-2', foodEvidence: { cuisinePosture: 'Japanese', dishes: [], rawMentions: [] } }),
      makeRow({ id: 'ext-3', foodEvidence: { cuisinePosture: 'Korean', dishes: [], rawMentions: [] } }),
    ];

    const result = normalizeFood(rows);
    expect(result.cuisinePosture).toBe('japanese');
    expect(result.cuisinePostureAgreement).toBeCloseTo(0.67, 1);
  });

  it('unions cooking approaches across sources', () => {
    const rows = [
      makeRow({ foodEvidence: { cookingApproach: ['wood-fired', 'fermentation'], dishes: [], rawMentions: [] } }),
      makeRow({ id: 'ext-2', foodEvidence: { cookingApproach: ['wood-fired', 'open-flame'], dishes: [], rawMentions: [] } }),
    ];

    const result = normalizeFood(rows);
    expect(result.cookingApproaches).toContain('wood-fired');
    expect(result.cookingApproaches).toContain('fermentation');
    expect(result.cookingApproaches).toContain('open-flame');
  });

  it('detects specialty signals from any source', () => {
    const rows = [
      makeRow({
        foodEvidence: {
          specialtySignals: { sushi: { mentioned: true, signals: [] } },
          dishes: [],
          rawMentions: [],
        },
      }),
      makeRow({
        id: 'ext-2',
        foodEvidence: {
          specialtySignals: { ramen: { mentioned: true, signals: [] } },
          dishes: [],
          rawMentions: [],
        },
      }),
    ];

    const result = normalizeFood(rows);
    expect(result.specialtySignals.sushi).toBe(true);
    expect(result.specialtySignals.ramen).toBe(true);
    expect(result.specialtySignals.pizza).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeAtmosphere
// ---------------------------------------------------------------------------

describe('normalizeAtmosphere', () => {
  it('unions descriptors across sources', () => {
    const rows = [
      makeRow({ atmosphereSignals: { descriptors: ['intimate', 'cozy'] } }),
      makeRow({ id: 'ext-2', atmosphereSignals: { descriptors: ['cozy', 'dimly-lit'] } }),
    ];

    const result = normalizeAtmosphere(rows);
    expect(result.descriptors).toHaveLength(3);
    expect(result.descriptors).toContain('intimate');
    expect(result.descriptors).toContain('cozy');
    expect(result.descriptors).toContain('dimly-lit');
  });

  it('picks majority energy level', () => {
    const rows = [
      makeRow({ atmosphereSignals: { energyLevel: 'lively' } }),
      makeRow({ id: 'ext-2', atmosphereSignals: { energyLevel: 'lively' } }),
      makeRow({ id: 'ext-3', atmosphereSignals: { energyLevel: 'quiet' } }),
    ];

    const result = normalizeAtmosphere(rows);
    expect(result.energyLevel).toBe('lively');
  });
});

// ---------------------------------------------------------------------------
// normalizeSentiment
// ---------------------------------------------------------------------------

describe('normalizeSentiment', () => {
  it('computes dominant sentiment by count', () => {
    const rows = [
      makeRow({ sentiment: 'POSITIVE' }),
      makeRow({ id: 'ext-2', sentiment: 'POSITIVE' }),
      makeRow({ id: 'ext-3', sentiment: 'MIXED' }),
    ];

    const result = normalizeSentiment(rows);
    expect(result.dominant).toBe('POSITIVE');
    expect(result.distribution.POSITIVE).toBe(2);
    expect(result.distribution.MIXED).toBe(1);
  });

  it('handles all neutral', () => {
    const rows = [
      makeRow({ sentiment: 'NEUTRAL' }),
      makeRow({ id: 'ext-2', sentiment: 'NEUTRAL' }),
    ];

    const result = normalizeSentiment(rows);
    expect(result.dominant).toBe('NEUTRAL');
  });
});

// ---------------------------------------------------------------------------
// materializeProvenance
// ---------------------------------------------------------------------------

describe('materializeProvenance', () => {
  it('computes tier counts and date ranges', () => {
    const rows = [
      makeRow({
        coverageSource: {
          ...makeRow().coverageSource,
          publicationName: 'Eater LA',
          publishedAt: new Date('2025-09-01'),
        },
        relevanceScore: 0.9,
      }),
      makeRow({
        id: 'ext-2',
        coverageSourceId: 'cs-2',
        coverageSource: {
          ...makeRow().coverageSource,
          id: 'cs-2',
          publicationName: 'Random Blog',
          publishedAt: new Date('2025-03-01'),
        },
        relevanceScore: 0.5,
      }),
    ];

    const result = materializeProvenance(rows);
    expect(result.totalSources).toBe(2);
    expect(result.tier1Sources).toBe(1);
    expect(result.tier3Sources).toBe(1);
    expect(result.oldestSource).toEqual(new Date('2025-03-01'));
    expect(result.newestSource).toEqual(new Date('2025-09-01'));
  });
});
