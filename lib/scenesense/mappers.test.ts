import { describe, expect, it } from 'vitest';
import type { CanonicalSceneSense } from './voice-engine';
import {
  COVERAGE_DESCRIPTOR_TO_ATMOSPHERE,
  COVERAGE_DESCRIPTOR_TO_ENERGY,
  COVERAGE_FORMALITY_TO_SCENE,
  mergeCoverageIntoCanonical,
} from './mappers';

describe('coverage mapper tables', () => {
  it('maps descriptors to energy tokens deterministically', () => {
    expect(COVERAGE_DESCRIPTOR_TO_ENERGY.buzzy).toBe('BUZZY');
    expect(COVERAGE_DESCRIPTOR_TO_ENERGY.cozy).toBe('CHILL');
    expect(COVERAGE_DESCRIPTOR_TO_ENERGY.relaxed).toBe('LOW_KEY');
  });

  it('maps descriptors to atmosphere fields with strict field/value pairs', () => {
    expect(COVERAGE_DESCRIPTOR_TO_ATMOSPHERE['dimly-lit']).toEqual({
      field: 'lighting',
      value: 'DIM',
    });
    expect(COVERAGE_DESCRIPTOR_TO_ATMOSPHERE.quiet).toEqual({
      field: 'noise',
      value: 'QUIET',
    });
    expect(COVERAGE_DESCRIPTOR_TO_ATMOSPHERE.crowded).toEqual({
      field: 'density',
      value: 'PACKED',
    });
  });

  it('maps formality strings to scene formality tokens', () => {
    expect(COVERAGE_FORMALITY_TO_SCENE['smart-casual']).toBe('CASUAL_REFINED');
    expect(COVERAGE_FORMALITY_TO_SCENE.upscale).toBe('REFINED');
  });
});

describe('mergeCoverageIntoCanonical', () => {
  it('keeps identity fields when coverage conflicts', () => {
    const canonical: CanonicalSceneSense = {
      atmosphere: { lighting: 'BRIGHT' },
    };

    const merged = mergeCoverageIntoCanonical(canonical, {
      descriptors: ['dimly-lit'],
      energyLevel: null,
      formality: null,
      sourceCount: 1,
    });

    expect(merged.atmosphere?.lighting).toBe('BRIGHT');
  });

  it('fills empty atmosphere fields from coverage', () => {
    const merged = mergeCoverageIntoCanonical({}, {
      descriptors: ['dimly-lit', 'crowded'],
      energyLevel: null,
      formality: null,
      sourceCount: 1,
    });

    expect(merged.atmosphere?.lighting).toBe('DIM');
    expect(merged.atmosphere?.density).toBe('PACKED');
  });

  it('fills energy tokens from descriptors and keeps unique ordering', () => {
    const merged = mergeCoverageIntoCanonical({}, {
      descriptors: ['buzzy', 'lively', 'buzzy'],
      energyLevel: null,
      formality: null,
      sourceCount: 1,
    });

    expect(merged.energy?.tokens).toEqual(['BUZZY', 'LIVELY']);
  });

  it('fills scene formality when empty', () => {
    const merged = mergeCoverageIntoCanonical({}, {
      descriptors: [],
      energyLevel: null,
      formality: 'smart-casual',
      sourceCount: 1,
    });

    expect(merged.scene?.formality).toBe('CASUAL_REFINED');
  });

  it('is a no-op for null/empty coverage input', () => {
    const canonical: CanonicalSceneSense = {
      atmosphere: { noise: 'QUIET' },
      energy: { tokens: ['CALM'] },
    };

    expect(mergeCoverageIntoCanonical(canonical, null)).toEqual(canonical);
    expect(
      mergeCoverageIntoCanonical(canonical, {
        descriptors: ['loud'],
        energyLevel: 'lively',
        formality: 'formal',
        sourceCount: 0,
      }),
    ).toEqual(canonical);
  });
});
