/**
 * About-page text extraction and quality gates — WO-FIELDS-WEBSITE-ABOUT-EXTRACTION-001
 *
 * Tests for extractAboutText and checkAboutQuality.
 * No HTTP requests — all fixtures are inline HTML strings.
 */

import { describe, it, expect } from 'vitest';
import {
  extractAboutText,
  checkAboutQuality,
  ABOUT_EXTRACT_MIN_CHARS,
  ABOUT_EXTRACT_HARD_CAP,
} from '@/lib/website-enrichment/about';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function wrapInMain(content: string): string {
  return `<!DOCTYPE html><html><body>
    <nav><a href="/menu">Menu</a><a href="/contact">Contact</a></nav>
    <main>${content}</main>
    <footer><p>© 2024 Donna's. All rights reserved.</p></footer>
  </body></html>`;
}

function wrapInArticle(content: string): string {
  return `<!DOCTYPE html><html><body>
    <nav><a href="/">Home</a></nav>
    <article>${content}</article>
    <footer><p>Cookie policy</p></footer>
  </body></html>`;
}

const GOOD_ABOUT_PARAGRAPHS = `
  <p>Donna's is a neighborhood restaurant in Echo Park, Los Angeles. We opened in 2019 with a simple idea: honest food, natural wine, and a room where everyone feels at home.</p>
  <p>Our menu changes with the seasons, drawing on whatever looks best at the farmers market. Chef Johnny is committed to working with small California producers who share our values.</p>
  <p>We believe a great restaurant is a reflection of its community. Come as you are.</p>
`;

const SHORT_PARAGRAPH = '<p>Welcome.</p>';

const MENU_HEAVY = `
  <p>Menu items include pasta, pizza, and salads. Check the menu. Daily menu specials available. Menu changes weekly. Menu is seasonal.</p>
`;

const COPYRIGHT_HEAVY = `
  <p>© 2024 All rights reserved. © Company. Copyright notice. All content copyright protected.</p>
  <p>Short text.</p>
`;

const LEGAL_TEXT = `
  <p>By using this site you agree to our Terms of Service and Privacy Policy. Cookie policy applies.</p>
`;

const LINK_SPAM = `
  <p>Home. Menu. About. Contact. Instagram. Reservations. Gallery. Press. Gift Cards.</p>
`;

const VERY_LONG_ABOUT = '<p>' + 'A '.repeat(1200) + '</p>';

// ---------------------------------------------------------------------------
// extractAboutText
// ---------------------------------------------------------------------------

describe('extractAboutText', () => {
  it('extracts clean paragraphs from a <main> element', () => {
    const html = wrapInMain(GOOD_ABOUT_PARAGRAPHS);
    const result = extractAboutText(html);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(ABOUT_EXTRACT_MIN_CHARS);
    expect(result).toContain('Echo Park');
    expect(result).toContain('natural wine');
  });

  it('falls back to <article> when no <main> present', () => {
    const html = wrapInArticle(GOOD_ABOUT_PARAGRAPHS);
    const result = extractAboutText(html);
    expect(result).not.toBeNull();
    expect(result).toContain('Echo Park');
  });

  it('strips nav and footer content from extraction', () => {
    const html = wrapInMain(GOOD_ABOUT_PARAGRAPHS);
    const result = extractAboutText(html);
    // Nav and footer text should not leak into the result
    expect(result).not.toContain('Menu');
    expect(result).not.toContain('Contact');
    expect(result).not.toContain('All rights reserved');
  });

  it('enforces hard cap at ABOUT_EXTRACT_HARD_CAP chars', () => {
    const html = wrapInMain(VERY_LONG_ABOUT);
    const result = extractAboutText(html);
    if (result !== null) {
      expect(result.length).toBeLessThanOrEqual(ABOUT_EXTRACT_HARD_CAP);
    }
  });

  it('returns null when paragraphs are too short/sparse', () => {
    const html = wrapInMain(SHORT_PARAGRAPH);
    const result = extractAboutText(html);
    // 'Welcome.' is 8 chars — well below the 20-char minimum per paragraph
    // and far below the MIN_CHARS threshold for the fallback
    expect(result).toBeNull();
  });

  it('returns null for empty body', () => {
    const result = extractAboutText('<html><body></body></html>');
    expect(result).toBeNull();
  });

  it('collects multiple paragraphs to reach target range', () => {
    // Three paragraphs that together clearly exceed the 180-char minimum
    const html = wrapInMain(`
      <p>Donna's opened in 2019 as a neighborhood restaurant in Echo Park, Los Angeles, with a focus on seasonal cooking.</p>
      <p>We work directly with small California farms and producers, changing the menu to reflect what looks best each week.</p>
      <p>Our wine list is all natural, sourced from small-production importers and local California winemakers we trust.</p>
    `);
    const result = extractAboutText(html);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(ABOUT_EXTRACT_MIN_CHARS);
  });
});

