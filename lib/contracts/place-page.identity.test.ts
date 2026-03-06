import { describe, it, expect } from 'vitest';
import { getProfileIdentityLine } from './place-page.identity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type OfferingSignals = {
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

function makeSignals(overrides: Partial<OfferingSignals> = {}): OfferingSignals {
  return {
    servesBeer: null,
    servesWine: null,
    servesVegetarianFood: null,
    servesLunch: null,
    servesDinner: null,
    servesCocktails: null,
    cuisinePosture: null,
    serviceModel: null,
    priceTier: null,
    wineProgramIntent: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getProfileIdentityLine — sign-style offering composition
// ---------------------------------------------------------------------------

describe('getProfileIdentityLine — sign-style composition', () => {
  it("Donna's case: Italian + Cocktails + Wine → 'Italian, Cocktails, Wine'", () => {
    const result = getProfileIdentityLine({
      neighborhood: "Echo Park",       // must NOT appear in output
      cuisineType: "Italian",
      offeringSignals: makeSignals({ servesCocktails: true, servesWine: true }),
    });
    expect(result).toBe('Italian, Cocktails, Wine');
  });

  it('neighborhood is excluded from the output', () => {
    const result = getProfileIdentityLine({
      neighborhood: 'Silver Lake',
      cuisineType: 'Japanese',
      offeringSignals: makeSignals({ servesWine: true }),
    });
    expect(result).not.toContain('Silver Lake');
    expect(result).toBe('Japanese, Wine');
  });

  it('cuisine only — no offering signals → just cuisine', () => {
    const result = getProfileIdentityLine({
      neighborhood: 'Los Feliz',
      cuisineType: 'Mexican',
      offeringSignals: makeSignals(),
    });
    expect(result).toBe('Mexican');
  });

  it('no cuisine, cocktails and wine → Cocktails, Wine', () => {
    const result = getProfileIdentityLine({
      neighborhood: 'Echo Park',
      cuisineType: null,
      offeringSignals: makeSignals({ servesCocktails: true, servesWine: true }),
    });
    expect(result).toBe('Cocktails, Wine');
  });

  it('no cuisine, no offering signals → null', () => {
    const result = getProfileIdentityLine({
      neighborhood: 'Downtown',
      cuisineType: null,
      offeringSignals: makeSignals(),
    });
    expect(result).toBeNull();
  });

  it('null offeringSignals → only cuisineType segment used', () => {
    const result = getProfileIdentityLine({
      neighborhood: 'Silver Lake',
      cuisineType: 'Italian',
      offeringSignals: null,
    });
    expect(result).toBe('Italian');
  });

  it('cuisine title-cased: "italian" → "Italian"', () => {
    const result = getProfileIdentityLine({
      neighborhood: null,
      cuisineType: 'italian',
      offeringSignals: makeSignals(),
    });
    expect(result).toBe('Italian');
  });

  it('max 3 segments: cuisine + cocktails + wine, even if more signals present', () => {
    const result = getProfileIdentityLine({
      neighborhood: 'Echo Park',
      cuisineType: 'Italian',
      offeringSignals: makeSignals({
        servesCocktails: true,
        servesWine: true,
        servesBeer: true,  // beer is 4th — must not appear
      }),
    });
    expect(result).toBe('Italian, Cocktails, Wine');
    expect(result!.split(',').length).toBe(3);
  });

  it('servesCocktails false → Cocktails not included', () => {
    const result = getProfileIdentityLine({
      neighborhood: null,
      cuisineType: 'Italian',
      offeringSignals: makeSignals({ servesCocktails: false, servesWine: true }),
    });
    expect(result).toBe('Italian, Wine');
    expect(result).not.toContain('Cocktails');
  });

  it('servesCocktails null → Cocktails not included', () => {
    const result = getProfileIdentityLine({
      neighborhood: null,
      cuisineType: 'Italian',
      offeringSignals: makeSignals({ servesCocktails: null, servesWine: true }),
    });
    expect(result).toBe('Italian, Wine');
  });

  it('no neighborhood, no cuisine, only wine → Wine', () => {
    const result = getProfileIdentityLine({
      neighborhood: null,
      cuisineType: null,
      offeringSignals: makeSignals({ servesWine: true }),
    });
    expect(result).toBe('Wine');
  });
});

// ---------------------------------------------------------------------------
// Status line regression — acceptance tests from WO-TRACES-HERO-AREA-FINAL-TUNE-001
// These reference getOpenStateLabelV2 directly to guard the acceptance criteria.
// ---------------------------------------------------------------------------

import { getOpenStateLabelV2, type HoursSnapshot } from '../utils/get-open-state-label';

function makeNow(hh: number, mm: number): Date {
  const d = new Date('2025-01-06T00:00:00.000Z');
  d.setHours(hh, mm, 0, 0);
  return d;
}

describe('Status line acceptance — WO-TRACES-HERO-AREA-FINAL-TUNE-001', () => {
  it('open + 25 min from close → Closing soon (not Closed — Opens at)', () => {
    const snap: HoursSnapshot = {
      isOpen: true,
      closesAt: '10 PM',
      opensAt: null,
      today: '5 PM – 10 PM',
      openNowExplicit: true,
    };
    const now = makeNow(21, 35); // 9:35 PM → 25 min before 10 PM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('closing_soon');
    expect(result.label).toContain('Closing soon');
    expect(result.label).not.toContain('Closed —');
  });

  it('open + exactly 30 min from close → Closing soon (inclusive boundary)', () => {
    const snap: HoursSnapshot = {
      isOpen: true,
      closesAt: '10 PM',
      opensAt: null,
      today: '5 PM – 10 PM',
    };
    const now = makeNow(21, 30); // 9:30 PM → exactly 30 min before 10 PM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('closing_soon');
  });

  it('open + 31 min from close → Open now', () => {
    const snap: HoursSnapshot = {
      isOpen: true,
      closesAt: '10 PM',
      opensAt: null,
      today: '5 PM – 10 PM',
    };
    const now = makeNow(21, 29); // 9:29 PM → 31 min before 10 PM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('open');
    expect(result.label).toBe('Open now');
  });

  it('closed + next opening known → Closed — Opens at {time}', () => {
    const snap: HoursSnapshot = {
      isOpen: false,
      closesAt: null,
      opensAt: '5 PM',
      today: '5 PM – 10 PM',
    };
    const now = makeNow(10, 0); // 10 AM → 7 hours before 5 PM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.kind).toBe('closed');
    expect(result.label).toBe('Closed — Opens at 5 PM');
    expect(result.at).toBe('5 PM');
  });

  it('Donna\'s acceptance: open near 10 PM close must not show Closed — Opens at 10 PM', () => {
    // Simulates: openNow=true (explicit), closes at 10 PM, it is 9:45 PM
    const snap: HoursSnapshot = {
      isOpen: true,
      closesAt: '10 PM',
      opensAt: null,
      today: '5 PM – 10 PM',
      openNowExplicit: true,
    };
    const now = makeNow(21, 45); // 9:45 PM
    const result = getOpenStateLabelV2(snap, now);
    expect(result.label).not.toBe('Closed — Opens at 10 PM');
    expect(result.kind).toBe('closing_soon');
  });
});
