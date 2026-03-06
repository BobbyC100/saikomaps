/**
 * Website About-page discovery and extraction.
 *
 * WO-FIELDS-WEBSITE-ABOUT-EXTRACTION-001
 *
 * Two public entry points:
 *   discoverAboutUrl(homepageUrl, homepageHtml)  → string | null
 *   extractAboutText(html)                       → string | null
 *
 * Plus quality gate:
 *   checkAboutQuality(text)                      → boolean
 *
 * The original `findAboutLink` export is preserved for backward compatibility.
 */

import * as cheerio from 'cheerio';
import { ABOUT_PATTERNS, ABOUT_VISIBLE_TEXT_CAP } from './constants';
import { resolveUrl, isSameDomainAllowed } from './url';
import { parseHtml } from './parse';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Candidate paths to probe when no nav link is found (priority order). */
const CANDIDATE_PATHS = [
  '/about',
  '/about-us',
  '/our-story',
  '/story',
  '/mission',
  '/values',
  '/community',
] as const;

/**
 * Min/max target character counts for the extracted about excerpt.
 * The hard cap is applied after quality checks.
 */
export const ABOUT_EXTRACT_MIN_CHARS = 180;
export const ABOUT_EXTRACT_TARGET_MIN = 280;
export const ABOUT_EXTRACT_TARGET_MAX = 700;
export const ABOUT_EXTRACT_HARD_CAP = ABOUT_VISIBLE_TEXT_CAP; // 2 000

// ---------------------------------------------------------------------------
// Original export (backward-compat)
// ---------------------------------------------------------------------------

/**
 * Scan a pre-parsed link list for an about-page candidate.
 * Kept as the inner implementation — call `discoverAboutUrl` from new code.
 */