// ---------------------------------------------------------------------------
// checkAboutQuality
// ---------------------------------------------------------------------------

describe('checkAboutQuality', () => {
  it('passes a well-formed about paragraph', () => {
    const text =
      "Donna's is a neighborhood restaurant in Echo Park, Los Angeles. We opened in 2019 with a simple idea: honest food, natural wine, and a room where everyone feels at home. Our menu changes with the seasons.";
    expect(checkAboutQuality(text)).toBe(true);
  });

  it('passes text >= 180 chars even with only 1 sentence', () => {
    // Exactly 1 sentence but long enough
    const text = 'A'.repeat(200) + '.';
    expect(checkAboutQuality(text)).toBe(true);
  });

  it('fails text that is too short (< 180 chars AND < 2 sentences)', () => {
    const text = 'Welcome to Donna\'s.';
    expect(checkAboutQuality(text)).toBe(false);
  });

  it('fails empty string', () => {
    expect(checkAboutQuality('')).toBe(false);
  });

  it('fails copyright-heavy / footer boilerplate', () => {
    // COPYRIGHT_HEAVY has 3+ © matches → fails
    const text = '© 2024 All rights reserved. © Company name. Copyright 2024. Our story is great.';
    expect(checkAboutQuality(text)).toBe(false);
  });

  it('passes text with a single incidental copyright notice', () => {
    const text =
      "Donna's is a neighborhood restaurant in Echo Park. © 2024 Donna's. We opened in 2019 with a simple idea: honest food and natural wine.";
    expect(checkAboutQuality(text)).toBe(true);
  });

  it('fails text containing "Terms of Service"', () => {
    const text =
      'By using this site you agree to our Terms of Service and Privacy Policy. This is a long sentence about legal stuff.';
    expect(checkAboutQuality(text)).toBe(false);
  });

  it('fails text containing "Privacy Policy"', () => {
    const text = 'Please read our Privacy Policy carefully. ' + 'A'.repeat(200);
    expect(checkAboutQuality(text)).toBe(false);
  });

  it('fails menu-dominated text (4+ occurrences of "menu")', () => {
    // MENU_HEAVY has 5 "menu" mentions
    const text =
      'Check the menu. Daily menu specials available. Menu changes weekly. Menu is seasonal. See full menu online.';
    expect(checkAboutQuality(text)).toBe(false);
  });

  it('passes text with 1–2 incidental "menu" mentions', () => {
    const text =
      "Donna's is a neighborhood restaurant. Our menu changes with the seasons, drawing on whatever looks best at the farmers market. We believe a great restaurant is a reflection of its community.";
    expect(checkAboutQuality(text)).toBe(true);
  });

  it('fails link-spam short-segment text', () => {
    // LINK_SPAM — many very short segments separated by punctuation
    const text = 'Home. Menu. About. Contact. Instagram. Reservations. Gallery. Press. Gift Cards.';
    expect(checkAboutQuality(text)).toBe(false);
  });

  it('passes a minimal two-sentence text >= 180 chars', () => {
    const text = 'Donna\'s is a neighborhood restaurant in Echo Park, serving seasonal food and natural wine. ' +
      'We opened in 2019 with the belief that a great neighborhood spot should feel like an extension of your home.';
    expect(checkAboutQuality(text)).toBe(true);
  });
});
