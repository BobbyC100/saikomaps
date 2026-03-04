/**
 * Intent Profile System — unit tests
 * Covers override precedence and computed fallback logic.
 */

import { describe, it, expect } from 'vitest';
import { getIntentProfile, assignIntentProfile } from './intent-profile';

describe('getIntentProfile — override logic', () => {
  it('override=true + stored=transactional → returns transactional regardless of vertical', () => {
    const result = getIntentProfile({
      primaryVertical: 'NATURE',
      reservationUrl: null,
      phone: null,
      intentProfile: 'transactional',
      intentProfileOverride: true,
    });
    expect(result).toBe('transactional');
  });

  it('override=false + stored=transactional → falls through to computed result', () => {
    const result = getIntentProfile({
      primaryVertical: 'NATURE',
      reservationUrl: null,
      phone: null,
      intentProfile: 'transactional',
      intentProfileOverride: false,
    });
    expect(result).toBe('go-there');
  });

  it('override=true + stored=null → falls through to computed (override cannot win without a value)', () => {
    const result = getIntentProfile({
      primaryVertical: 'EAT',
      reservationUrl: null,
      phone: null,
      intentProfile: null,
      intentProfileOverride: true,
    });
    expect(result).toBe('visit-now');
  });

  it('override=true + stored=go-there → returns go-there even when reservationUrl would promote to transactional', () => {
    const result = getIntentProfile({
      primaryVertical: 'EAT',
      reservationUrl: 'https://resy.com/cities/la/n-naka',
      phone: null,
      intentProfile: 'go-there',
      intentProfileOverride: true,
    });
    expect(result).toBe('go-there');
  });
});

describe('assignIntentProfile — computed logic', () => {
  it('reservationUrl auto-promotes to transactional regardless of vertical', () => {
    expect(assignIntentProfile({ primaryVertical: 'EAT', reservationUrl: 'https://resy.com/foo' })).toBe('transactional');
  });

  it('NATURE vertical → go-there', () => {
    expect(assignIntentProfile({ primaryVertical: 'NATURE' })).toBe('go-there');
  });

  it('ACTIVITY vertical → go-there', () => {
    expect(assignIntentProfile({ primaryVertical: 'ACTIVITY' })).toBe('go-there');
  });

  it('EAT without reservation URL → visit-now', () => {
    expect(assignIntentProfile({ primaryVertical: 'EAT' })).toBe('visit-now');
  });

  it('DRINKS without reservation URL → visit-now', () => {
    expect(assignIntentProfile({ primaryVertical: 'DRINKS' })).toBe('visit-now');
  });

  it('no vertical, no reservation URL → visit-now (default)', () => {
    expect(assignIntentProfile({})).toBe('visit-now');
  });
});
