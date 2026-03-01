/**
 * Confidence System v1 — unit tests.
 * Agreement boost, conflict penalty, clamp, missing field in overall.
 */

import { describe, it, expect } from 'vitest';
import { CONFIDENCE_CONFIG } from './confidence-config';
import {
  calculateFieldConfidence,
  calculateOverallConfidence,
  buildFieldConfidenceEntry,
  computePlaceConfidence,
  normalizeName,
  normalizeAddress,
  normalizePhone,
  normalizeWebsite,
  normalizeHours,
  normalizeSourceId,
  type ConfidenceMap,
} from './confidence';

const trustTiers: Record<string, number> = {
  google_places: 0.85,
  michelin: 0.9,
  manual_bobby: 0.85,
  instagram_scraped: 0.6,
};

describe('calculateFieldConfidence', () => {
  it('applies agreement boost when 2+ sources agree', () => {
    const candidates = [
      { value: '123 Main St', source_id: 'google_places' },
      { value: '123 Main St', source_id: 'michelin' },
    ];
    const result = calculateFieldConfidence(
      'address',
      candidates,
      trustTiers,
      CONFIDENCE_CONFIG,
      { chosenValue: '123 Main St' }
    );
    const base = 0.9; // max of 0.85, 0.9
    expect(result.score).toBeCloseTo(base + CONFIDENCE_CONFIG.agreement_boost, 5);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('applies conflict penalty when 2+ sources disagree', () => {
    const candidates = [
      { value: '123 Main St', source_id: 'google_places' },
      { value: '456 Other Ave', source_id: 'michelin' },
    ];
    const result = calculateFieldConfidence(
      'address',
      candidates,
      trustTiers,
      CONFIDENCE_CONFIG,
      { chosenValue: '123 Main St' }
    );
    const base = 0.85;
    expect(result.score).toBeCloseTo(base - CONFIDENCE_CONFIG.conflict_penalty, 5);
    expect(result.conflictSourceIds).toContain('michelin');
  });

  it('clamps score to [0, 1] — never below 0', () => {
    const candidates = [
      { value: 'A', source_id: 'instagram_scraped' },
      { value: 'B', source_id: 'instagram_scraped' },
    ];
    const config = { ...CONFIDENCE_CONFIG, conflict_penalty: 1 };
    const result = calculateFieldConfidence('name', candidates, trustTiers, config, {
      chosenValue: 'A',
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('clamps score to [0, 1] — never above 1', () => {
    const candidates = [
      { value: 'Same', source_id: 'google_places' },
      { value: 'Same', source_id: 'michelin' },
      { value: 'Same', source_id: 'manual_bobby' },
    ];
    const config = { ...CONFIDENCE_CONFIG, agreement_boost: 0.5 };
    const result = calculateFieldConfidence('name', candidates, trustTiers, config, {
      chosenValue: 'Same',
    });
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('applies geocode_boost for address when hasLatLng', () => {
    const candidates = [{ value: '123 Main St', source_id: 'google_places' }];
    const withoutGeo = calculateFieldConfidence(
      'address',
      candidates,
      trustTiers,
      CONFIDENCE_CONFIG,
      { chosenValue: '123 Main St', hasLatLng: false }
    );
    const withGeo = calculateFieldConfidence(
      'address',
      candidates,
      trustTiers,
      CONFIDENCE_CONFIG,
      { chosenValue: '123 Main St', hasLatLng: true }
    );
    expect(withGeo.score).toBeCloseTo(withoutGeo.score + CONFIDENCE_CONFIG.geocode_boost, 5);
  });
});

describe('calculateOverallConfidence', () => {
  it('excludes missing fields from denominator', () => {
    const confidence: ConfidenceMap = {
      name: { value: 'Foo', score: 0.8, sources: [], winner: 'gp', conflicts: [] },
      address: { value: '123 St', score: 0.9, sources: [], winner: 'gp', conflicts: [] },
    };
    const overall = calculateOverallConfidence(confidence);
    // Only name (0.25) and address (0.25) present -> weight sum 0.5
    // (0.8 * 0.25 + 0.9 * 0.25) / 0.5 = 0.425 / 0.5 = 0.85
    expect(overall).toBeCloseTo(0.85, 5);
  });

  it('returns 0.5 when confidence is empty or null', () => {
    expect(calculateOverallConfidence(null)).toBe(0.5);
    expect(calculateOverallConfidence(undefined)).toBe(0.5);
    expect(calculateOverallConfidence({})).toBe(0.5);
  });
});

describe('unknown source id', () => {
  it('does not produce { winner: "", sources: [], score: 0 }; produces no entry and overall 0.5', () => {
    const trustTiersOnlyKnown: Record<string, number> = {
      google_places: 0.85,
      manual_bobby: 0.85,
    };
    const rawRecords = [
      { raw_json: { name: 'Foo Bar' }, source_name: 'unknown_ingestion_source' },
    ];
    const golden = {
      name: 'Foo Bar',
      address_street: null,
      phone: null,
      website: null,
      hours_json: null,
      description: null,
      lat: 1,
      lng: 1,
    };
    const { confidence, overall_confidence } = computePlaceConfidence(
      golden,
      rawRecords,
      trustTiersOnlyKnown
    );
    expect(confidence.name).toBeUndefined();
    expect(confidence).toEqual({});
    expect(overall_confidence).toBe(0.5);
  });

  it('normalizeSourceId maps known raw names to canonical id', () => {
    expect(normalizeSourceId('google_places')).toBe('google_places');
    expect(normalizeSourceId('saiko_seed')).toBe('manual_bobby');
    expect(normalizeSourceId('editorial_eater')).toBe('manual_bobby');
    expect(normalizeSourceId('foursquare')).toBe('foursquare');
  });
});

describe('empty entity_links fallback (manual_bobby)', () => {
  it('when no raw records, uses golden as manual_bobby and produces non-empty confidence', () => {
    const trustTiers: Record<string, number> = { manual_bobby: 0.85 };
    const golden = {
      name: 'Foo Bar',
      address_street: '123 Main St',
      phone: null,
      website: null,
      hours_json: null,
      description: 'A great spot.',
      lat: 1,
      lng: 1,
    };
    const { confidence, overall_confidence } = computePlaceConfidence(
      golden,
      [],
      trustTiers
    );
    expect(confidence.name).toBeDefined();
    expect(confidence.name?.winner).toBe('manual_bobby');
    expect(confidence.name?.value).toBe('Foo Bar');
    expect(confidence.address?.winner).toBe('manual_bobby');
    expect(confidence.description?.winner).toBe('manual_bobby');
    expect(overall_confidence).toBeGreaterThan(0.5);
    expect(overall_confidence).toBeLessThanOrEqual(1);
  });
});

describe('buildFieldConfidenceEntry', () => {
  it('returns entry with value, score, sources, winner, conflicts', () => {
    const candidates = [
      { value: 'Café A', source_id: 'google_places' },
      { value: 'Cafe A', source_id: 'michelin' },
    ];
    const entry = buildFieldConfidenceEntry(
      'name',
      candidates,
      trustTiers,
      CONFIDENCE_CONFIG,
      { chosenValue: 'Café A' }
    );
    expect(entry).not.toBeNull();
    expect(entry!.value).toBe('Café A');
    expect(entry!.score).toBeGreaterThanOrEqual(0);
    expect(entry!.score).toBeLessThanOrEqual(1);
    expect(entry!.sources).toHaveLength(2);
    expect(entry!.winner).toBeDefined();
    expect(Array.isArray(entry!.conflicts)).toBe(true);
  });
});

describe('normalization', () => {
  it('normalizeName: lowercase, trim, remove punctuation', () => {
    expect(normalizeName('  Café Résumé  ')).toBe('café résumé');
    expect(normalizeName('Bob\'s Diner')).toBe('bobs diner');
  });

  it('normalizeAddress: abbreviations, lowercase', () => {
    expect(normalizeAddress('123 Main Street')).toBe('123 main st');
    expect(normalizeAddress('456 ELM AVENUE')).toBe('456 elm ave');
  });

  it('normalizePhone: digits only, preserve leading +', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('5551234567');
    expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567');
  });

  it('normalizeWebsite: registrable domain, strip www', () => {
    expect(normalizeWebsite('https://www.example.com/path')).toBe('example.com');
    expect(normalizeWebsite('https://example.com')).toBe('example.com');
  });

  it('normalizeHours: raw string for v1', () => {
    expect(normalizeHours('Mon–Fri 9–5')).toBe('mon–fri 9–5');
    expect(normalizeHours({ open: '9', close: '17' })).toContain('open');
  });
});
