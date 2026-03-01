/**
 * Operator extraction from scraped HTML.
 * Extracts operator name candidates, venues, evidence, and confidence.
 * Phase 1: Title, H1, meta, footer copyright, LD+JSON, nav/links.
 */

import * as cheerio from "cheerio";
import { parseHtml } from "./parse";
import { resolveUrl } from "./url";

/** Keywords for nav/links that indicate venue lists (locations page) */
const VENUE_LINK_PATTERNS = [
  "our restaurants",
  "our locations",
  "locations",
  "restaurants",
  "family",
  "group",
  "venues",
  "concepts",
  "concept",
  "portfolio",
];

/** Path substrings that indicate an index/locations page (one-level crawl) */
const INDEX_PAGE_PATH_PATTERNS = [
  "/restaurants",
  "/locations",
  "/venues",
  "/dining",
  "/portfolio",
];

/** Path segments to exclude when extracting venue links from index page (nav, not venues) */
const INDEX_NAV_PATH_SEGMENTS = new Set([
  "restaurants",
  "locations",
  "venues",
  "dining",
  "portfolio",
  "contact",
  "about",
  "privacy",
  "terms",
  "careers",
  "events",
  "reservations",
]);

/** Names to drop when extracting from visible text (Squarespace fallback) */
const VENUE_NAME_NOISE = new Set([
  "restaurants",
  "locations",
  "our restaurants",
  "our locations",
  "venues",
  "learn more",
  "view details",
  "click here",
  "home",
  "menu",
  "contact",
  "about",
  "back",
  "next",
  "more",
  "see all",
  "all locations",
  "gallery",
  "portfolio",
  "los angeles times",
  "new york times",
]);

/**
 * Normalize URL path for index page detection: lowercase, strip trailing slash.
 */
function normalizePathForIndexMatch(path: string): string {
  let p = path || "/";
  if (!p.startsWith("/")) p = "/" + p;
  p = p.toLowerCase().replace(/\/+$/, "") || "/";
  return p;
}

/**
 * Find first same-origin link that points to an index page (/restaurants, /locations, etc.).
 * Used for one-level crawl: depth 1 only, max 1 additional page.
 */
export function findIndexPageUrl(
  links: { href: string; text: string }[],
  baseUrl: string
): string | null {
  try {
    const baseOrigin = new URL(baseUrl).origin;
    for (const { href } of links) {
      const resolved = resolveUrl(href, baseUrl);
      const u = new URL(resolved);
      if (u.origin !== baseOrigin) continue;
      const pathNorm = normalizePathForIndexMatch(u.pathname);
      const isIndexPage = INDEX_PAGE_PATH_PATTERNS.some((pat) => pathNorm.includes(pat));
      if (isIndexPage) return resolved;
    }
  } catch {
    // skip parse errors
  }
  return null;
}

/** LD+JSON types that indicate structured organization schema */
const STRUCTURED_ORG_TYPES = new Set([
  "Organization",
  "Corporation",
  "LocalBusiness",
  "WebSite",
]);

/** Patterns suggesting org/company name (not a single venue) */
const ORG_SUFFIXES = ["group", "family", "restaurants", "hospitality", "company", "llc", "inc"];

export interface VenueFound {
  name: string;
  url?: string;
  address?: string;
  source_url: string;
  confidence: number;
}

export interface OperatorExtractResult {
  operator_name_candidates: string[];
  operator_name: string | null;
  canonical_domain: string;
  website: string;
  venues_found: VenueFound[];
  evidence: Record<string, unknown>;
  confidence: number;
  /** Signals for lean Actor.sources (audit-level only) */
  signals: {
    structured_schema: boolean;
    locations_page_detected: boolean;
    footer_match: boolean;
  };
}

