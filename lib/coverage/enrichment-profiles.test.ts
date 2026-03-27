import { describe, expect, it } from 'vitest';
import { expectsAccessFieldForEntity, isEntityEnriched } from './enrichment-profiles';

describe('expectsAccessFieldForEntity', () => {
  it('keeps hotel (STAY) hours optional by vertical profile', () => {
    expect(
      expectsAccessFieldForEntity({ vertical: 'STAY', category: 'hotel' }, 'hours')
    ).toBe(false);
  });

  it('keeps nature trail hours optional by vertical profile', () => {
    expect(
      expectsAccessFieldForEntity({ vertical: 'NATURE', category: 'trail', slug: 'eaton-canyon-trail' }, 'hours')
    ).toBe(false);
  });

  it('treats culture music venues as hours-optional subtype', () => {
    expect(
      expectsAccessFieldForEntity(
        { vertical: 'CULTURE', category: 'music-venue', name: 'The Regent Theater', slug: 'the-regent-theater' },
        'hours'
      )
    ).toBe(false);
  });

  it('keeps non-music culture entities hours-expected', () => {
    expect(
      expectsAccessFieldForEntity(
        { vertical: 'CULTURE', category: 'museum', name: 'LACMA', slug: 'lacma' },
        'hours'
      )
    ).toBe(true);
  });
});

describe('isEntityEnriched', () => {
  it('requires Interpretation layer for EAT profiles', () => {
    const assessment = isEntityEnriched({
      vertical: 'EAT',
      category: 'restaurant',
      googlePlaceId: 'gpid_1',
      website: 'https://example.com',
      instagram: '@eat',
      phone: '555-555-5555',
      latitude: 34.1,
      longitude: -118.2,
      neighborhood: 'echo-park',
      cesHoursJson: { mon: '9-5' },
      cesReservationUrl: 'https://resy.com/example',
      cesMenuUrl: 'https://example.com/menu',
      hasOfferingPrograms: true,
      hasScenesense: true,
      hasEditorialCoverage: true,
      hasCurrentTagline: false,
    });

    expect(assessment.done).toBe(false);
    expect(assessment.interpretation.required).toBe(true);
    expect(assessment.interpretation.met).toBe(false);
    expect(assessment.interpretation.missing).toEqual(['TAGLINE']);
  });

  it('treats NATURE interpretation as optional', () => {
    const assessment = isEntityEnriched({
      vertical: 'NATURE',
      category: 'trail',
      googlePlaceId: 'gpid_2',
      website: null,
      instagram: null,
      phone: null,
      latitude: 34.2,
      longitude: -118.4,
      neighborhood: 'griffith-park',
      hasScenesense: true,
      hasCurrentTagline: false,
    });

    expect(assessment.interpretation.required).toBe(false);
    expect(assessment.interpretation.met).toBe(true);
    expect(assessment.done).toBe(true);
  });

  it('uses lower identity threshold for nomadic entities', () => {
    const assessment = isEntityEnriched({
      vertical: 'EAT',
      category: 'food-truck',
      isNomadic: true,
      googlePlaceId: null,
      website: null,
      instagram: '@truck',
      phone: null,
      latitude: null,
      longitude: null,
      neighborhood: null,
      cesHoursJson: { fri: '6-10' },
      cesReservationUrl: 'https://resy.com/truck',
      cesMenuUrl: 'https://truck.example/menu',
      hasOfferingPrograms: true,
      hasScenesense: true,
      hasEditorialCoverage: true,
      hasCurrentTagline: true,
    });

    expect(assessment.identity.threshold).toBe(2);
    expect(assessment.identity.met).toBe(true);
  });
});
