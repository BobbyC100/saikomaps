/**
 * Place Page Typography — Drift Prevention Tests
 *
 * These tests parse the canonical place.css source file and assert that the
 * required typographic rules are present and unmodified.  They act as a
 * compile-time guard: if someone removes font-family from the title or strips
 * the uppercase styling from the identity subline, this suite fails immediately
 * — no browser required.
 *
 * Strategy: CSS source inspection (Option B from the spec).
 * We look for the key property declarations inside each selector block using
 * simple text-proximity matching (no full CSS AST parser needed; the properties
 * are deterministic and the selector names are stable IDs).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSS_PATH = resolve(
  __dirname,
  '../../app/(viewer)/place/[slug]/place.css',
);

let css: string;

beforeAll(() => {
  css = readFileSync(CSS_PATH, 'utf-8');
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the first rule block for a given selector from raw CSS text.
 * Returns the text between the opening `{` and the matching closing `}`.
 */
function extractBlock(rawCss: string, selector: string): string | null {
  // Find the selector (allow whitespace/newline between selector and brace)
  const idx = rawCss.indexOf(selector);
  if (idx === -1) return null;
  const openBrace = rawCss.indexOf('{', idx);
  if (openBrace === -1) return null;

  // Walk forward tracking brace depth to find the matching close brace
  let depth = 1;
  let pos = openBrace + 1;
  while (pos < rawCss.length && depth > 0) {
    if (rawCss[pos] === '{') depth++;
    else if (rawCss[pos] === '}') depth--;
    pos++;
  }
  return rawCss.slice(openBrace + 1, pos - 1);
}

function blockContains(block: string, declaration: string): boolean {
  // Strip comments before matching
  const stripped = block.replace(/\/\*[\s\S]*?\*\//g, '');
  // Normalize whitespace for comparison
  const normalized = stripped.replace(/\s+/g, ' ');
  return normalized.includes(declaration);
}

// ---------------------------------------------------------------------------
// Token definition tests
// ---------------------------------------------------------------------------

describe('Place Page CSS — token definitions', () => {
  it('defines --pp-font-display token in #place-page', () => {
    const block = extractBlock(css, '#place-page');
    expect(block).not.toBeNull();
    expect(blockContains(block!, '--pp-font-display:')).toBe(true);
  });

  it('--pp-font-display references Instrument Serif', () => {
    const block = extractBlock(css, '#place-page');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'Instrument Serif')).toBe(true);
  });

  it('defines --pp-font-ui token in #place-page', () => {
    const block = extractBlock(css, '#place-page');
    expect(block).not.toBeNull();
    expect(blockContains(block!, '--pp-font-ui:')).toBe(true);
  });

  it('--pp-font-ui references DM Sans', () => {
    const block = extractBlock(css, '#place-page');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'DM Sans')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// #place-title tests
// ---------------------------------------------------------------------------

describe('Place Page CSS — #place-title', () => {
  it('has an explicit font-family declaration', () => {
    const block = extractBlock(css, '#place-title');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'font-family:')).toBe(true);
  });

  it('uses var(--pp-font-display) for font-family', () => {
    const block = extractBlock(css, '#place-title');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'font-family: var(--pp-font-display)')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// #identity-subline tests
// ---------------------------------------------------------------------------

describe('Place Page CSS — #identity-subline', () => {
  it('has an explicit font-family declaration', () => {
    const block = extractBlock(css, '#identity-subline');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'font-family:')).toBe(true);
  });

  it('uses var(--pp-font-ui) for font-family', () => {
    const block = extractBlock(css, '#identity-subline');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'font-family: var(--pp-font-ui)')).toBe(true);
  });

  it('has text-transform: uppercase', () => {
    const block = extractBlock(css, '#identity-subline');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'text-transform: uppercase')).toBe(true);
  });

  it('has a letter-spacing declaration', () => {
    const block = extractBlock(css, '#identity-subline');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'letter-spacing:')).toBe(true);
  });

  it('letter-spacing is at least 0.03em (ensures non-trivial tracking)', () => {
    const block = extractBlock(css, '#identity-subline');
    expect(block).not.toBeNull();
    // Pull out the value
    const stripped = block!.replace(/\/\*[\s\S]*?\*\//g, '');
    const match = stripped.match(/letter-spacing:\s*([\d.]+)em/);
    expect(match).not.toBeNull();
    const value = parseFloat(match![1]);
    expect(value).toBeGreaterThanOrEqual(0.03);
  });
});

// ---------------------------------------------------------------------------
// #facts-band (action row) tests
// ---------------------------------------------------------------------------

describe('Place Page CSS — #facts-band', () => {
  it('has an explicit font-family declaration', () => {
    const block = extractBlock(css, '#facts-band');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'font-family:')).toBe(true);
  });

  it('uses var(--pp-font-ui) for font-family', () => {
    const block = extractBlock(css, '#facts-band');
    expect(block).not.toBeNull();
    expect(blockContains(block!, 'font-family: var(--pp-font-ui)')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Regression guard: globals.css still imports both font families
// ---------------------------------------------------------------------------

describe('globals.css — required font imports', () => {
  let globalsCss: string;
  beforeAll(() => {
    globalsCss = readFileSync(
      resolve(__dirname, '../../app/globals.css'),
      'utf-8',
    );
  });

  it('imports Instrument Serif from Google Fonts', () => {
    expect(globalsCss).toContain('Instrument+Serif');
  });

  it('imports DM Sans from Google Fonts', () => {
    expect(globalsCss).toContain('DM+Sans');
  });
});
