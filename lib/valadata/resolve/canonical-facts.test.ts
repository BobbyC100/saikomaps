/**
 * VALADATA v0.1 — canonical-facts unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  extractServiceFields,
  resolveCanonicalServiceFacts,
  type ResolveInput,
} from './canonical-facts';
import { buildPlaceServiceFacts } from '@/lib/place-payload';

describe('extractServiceFields', () => {
  it('returns {} when attrs is undefined', () => {
    expect(extractServiceFields(undefined)).toEqual({});
    expect(extractServiceFields(undefined, 'scrape')).toEqual({});
  });

  it('extracts from Google attrs (snake_case)', () => {
    const attrs = {
      takeout: true,
      delivery: false,
      dine_in: true,
      reservable: null,
      curbside_pickup: false,
    };
    expect(extractServiceFields(attrs, 'google')).toEqual({
      takeout: true,
      delivery: false,
      dine_in: true,
      reservable: null,
      curbside_pickup: false,
    });
  });

  it('extracts from Google attrs (camelCase for curbsidePickup)', () => {
    const attrs = { curbsidePickup: true, dineIn: false };
    expect(extractServiceFields(attrs, 'google')).toEqual({
      curbside_pickup: true,
      dine_in: false,
    });
  });

  it('omits keys when value is absent (does not emit undefined)', () => {
    const attrs = { takeout: true };
    const out = extractServiceFields(attrs, 'google');
    expect(out).toEqual({ takeout: true });
    expect(out).not.toHaveProperty('delivery');
    expect(out).not.toHaveProperty('dine_in');
  });

  it('extracts null when source explicitly indicates unknown', () => {
    const attrs = { takeout: null, delivery: 'unknown' };
    expect(extractServiceFields(attrs, 'google')).toEqual({
      takeout: null,
      delivery: null,
    });
  });

  it('extracts from scrape attrs', () => {
    const attrs = {
      takeout: true,
      take_out: false, // scrape may use take_out
      delivery: true,
      dine_in: false,
      reservable: true,
      curbside_pickup: false,
    };
    expect(extractServiceFields(attrs, 'scrape')).toEqual({
      takeout: true, // takeout wins over take_out (first in extractor)
      delivery: true,
      dine_in: false,
      reservable: true,
      curbside_pickup: false,
    });
  });
});

describe('resolveCanonicalServiceFacts', () => {
  it('Google-only: returns canonical from google, no conflicts', () => {
    const input: ResolveInput = {
      google: { takeout: true, delivery: false, dine_in: true },
    };
    const { canonical, conflicts } = resolveCanonicalServiceFacts(input);
    expect(canonical).toEqual({
      takeout: true,
      delivery: false,
      dine_in: true,
    });
    expect(Object.keys(conflicts)).toHaveLength(0);
  });

  it('Scrape-only: returns canonical from scrape, no conflicts', () => {
    const input: ResolveInput = {
      scrape: { takeout: false, reservable: true },
    };
    const { canonical, conflicts } = resolveCanonicalServiceFacts(input);
    expect(canonical).toEqual({
      takeout: false,
      reservable: true,
    });
    expect(Object.keys(conflicts)).toHaveLength(0);
  });

  it('Manual override beats others', () => {
    const input: ResolveInput = {
      google: { takeout: false, delivery: true },
      scrape: { takeout: true, delivery: false },
      manual: { takeout: true, delivery: true },
    };
    const { canonical, conflicts } = resolveCanonicalServiceFacts(input);
    expect(canonical.takeout).toBe(true);
    expect(canonical.delivery).toBe(true);
    expect(conflicts.takeout).toBeDefined();
    expect(conflicts.takeout?.sources).toContain('manual');
    expect(conflicts.takeout?.sources).toContain('google');
    expect(conflicts.takeout?.sources).toContain('scrape');
    expect(conflicts.takeout?.values).toEqual({ manual: true, google: false, scrape: true });
    expect(conflicts.delivery).toBeDefined();
  });

  it('Google vs scrape disagreement produces conflict record', () => {
    const input: ResolveInput = {
      google: { takeout: true, dine_in: false },
      scrape: { takeout: false, dine_in: true },
    };
    const { canonical, conflicts } = resolveCanonicalServiceFacts(input);
    expect(conflicts.takeout).toEqual({
      sources: ['scrape', 'google'],
      values: { google: true, scrape: false },
    });
    expect(conflicts.dine_in).toEqual({
      sources: ['scrape', 'google'],
      values: { google: false, scrape: true },
    });
    expect(canonical.takeout).toBe(false);
    expect(canonical.dine_in).toBe(true);
  });

  it('null/unknown handling: field absent vs explicitly null', () => {
    const input: ResolveInput = {
      google: { takeout: true },
      scrape: { takeout: null },
    };
    const { canonical, conflicts } = resolveCanonicalServiceFacts(input);
    expect(conflicts.takeout).toBeUndefined();
    expect(canonical.takeout).toBe(true);
  });

  it('null from one source does not conflict with boolean from another', () => {
    const input: ResolveInput = {
      google: { takeout: null },
      scrape: { takeout: true },
    };
    const { canonical, conflicts } = resolveCanonicalServiceFacts(input);
    expect(conflicts.takeout).toBeUndefined();
    expect(canonical.takeout).toBe(true);
  });

  it('sources array is sorted by priority order', () => {
    const input: ResolveInput = {
      google: { takeout: true },
      scrape: { takeout: false },
    };
    const { conflicts } = resolveCanonicalServiceFacts(input);
    expect(conflicts.takeout?.sources).toEqual(['scrape', 'google']);
  });

  it('empty input returns empty canonical and conflicts', () => {
    const { canonical, conflicts } = resolveCanonicalServiceFacts({});
    expect(canonical).toEqual({});
    expect(conflicts).toEqual({});
  });

  it('deterministic: same inputs produce same outputs', () => {
    const input: ResolveInput = {
      google: { takeout: true, delivery: false },
      scrape: { takeout: false, delivery: true },
    };
    const a = resolveCanonicalServiceFacts(input);
    const b = resolveCanonicalServiceFacts(input);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('buildPlaceServiceFacts contract', () => {
  it('response shape has facts.service and conflicts.service (always objects)', () => {
    const out = buildPlaceServiceFacts({ googleAttrs: null, scrapeAttrs: null, manualOverrides: null });
    expect(out).toHaveProperty('facts');
    expect(out.facts).toHaveProperty('service');
    expect(typeof out.facts.service).toBe('object');
    expect(out.facts.service).not.toBeNull();
    expect(out).toHaveProperty('conflicts');
    expect(out.conflicts).toHaveProperty('service');
    expect(typeof out.conflicts.service).toBe('object');
    expect(out.conflicts.service).not.toBeNull();
  });
});
