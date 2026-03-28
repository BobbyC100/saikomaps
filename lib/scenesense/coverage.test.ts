import { describe, expect, it } from 'vitest';
import {
  buildCoverageAtmosphereInput,
  type CoverageAtmosphereExtractionRow,
} from './coverage';

function makeRow(
  overrides: Partial<CoverageAtmosphereExtractionRow> = {},
): CoverageAtmosphereExtractionRow {
  return {
    isCurrent: true,
    atmosphereSignals: null,
    ...overrides,
  };
}

describe('buildCoverageAtmosphereInput', () => {
  it('returns null for empty input', () => {
    expect(buildCoverageAtmosphereInput([])).toBeNull();
    expect(buildCoverageAtmosphereInput(null)).toBeNull();
  });

  it('filters non-current rows and builds deterministic output', () => {
    const result = buildCoverageAtmosphereInput([
      makeRow({
        atmosphereSignals: {
          descriptors: ['Cozy', '  DIMLY-LIT  '],
          energyLevel: 'LIVELY',
          formality: 'smart-casual',
        },
      }),
      makeRow({
        atmosphereSignals: {
          descriptors: ['cozy', 'crowded'],
          energyLevel: 'lively',
          formality: 'casual',
        },
      }),
      makeRow({
        isCurrent: false,
        atmosphereSignals: {
          descriptors: ['airy'],
          energyLevel: 'calm',
          formality: 'formal',
        },
      }),
    ]);

    expect(result).toEqual({
      descriptors: ['cozy', 'crowded', 'dimly-lit'],
      energyLevel: 'lively',
      formality: 'casual',
      sourceCount: 2,
    });
  });

  it('normalizes descriptor casing and whitespace', () => {
    const result = buildCoverageAtmosphereInput([
      makeRow({
        atmosphereSignals: {
          descriptors: [' Cozy ', 'COZY', 'cozy'],
        },
      }),
    ]);
    expect(result?.descriptors).toEqual(['cozy']);
  });
});
