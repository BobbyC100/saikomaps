import { describe, expect, it } from 'vitest';
import { expectsAccessFieldForEntity } from './enrichment-profiles';

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
