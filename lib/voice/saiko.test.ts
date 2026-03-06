import { describe, it, expect } from 'vitest';
import { renderIdentityBlock, renderLocation, renderEnergy } from './saiko';

// ---------------------------------------------------------------------------
// renderLocation
// ---------------------------------------------------------------------------

describe('renderLocation', () => {
  it('joins neighborhood and category', () => {
    expect(renderLocation({ neighborhood: 'Culver City', category: 'Restaurant' })).toBe('Culver City restaurant');
  });

  it('lowercases the category', () => {
    expect(renderLocation({ neighborhood: 'Silver Lake', category: 'COFFEE SHOP' })).toBe('Silver Lake coffee shop');
  });

  it('returns category alone when neighborhood is null', () => {
    expect(renderLocation({ neighborhood: null, category: 'Bar' })).toBe('bar');
  });

  it('returns neighborhood alone when category is null', () => {
    expect(renderLocation({ neighborhood: 'Echo Park', category: null })).toBe('Echo Park');
  });

  it('returns null when both values are absent', () => {
    expect(renderLocation({ neighborhood: null, category: null })).toBeNull();
    expect(renderLocation({ neighborhood: undefined, category: undefined })).toBeNull();
    expect(renderLocation({ neighborhood: '', category: '' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// renderEnergy — consumes SceneSense atmosphere output (first item)
// ---------------------------------------------------------------------------

describe('renderEnergy', () => {
  it('maps a known SceneSense atmosphere label to its phrase', () => {
    expect(renderEnergy(['Lively'])).toBe('lively room');
  });

  it('uses the first atmosphere item only', () => {
    expect(renderEnergy(['Lively', 'Warm-lit'])).toBe('lively room');
  });

  it('falls back to lowercasing unknown labels', () => {
    expect(renderEnergy(['Neighborhood staple'])).toBe('neighborhood staple');
  });

  it('returns null for empty array', () => {
    expect(renderEnergy([])).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(renderEnergy(null)).toBeNull();
    expect(renderEnergy(undefined)).toBeNull();
  });

  it('handles Chill', () => {
    expect(renderEnergy(['Chill'])).toBe('laid-back feel');
  });

  it('handles Buzzy', () => {
    expect(renderEnergy(['Buzzy'])).toBe('buzzy room');
  });

  it('handles Calm', () => {
    expect(renderEnergy(['Calm'])).toBe('calm atmosphere');
  });
});

// ---------------------------------------------------------------------------
// renderIdentityBlock — open state is passed in, not parsed internally
// ---------------------------------------------------------------------------

describe('renderIdentityBlock', () => {
  it('produces a canonical example from SceneSense atmosphere output', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Culver City', category: 'Restaurant', atmosphere: ['Lively'] },
      'Open now'
    );
    expect(result.subline).toBe('Culver City restaurant');
    expect(result.sentence).toBe('Open now — lively room');
  });

  it('omits open state when label is null', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Silver Lake', category: 'Bar', atmosphere: ['Chill'] },
      null
    );
    expect(result.sentence).toBe('laid-back feel');
  });

  it('omits open state when label is not passed (default)', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Silver Lake', category: 'Bar', atmosphere: ['Buzzy'] }
    );
    expect(result.sentence).toBe('buzzy room');
  });

  it('returns only the open state label when atmosphere is empty', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Culver City', category: 'Restaurant', atmosphere: [] },
      'Closed now'
    );
    expect(result.sentence).toBe('Closed now');
  });

  it('returns null sentence when label is null and atmosphere is null', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Echo Park', category: 'Coffee', atmosphere: null },
      null
    );
    expect(result.subline).toBe('Echo Park coffee');
    expect(result.sentence).toBeNull();
  });

  it('returns null subline when neighborhood and category both absent', () => {
    const result = renderIdentityBlock(
      { neighborhood: null, category: null, atmosphere: ['Lively'] },
      'Open now'
    );
    expect(result.subline).toBeNull();
    expect(result.sentence).toBe('Open now — lively room');
  });

  it('is deterministic — same inputs always produce same output', () => {
    const signals = { neighborhood: 'Los Feliz', category: 'Restaurant', atmosphere: ['Calm'] };
    const a = renderIdentityBlock(signals, 'Open now');
    const b = renderIdentityBlock(signals, 'Open now');
    expect(a).toEqual(b);
  });
});