function normalizeCandidate(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function isLikelyOrgName(s: string): boolean {
  if (!s || s.length < 2 || s.length > 120) return false;
  const lower = s.toLowerCase();
  return (
    ORG_SUFFIXES.some((suf) => lower.includes(suf)) ||
    lower.includes(" & ") ||
    /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+/.test(s)
  );
}

function extractCopyrightOwner(text: string): string | null {
  const m = text.match(/©\s*\d{4}\s*([^.|]+)/i) || text.match(/©\s*([^.|]+)/i);
  if (!m) return null;
  const name = normalizeCandidate(m[1]);
  return name.length >= 2 && name.length <= 120 ? name : null;
}

function hasStructuredOrganizationSchema(blocks: unknown[]): boolean {
  for (const block of blocks) {
    const obj = block as { "@type"?: string | string[] };
    const type = obj["@type"];
    const typeArr = Array.isArray(type) ? type : type ? [type] : [];
    if (typeArr.some((t) => typeof t === "string" && STRUCTURED_ORG_TYPES.has(t))) {
      return true;
    }
  }
  return false;
}

function extractOrgNamesFromLdJson(blocks: unknown[]): string[] {
  const names: string[] = [];
  const orgTypes = new Set(["Organization", "Corporation", "LocalBusiness", "WebSite", "Restaurant"]);
  for (const block of blocks) {
    const obj = block as { "@type"?: string | string[]; name?: string };
    const type = obj["@type"];
    const typeArr = Array.isArray(type) ? type : type ? [type] : [];
    const hasOrgType = typeArr.some((t) => typeof t === "string" && orgTypes.has(t));
    if (hasOrgType && typeof obj.name === "string" && obj.name.trim()) {
      const n = normalizeCandidate(obj.name);
      if (n && !names.includes(n)) names.push(n);
    }
  }
  return names;
}

function extractVenuesFromLinks(
  links: { href: string; text: string }[],
  baseUrl: string,
  sourceUrl: string
): VenueFound[] {
  const venues: VenueFound[] = [];
  const seen = new Set<string>();

  try {
    const baseOrigin = new URL(baseUrl).origin;
    for (const { href, text } of links) {
      const lowerText = text.toLowerCase();
      const lowerHref = href.toLowerCase();
      const matches =
        VENUE_LINK_PATTERNS.some((p) => lowerText.includes(p)) ||
        VENUE_LINK_PATTERNS.some((p) => lowerHref.includes(p));

      if (!matches) continue;

      const resolved = resolveUrl(href, baseUrl);
      const u = new URL(resolved);
      const sameOrigin = u.origin === baseOrigin;
      const linkText = normalizeCandidate(text);
      if (!linkText || linkText.length < 2) continue;

      const key = `${linkText}|${resolved}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Lightweight heuristic: same-origin link on locations page = higher confidence
      const confidence = sameOrigin ? 0.7 : 0.5;

      venues.push({
        name: linkText,
        url: resolved,
        source_url: sourceUrl,
        confidence,
      });
    }
  } catch {
    // skip on parse errors
  }

  return venues.slice(0, 50);
}

function getFooterText($: cheerio.CheerioAPI): string {
  const selectors = ["footer", ".footer", "#footer", "[role='contentinfo']"];
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) return el.text().replace(/\s+/g, " ").trim().slice(0, 500);
  }
  return "";
}

function isVenueNameNoise(name: string): boolean {
  const n = name.replace(/\s+/g, " ").trim();
  if (n.length < 3) return true;
  if (/^\d+$/.test(n)) return true;
  const lower = n.toLowerCase();
  if (VENUE_NAME_NOISE.has(lower)) return true;
  if (VENUE_NAME_NOISE.has(lower.replace(/\s+/g, " "))) return true;
  return false;
}

/** Extract last path segment from href: /hermons -> hermons, /restaurants/la -> la */
function slugSegmentFromHref(href: string): string {
  const p = href.replace(/^\/+|\/+$/g, "").split("/");
  return p[p.length - 1] || "";
}

/** Title-case a slug: hermons -> Hermons, hermon-s -> Hermon S */
function titleCaseSlug(slug: string): string {
  if (!slug) return "";
  return slug
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Extract venue links from index page when link extraction yields zero.
 * Image-only links have no anchor text — derive name from nearest heading or path slug.
 * Same-origin relative hrefs only; exclude nav paths (/restaurants, /contact, etc.).
 */
export function extractVenuesFromIndexPageLinks(
  html: string,
  indexPageUrl: string,
  sourceUrl: string
): VenueFound[] {
  const venues: VenueFound[] = [];
  const seen = new Set<string>();
  const $ = cheerio.load(html);

  try {
    const baseOrigin = new URL(indexPageUrl).origin;
    $('a[href^="/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      if (href.endsWith(".pdf") || href.includes("mailto:") || href.includes("tel:")) return;

      const resolved = resolveUrl(href, indexPageUrl);
      const u = new URL(resolved);
      if (u.origin !== baseOrigin) return;

      const pathSeg = slugSegmentFromHref(href);
      if (!pathSeg || INDEX_NAV_PATH_SEGMENTS.has(pathSeg.toLowerCase())) return;

      const linkText = $(el).text().replace(/\s+/g, " ").trim();
      let name: string;

      if (linkText && linkText.length >= 2 && !isVenueNameNoise(linkText)) {
        name = linkText;
      } else {
        const $el = $(el);
        const inside = $el.find("h1, h2, h3, h4").first().text().replace(/\s+/g, " ").trim();
        const prevSib = $el.prevAll("h1, h2, h3, h4").first().text().replace(/\s+/g, " ").trim();
        const nextSib = $el.nextAll("h1, h2, h3, h4").first().text().replace(/\s+/g, " ").trim();
        const container = $el.closest("div, section, article, .Index-item, .sqs-block");
        const inBlock = container.find("h1, h2, h3, h4").first().text().replace(/\s+/g, " ").trim();
        const heading = inside || prevSib || nextSib || inBlock;
        if (heading && heading.length >= 2 && !isVenueNameNoise(heading)) {
          name = heading;
        } else {
          name = titleCaseSlug(pathSeg);
        }
      }

      if (!name || name.length < 2 || name.length > 120) return;
      if (isVenueNameNoise(name)) return;

      const key = `${name.toLowerCase()}|${resolved}`;
      if (seen.has(key)) return;
      seen.add(key);

      venues.push({
        name,
        url: resolved,
        source_url: sourceUrl,
        confidence: 0.6,
      });
    });
  } catch {
    // skip parse errors
  }

  return venues.slice(0, 50);
}

/**
 * Extract venue names from visible text when link-based extraction yields zero.
 * Squarespace / CMS pages often use headings, captions, gallery titles instead of links.
 * Headings (h1–h4), figcaption, img alt, gallery/list item titles.
 */
export function extractVenueNamesFromVisibleText(
  html: string,
  indexPageUrl: string,
  sourceUrl: string
): VenueFound[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const names: string[] = [];

  const add = (raw: string) => {
    const n = raw.replace(/\s+/g, " ").trim();
    if (!n || n.length < 3 || n.length > 120) return;
    if (isVenueNameNoise(n)) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    names.push(n);
  };

  // Headings h1–h4
  $("h1, h2, h3, h4").each((_, el) => {
    const text = $(el).text();
    if (text) add(text);
  });

  // Figcaption, img alt
  $("figcaption").each((_, el) => {
    const text = $(el).text();
    if (text) add(text);
  });
  $("img[alt]").each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt && alt.length > 2) add(alt);
  });

  // Gallery/list item titles (common Squarespace / CMS patterns)
  $(
    ".image-caption, .gallery-caption, .list-item-title, .Index-page-content h2, .Index-page-content h3, [data-section-title]"
  ).each((_, el) => {
    const text = $(el).text();
    if (text) add(text);
  });

  // Block content headings inside main content
  $("main h2, main h3, .content-block h2, .content-block h3").each(
    (_, el) => {
      const text = $(el).text();
      if (text) add(text);
    }
  );

  return names.slice(0, 50).map((name) => ({
    name,
    url: indexPageUrl,
    source_url: sourceUrl,
    confidence: 0.4,
  }));
}

/**
 * Extract operator signals from URL + HTML.
 */
export function extractOperatorSignals(params: { url: string; html: string }): OperatorExtractResult {
  const { url, html } = params;

  const parsed = parseHtml(html);
  const $ = cheerio.load(html);

  const candidates: string[] = [];

  // Title, H1, meta
  for (const raw of [parsed.title, parsed.h1, parsed.metaDescription]) {
    if (raw) {
      const n = normalizeCandidate(raw);
      if (n && !candidates.includes(n)) candidates.push(n);
    }
  }

  // Footer copyright
  let copyrightName: string | null = null;
  const footerText = getFooterText($);
  if (footerText) {
    copyrightName = extractCopyrightOwner(footerText);
    if (copyrightName && !candidates.includes(copyrightName)) candidates.push(copyrightName);
  }

  // LD+JSON Organization / WebSite / Restaurant
  const ldNames = extractOrgNamesFromLdJson(parsed.schemaBlocks);
  const hasStructuredSchema = hasStructuredOrganizationSchema(parsed.schemaBlocks);
  for (const n of ldNames) {
    if (n && !candidates.includes(n)) candidates.push(n);
  }

  // Venues from nav/links (locations page)
  const venuesFound = extractVenuesFromLinks(parsed.links, url, url);
  const hasLocationsPage = venuesFound.length > 0;

  // Pick best operator name: prefer org-like, then first candidate
  let operatorName: string | null = null;
  const orgLike = candidates.filter(isLikelyOrgName);
  if (orgLike.length > 0) operatorName = orgLike[0];
  else if (candidates.length > 0) operatorName = candidates[0];

  const footerMatch = Boolean(
    operatorName && copyrightName && copyrightName === operatorName
  );
  const strongNameRepetition =
    Boolean(operatorName) &&
    [parsed.title, parsed.h1].filter(
      (r) => r && normalizeCandidate(r) === operatorName
    ).length >= 2;

  // Confidence scoring (0–1)
  // Structured schema and locations page are strong signals.
  // Footer copyright and name repetition add incremental confidence.
  let confidence = 0;
  if (hasStructuredSchema) confidence += 0.4;
  if (hasLocationsPage) confidence += 0.2;
  if (footerMatch) confidence += 0.2;
  if (strongNameRepetition) confidence += 0.2;
  confidence = Math.min(confidence, 1);

  // Fallback: if we have operator name but no other signals
  if (confidence === 0 && operatorName) confidence = 0.4;

  const origin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  })();
  const canonicalDomain = origin.replace(/^https?:\/\//, "").replace(/^www\./, "");

  return {
    operator_name_candidates: [...new Set(candidates)],
    operator_name: operatorName,
    canonical_domain: canonicalDomain,
    website: origin,
    venues_found: venuesFound,
    evidence: {
      title: parsed.title,
      h1: parsed.h1,
      meta_description: parsed.metaDescription,
      operator_name_candidates: candidates,
    },
    confidence,
    signals: {
      structured_schema: hasStructuredSchema,
      locations_page_detected: hasLocationsPage,
      footer_match: footerMatch,
    },
  };
}
