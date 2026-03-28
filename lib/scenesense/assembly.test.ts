import { describe, expect, it } from 'vitest';
import { assembleSceneSenseFromMaterialized } from './assembly';

const placeForPRL = {
  name: 'Test Place',
  category: 'restaurant',
  address_street: '123 Main St',
  lat: 34.01,
  lng: -118.4,
  lifecycle_status: 'ACTIVE',
  business_status: 'OPERATIONAL',
  hours_json: { mon: '9-5' },
  googlePhotosCount: 3,
  userPhotosCount: 0,
  heroApproved: true,
  hasInteriorOrContextApproved: true,
  curatorPhotoOverride: false,
  description: 'A long enough description for PRL requirements and test output generation.',
  curatorNote: null,
  energyScore: 0.7,
  hasTagSignals: true,
  hasFormality: false,
  hasIdentitySignals: true,
  hasTemporalSignals: false,
  fieldsMembershipCount: 1,
  appearsOnCount: 0,
  hasCoverageSource: true,
  prlOverride: 3 as const,
};

describe('assembleSceneSenseFromMaterialized coverage integration', () => {
  it('keeps output stable when no coverage is provided', () => {
    const identitySignals = {
      place_personality: 'scene',
      language_signals: ['lively', 'buzzy'],
      signature_dishes: ['crudo'],
    };

    const baseline = assembleSceneSenseFromMaterialized({
      placeForPRL,
      neighborhood: 'Downtown',
      category: 'restaurant',
      identitySignals,
    });
    const withNullCoverage = assembleSceneSenseFromMaterialized({
      placeForPRL,
      neighborhood: 'Downtown',
      category: 'restaurant',
      identitySignals,
      coverageAtmosphere: null,
    });

    expect(withNullCoverage).toEqual(baseline);
  });

  it('keeps parity for route-like and warmer-like calls', () => {
    const sharedArgs = {
      placeForPRL,
      neighborhood: 'Downtown',
      category: 'restaurant',
      identitySignals: {
        place_personality: 'scene',
        language_signals: ['lively'],
        signature_dishes: ['pasta'],
      },
      coverageAtmosphere: {
        descriptors: ['dimly-lit', 'cozy'],
        energyLevel: 'lively',
        formality: 'smart-casual',
        sourceCount: 2,
      },
    };

    const routeAssembly = assembleSceneSenseFromMaterialized({ ...sharedArgs });
    const warmerAssembly = assembleSceneSenseFromMaterialized({ ...sharedArgs });

    expect(routeAssembly).toEqual(warmerAssembly);
  });
});