export function findAboutLink(
  links: { href: string; text: string }[],
  baseUrl: string,
): string | null {
  const baseOrigin = new URL(baseUrl).origin;
  const lower = (s: string) => s.toLowerCase();

  for (const { href, text } of links) {
    if (!isSameDomainAllowed(href, baseOrigin)) continue;
    const resolved = resolveUrl(href, baseUrl);

    let parsed: URL;
    try {
      parsed = new URL(resolved);
    } catch {
      continue;
    }

    const path = parsed.pathname.toLowerCase();
    if (path.endsWith('.pdf')) continue;

    // Reject mailto / tel / bare fragments
    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (href.startsWith('#')) continue;

    const anchorText = lower(text);
    const pathSegments = path.replace(/^\/+|\/+$/g, '').split('/');
    const pathStr = pathSegments.join(' ');

    for (const pattern of ABOUT_PATTERNS) {
      if (anchorText.includes(pattern) || pathStr.includes(lower(pattern))) {
        return resolved;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/**
 * Discover the best about-page URL for a given site.
 *
 * Priority:
 *  1. Nav / footer links from homepage HTML that match about patterns
 *     (confirmed to exist since they're embedded in the page)
 *  2. First well-known candidate path constructed from the origin
 *     (unverified — caller should handle 404s gracefully)
 *
 * Returns null if neither strategy yields a candidate.
 * Only produces same-origin, non-PDF, non-mailto/tel URLs.
 */
export function discoverAboutUrl(
  homepageUrl: string,
  homepageHtml: string,
): string | null {
  const parsed = parseHtml(homepageHtml);

  // 1. Scan homepage links (nav, footer, body)
  const fromLinks = findAboutLink(parsed.links, homepageUrl);
  if (fromLinks) return fromLinks;

  // 2. Fallback: construct well-known candidate paths
  let origin: string;
  try {
    origin = new URL(homepageUrl).origin;
  } catch {
    return null;
  }

  for (const path of CANDIDATE_PATHS) {
    // Return the first candidate; caller will verify via HTTP
    return `${origin}${path}`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * Extract a clean plain-text excerpt from an about-page HTML document.
 *
 * Strategy (in order):
 *  1. Strip noise: script / style / noscript / nav / header / footer / form / aside
 *  2. Find the richest content container: main > article > known about selectors > body
 *  3. Collect <p> elements, discard short ones (< 20 chars)
 *  4. Accumulate paragraphs until target range [280–700 chars] is met
 *  5. Hard-cap result at ABOUT_EXTRACT_HARD_CAP (2 000 chars)
 *
 * Returns null if no usable paragraphs are found.
 */
export function extractAboutText(html: string): string | null {
  const $ = cheerio.load(html);

  // Strip noisy elements
  $(
    'script, style, noscript, nav, header, footer, form, aside, ' +
    '[class*="cookie"], [class*="banner"], [class*="popup"], ' +
    '[class*="newsletter"], [class*="subscribe"], [aria-label="navigation"]',
  ).remove();

  // Find the richest content root in priority order
  const CONTENT_SELECTORS = [
    'main',
    'article',
    '[id*="about"]',
    '[class*="about"]',
    '[id*="story"]',
    '[class*="story"]',
    '[id*="content"]',
    '[class*="content"]',
    'body',
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let $root: cheerio.Cheerio<any> | null = null;
  for (const sel of CONTENT_SELECTORS) {
    const el = $(sel).first();
    if (el.length) {
      $root = el;
      break;
    }
  }

  if (!$root) return null;

  // Collect paragraph text
  const paragraphs: string[] = [];
  $root.find('p').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length >= 20) paragraphs.push(text);
  });

  if (paragraphs.length === 0) {
    // Fallback: try the visible text of the root itself
    const fallback = $root.text().replace(/\s+/g, ' ').trim();
    if (fallback.length >= ABOUT_EXTRACT_MIN_CHARS) {
      return fallback.slice(0, ABOUT_EXTRACT_HARD_CAP);
    }
    return null;
  }

  // Accumulate until we hit the target range
  let accumulated = '';
  for (const p of paragraphs) {
    const next = accumulated ? `${accumulated} ${p}` : p;
    accumulated = next;
    if (accumulated.length >= ABOUT_EXTRACT_TARGET_MIN) break;
  }

  // If still under minimum after all paragraphs, return null (too sparse)
  if (accumulated.length < ABOUT_EXTRACT_MIN_CHARS) return null;

  // Hard cap
  return accumulated.slice(0, ABOUT_EXTRACT_HARD_CAP);
}

// ---------------------------------------------------------------------------
// Quality gate
// ---------------------------------------------------------------------------

/**
 * Returns true if the extracted text passes all quality gates.
 *
 * Fails if any of:
 *  - Too short (< 180 chars AND < 2 sentences)
 *  - Heavy copyright / footer boilerplate (> 1 occurrence of © / copyright)
 *  - Dominated by legal / menu text
 *  - Appears to be mostly link lists (average "sentence" < 15 chars)
 */
export function checkAboutQuality(text: string): boolean {
  if (!text || text.length === 0) return false;

  // Length: at least 180 chars OR 2 sentences
  const sentenceCount = (text.match(/[.!?]+/g) ?? []).length;
  if (text.length < ABOUT_EXTRACT_MIN_CHARS && sentenceCount < 2) return false;

  // Footer/boilerplate: too many copyright symbols
  const copyrightMatches = (text.match(/©|copyright|all rights reserved/gi) ?? []).length;
  if (copyrightMatches > 1) return false;

  // Legal / menu dominance
  const legalKeywords = /\b(terms of service|privacy policy|cookie policy|legal notice)\b/i;
  if (legalKeywords.test(text)) return false;

  const menuMentions = (text.match(/\bmenu\b/gi) ?? []).length;
  // Allow 1–2 incidental "menu" mentions; reject if the text is menu-focused
  if (menuMentions >= 4) return false;

  // Link-list heuristic: if the average word-run between punctuation is very short,
  // it looks like a list of short labels (nav items, menu links, etc.)
  const segments = text.split(/[.!?,;]+/).map((s) => s.trim()).filter(Boolean);
  if (segments.length >= 5) {
    const avgLen = segments.reduce((sum, s) => sum + s.length, 0) / segments.length;
    if (avgLen < 15) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface AboutExtractionResult {
  aboutUrl: string;
  aboutRaw: string;
  charCount: number;
  preview: string; // first 200 chars
}
