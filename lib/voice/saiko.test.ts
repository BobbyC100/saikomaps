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
// renderEnergy — accepts canonical identity_signals.vibe_words (lowercase)
// ---------------------------------------------------------------------------

describe('renderEnergy', () => {
  it('maps a single known word', () => {
    expect(renderEnergy(['lively'])).toBe('lively room');
  });

  it('maps multiple known words joined by comma', () => {
    expect(renderEnergy(['lively', 'date-friendly'])).toBe('lively room, strong date-night energy');
  });

  it('silently ignores unrecognized words', () => {
    expect(renderEnergy(['lively', 'unknown-word'])).toBe('lively room');
  });

  it('returns null when all words are unrecognized', () => {
    expect(renderEnergy(['unknown'])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(renderEnergy([])).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(renderEnergy(null)).toBeNull();
    expect(renderEnergy(undefined)).toBeNull();
  });

  it('handles cozy', () => {
    expect(renderEnergy(['cozy'])).toBe('cozy room');
  });

  it('handles late-night', () => {
    expect(renderEnergy(['cozy', 'late-night'])).toBe('cozy room, late-night energy');
  });
});

// ---------------------------------------------------------------------------
// renderIdentityBlock — open state is passed in, not parsed internally
// ---------------------------------------------------------------------------

describe('renderIdentityBlock', () => {
  it('produces a canonical example with vibe_words', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Culver City', category: 'Restaurant', vibe_words: ['lively', 'date-friendly'] },
      'Open now'
    );
    expect(result.subline).toBe('Culver City restaurant');
    expect(result.sentence).toBe('Open now — lively room, strong date-night energy');
  });

  it('omits open state when label is null', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Silver Lake', category: 'Bar', vibe_words: ['cozy', 'late-night'] },
      null
    );
    expect(result.sentence).toBe('cozy room, late-night energy');
  });

  it('omits open state when label is not passed (default)', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Silver Lake', category: 'Bar', vibe_words: ['cozy'] }
    );
    expect(result.sentence).toBe('cozy room');
  });

  it('returns only the open state label when no vibe_words', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Culver City', category: 'Restaurant', vibe_words: [] },
      'Closed now'
    );
    expect(result.sentence).toBe('Closed now');
  });

  it('returns null sentence when label is null and no vibe_words', () => {
    const result = renderIdentityBlock(
      { neighborhood: 'Echo Park', category: 'Coffee', vibe_words: null },
      null
    );
    expect(result.subline).toBe('Echo Park coffee');
    expect(result.sentence).toBeNull();
  });

  it('returns null subline when neighborhood and category both absent', () => {
    const result = renderIdentityBlock(
      { neighborhood: null, category: null, vibe_words: ['lively'] },
      'Open now'
    );
    expect(result.subline).toBeNull();
    expect(result.sentence).toBe('Open now — lively room');
  });

  it('is deterministic — same inputs always produce same output', () => {
    const signals = { neighborhood: 'Los Feliz', category: 'Restaurant', vibe_words: ['romantic', 'refined'] };
    const a = renderIdentityBlock(signals, 'Open now');
    const b = renderIdentityBlock(signals, 'Open now');
    expect(a).toEqual(b);
  });
});
