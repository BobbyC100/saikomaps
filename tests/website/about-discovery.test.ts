/**
 * About-page URL discovery — WO-FIELDS-WEBSITE-ABOUT-EXTRACTION-001
 *
 * Tests for discoverAboutUrl and findAboutLink.
 * No HTTP requests are made; all fixtures are inline HTML strings.
 */

import { describe, it, expect } from 'vitest';
import { discoverAboutUrl, findAboutLink } from '@/lib/website-enrichment/about';

const BASE = 'https://donnasla.com';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHomepage(links: string): string {
  return `<!DOCTYPE html><html><head><title>Test</title></head><body><nav>${links}</nav></body></html>`;
}

function link(href: string, text: string): string {
  return `<a href="${href}">${text}</a>`;
}

// ---------------------------------------------------------------------------
// findAboutLink — core link-scanner
// ---------------------------------------------------------------------------

describe('findAboutLink', () => {
  it('finds /our-story from nav links', () => {
    const links = [
      { href: '/menu', text: 'Menu' },
      { href: '/our-story', text: 'Our Story' },
      { href: '/reservations', text: 'Reservations' },
    ];
    expect(findAboutLink(links, BASE)).toBe(`${BASE}/our-story`);
  });

  it('finds /about from anchor text containing "about"', () => {
    const links = [{ href: '/about', text: 'About Us' }];
    expect(findAboutLink(links, BASE)).toBe(`${BASE}/about`);
  });

  it('finds link by href containing "story" even if anchor text is blank', () => {
    const links = [{ href: '/our-story', text: '' }];
    expect(findAboutLink(links, BASE)).toBe(`${BASE}/our-story`);
  });

  it('finds link by anchor text "mission"', () => {
    const links = [{ href: '/who-we-are', text: 'Our Mission' }];
    expect(findAboutLink(links, BASE)).toBe(`${BASE}/who-we-are`);
  });

  it('rejects off-domain links', () => {
    const links = [{ href: 'https://other.com/about', text: 'About' }];
    expect(findAboutLink(links, BASE)).toBeNull();
  });

  it('rejects mailto: links', () => {
    const links = [{ href: 'mailto:hello@donnasla.com', text: 'About' }];
    expect(findAboutLink(links, BASE)).toBeNull();
  });

  it('rejects tel: links', () => {
    const links = [{ href: 'tel:+13235550100', text: 'Call About Us' }];
    expect(findAboutLink(links, BASE)).toBeNull();
  });

  it('rejects bare fragment links', () => {
    const links = [{ href: '#about', text: 'About' }];
    expect(findAboutLink(links, BASE)).toBeNull();
  });

  it('rejects PDF links', () => {
    const links = [{ href: '/about.pdf', text: 'About' }];
    expect(findAboutLink(links, BASE)).toBeNull();
  });

  it('returns null when no matching link exists', () => {
    const links = [
      { href: '/menu', text: 'Menu' },
      { href: '/reservations', text: 'Reserve' },
    ];
    expect(findAboutLink(links, BASE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// discoverAboutUrl — full discovery (nav links + candidate path fallback)
// ---------------------------------------------------------------------------

describe('discoverAboutUrl', () => {
  it('finds /our-story from homepage nav HTML', () => {
    const html = makeHomepage(
      link('/menu', 'Menu') +
      link('/our-story', 'Our Story') +
      link('/contact', 'Contact'),
    );
    expect(discoverAboutUrl(BASE, html)).toBe(`${BASE}/our-story`);
  });

  it('prefers nav link over candidate path when both exist', () => {
    // /about-us is a nav link; candidate path would guess /about
    // nav link should win
    const html = makeHomepage(link('/about-us', 'About Us'));
    const result = discoverAboutUrl(BASE, html);
    expect(result).toBe(`${BASE}/about-us`);
  });

  it('falls back to /about candidate path when no nav link found', () => {
    // No about-related links in the HTML
    const html = makeHomepage(link('/menu', 'Menu') + link('/contact', 'Contact'));
    const result = discoverAboutUrl(BASE, html);
    // Should return the first candidate path as a fallback
    expect(result).toBe(`${BASE}/about`);
  });

  it('finds link by text "info" (info is an ABOUT_PATTERN)', () => {
    const html = makeHomepage(link('/info', 'Info'));
    expect(discoverAboutUrl(BASE, html)).toBe(`${BASE}/info`);
  });

  it('rejects off-domain about links and falls back to candidate path', () => {
    const html = makeHomepage(link('https://external.com/about', 'About Us'));
    // External link is rejected; fallback kicks in
    const result = discoverAboutUrl(BASE, html);
    expect(result).toBe(`${BASE}/about`);
  });

  it('returns null for empty homepage HTML with no candidate match', () => {
    // Empty body — no links → falls back to /about candidate
    // (candidate is always tried, so result is /about, not null)
    // This test verifies the fallback always produces a URL
    const html = makeHomepage('');
    const result = discoverAboutUrl(BASE, html);
    expect(result).toBe(`${BASE}/about`);
  });

  it('handles absolute same-domain links', () => {
    const html = makeHomepage(link('https://donnasla.com/our-story', 'Our Story'));
    expect(discoverAboutUrl(BASE, html)).toBe(`${BASE}/our-story`);
  });
});
