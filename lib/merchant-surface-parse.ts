/**
 * Merchant Surface Parse Pass — v1
 * SKAI-WO-FIELDS-SURFACE-PARSE-001
 *
 * Stage 4 of the merchant ingestion pipeline.
 * Reads stored HTML evidence from merchant_surfaces and produces structured
 * parse artifacts, written to merchant_surface_artifacts.
 *
 * CONTRACTS
 *   ✓  No network calls — operates only on raw_html / raw_text already in DB
 *   ✓  Deterministic — same HTML always produces identical artifact_json
 *   ✓  Replay-safe — deduplicates on (merchant_surface_id, artifact_type, artifact_version)
 *   ✓  Evidence rows are never modified — artifacts go to a separate table
 *   ✓  Absence of signals is NOT a failure; failure = parser crash or unreadable HTML
 *
 * PARSE STATE LIFECYCLE
 *   parse_pending  →  parse_success  (artifact written)
 *   parse_pending  →  parse_failed   (parser crash / unreadable HTML)
 *
 * NOTE: The merchant_surfaces immutability trigger was updated in migration
 * 20260309000000 to permit updates to parse_status and extraction_status.
 * All evidence columns remain permanently frozen.
 */

import { db as prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// Artifact constants
// ---------------------------------------------------------------------------

export const ARTIFACT_TYPE    = 'parse_v1' as const;
export const ARTIFACT_VERSION = '1'        as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParseArtifactV1 {
  /** <title> tag content */
  page_title: string | null;
  /** <meta name="description"> content */
  meta_description: string | null;
  /** <link rel="canonical"> href */
  canonical_url: string | null;

  /** Heading text extracted from the page */
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };

  /** All anchor links, split by origin */
  links: {
    internal: string[];
    external: string[];
  };

  /**
   * Surface-level hint links.
   * A single URL may appear in multiple hint categories.
   */
  surface_hints: {
    menu_links:        string[];
    reservation_links: string[];
    order_links:       string[];
    event_links:       string[];
    social_links:      string[];
  };

  /**
   * Visible paragraph text blocks (non-empty, ≥ 30 chars, max 20 blocks).
   * Ordered by appearance in the document.
   */
  text_blocks: string[];

  /**
   * Platform signals detected from URLs, script tags, and domain analysis.
   * An item can appear in multiple categories (e.g. Toast may be both
   * ordering and website_platform when a restaurant is fully on Toast).
   */
  platform_hints: {
    /** Reservation booking platforms found on the page */
    reservation: string[];
    /** Online ordering platforms linked from the page */
    ordering: string[];
    /** Site infrastructure / website builder platform */
    website_platform: string[];
    /** Social profiles detected */
    social: {
      instagram: string | null;
      tiktok: string | null;
      facebook: string | null;
    };
  };
}

// ---------------------------------------------------------------------------
// Platform detection patterns
// ---------------------------------------------------------------------------

/** Reservation platforms — detected via any external link to these domains */
const RESERVATION_LINK_PATTERNS: Array<{ platform: string; re: RegExp }> = [
  { platform: 'resy',        re: /resy\.com/i },
  { platform: 'opentable',   re: /opentable\.com/i },
  { platform: 'tock',        re: /(?:exploretock|tock)\.com/i },
  { platform: 'sevenrooms',  re: /sevenrooms\.com/i },
  { platform: 'yelp',        re: /yelp\.com\/reservations/i },
  { platform: 'reserve',     re: /reserve\.com/i },
  { platform: 'tablein',     re: /tablein\.com/i },
  { platform: 'bentobox',    re: /(?:getbento|bentobox)\.com.*reserv/i },
];

/**
 * Ordering platforms — detected via external links.
 * For Toast / Clover / Square: only flag as ordering when the URL contains
 * an ordering-specific path component, not just any link to their domain.
 */
const ORDERING_LINK_PATTERNS: Array<{ platform: string; re: RegExp }> = [
  { platform: 'doordash', re: /doordash\.com/i },
  { platform: 'ubereats',  re: /ubereats\.com/i },
  { platform: 'chownow',   re: /chownow\.com/i },
  // Toast ordering: order subdomain or explicit /order path
  { platform: 'toast',     re: /(?:order\.toasttab\.com|toasttab\.com\/[a-z0-9%-]+\/(?:order|v3))/i },
  // Clover ordering: online order paths
  { platform: 'clover',    re: /clover\.com\/[a-z0-9-]+\/(?:order|apps\/(?:com\.clover\.order))/i },
  // Square ordering: squareup store or square.site storefront
  { platform: 'square',    re: /(?:squareup\.com\/store|squareup\.com\/online|square\.site)/i },
];

/**
 * Website platform — detected via <script src> attributes.
 * These indicate the site itself is built on or served by the platform.
 */
const WEBSITE_PLATFORM_SCRIPT_PATTERNS: Array<{ platform: string; re: RegExp }> = [
  { platform: 'bentobox', re: /(?:getbento|bentobox)\.com/i },
  { platform: 'shopify',  re: /(?:cdn\.shopify|assets\.shopify|myshopify)\.com/i },
  // Toast site builder scripts (distinct from toast ordering widget)
  { platform: 'toast',    re: /(?:cdn-prod\.toasttab|toastpos\.com|toasttab\.com\/web-app)/i },
  // Clover site scripts
  { platform: 'clover',   re: /(?:static\.clover|resources\.clover)\.com/i },
  // Square site builder
  { platform: 'square',   re: /(?:cdn\.sq-cdn|square-cdn)\.com/i },
];

/**
 * Website platform — detected when the source URL domain itself belongs to
 * the platform (i.e. the restaurant's site IS the platform's hosted page).
 */
const WEBSITE_PLATFORM_DOMAIN_PATTERNS: Array<{ platform: string; re: RegExp }> = [
  { platform: 'bentobox', re: /(?:getbento|bentobox)\.com/i },
  { platform: 'shopify',  re: /myshopify\.com/i },
  { platform: 'toast',    re: /toasttab\.com/i },
  { platform: 'clover',   re: /clover\.com/i },
  { platform: 'square',   re: /squareup\.com/i },
];

// ---------------------------------------------------------------------------
// Surface hint link patterns
// ---------------------------------------------------------------------------

const MENU_LINK_PATTERNS:        RegExp[] = [/\/menus?\b/i, /\/food\b/i, /\/drinks?\b/i, /\/wine\b/i, /\/cocktails?\b/i, /\/beverages?\b/i, /\/dinner\b/i, /\/lunch\b/i, /\/brunch\b/i, /popmenu\.com/i, /(?:getbento|bentobox)\.com.*\/menu/i, /toasttab\.com.*\/menu/i, /\.pdf$/i];
const RESERVATION_LINK_URL_PATS: RegExp[] = [/resy\.com/i, /opentable\.com/i, /(?:exploretock|tock)\.com/i, /sevenrooms\.com/i, /yelp\.com\/reservations/i, /reserve\.com/i, /tablein\.com/i, /(?:getbento|bentobox)\.com.*reserv/i, /\/reservations?\b/i, /\/reserve\b/i, /\/book(?:ing)?\b/i];
const ORDER_LINK_URL_PATS:       RegExp[] = [/doordash\.com/i, /ubereats\.com/i, /chownow\.com/i, /toasttab\.com/i, /clover\.com/i, /squareup\.com\/store/i, /square\.site/i, /\/order\b/i, /\/online-order/i];
const EVENT_LINK_URL_PATS:       RegExp[] = [/^\/events?(?:\/|$|\?)/i, /^\/private[_-]?dining/i, /^\/private[_-]?events?/i, /^\/group[_-]?dining/i, /^\/catering/i, /^\/host(?:\/|$|\?)/i, /^\/buyout/i, /^\/celebrations?/i, /^\/parties/i];
const SOCIAL_LINK_URL_PATS:      RegExp[] = [/instagram\.com/i, /facebook\.com/i, /twitter\.com/i, /x\.com/i, /tiktok\.com/i, /linkedin\.com/i, /youtube\.com/i];

// ---------------------------------------------------------------------------
// HTML extraction utilities
// ---------------------------------------------------------------------------

/** Strip all HTML tags from a fragment and collapse whitespace. */
function stripTags(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Remove <script> and <style> blocks from HTML before further processing. */
function removeInert(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

/** Extract content of the first matching single tag (e.g. <title>). */
function extractSingleTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m  = re.exec(html);
  if (!m) return null;
  const text = stripTags(m[1]);
  return text || null;
}

/** Extract text content from all instances of a block tag (h1/h2/h3/p). */
function extractAllTagText(html: string, tag: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = stripTags(m[1]);
    if (text) results.push(text);
  }
  return results;
}

/**
 * Extract a <meta> tag's content attribute.
 * Handles both attribute orders:
 *   <meta name="X" content="Y">
 *   <meta content="Y" name="X">
 */
function extractMeta(html: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match: name/property="X" ... content="Y"  or  content="Y" ... name/property="X"
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escapedName}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) return m[1].trim() || null;
  }
  return null;
}

/** Extract <link rel="canonical" href="..."> value. */
function extractCanonical(html: string): string | null {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) return m[1].trim() || null;
  }
  return null;
}

/** Extract all <a href="..."> URLs from HTML. */
function extractHrefs(html: string): string[] {
  const results: string[] = [];
  const re = /<a\b[^>]*\shref=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      results.push(href);
    }
  }
  return results;
}

/** Extract all <script src="..."> URLs from HTML. */
function extractScriptSrcs(html: string): string[] {
  const results: string[] = [];
  const re = /<script\b[^>]*\ssrc=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

// ---------------------------------------------------------------------------
// Core parse sections
// ---------------------------------------------------------------------------

function parseHeadings(html: string): ParseArtifactV1['headings'] {
  const cleaned = removeInert(html);
  return {
    h1: extractAllTagText(cleaned, 'h1'),
    h2: extractAllTagText(cleaned, 'h2'),
    h3: extractAllTagText(cleaned, 'h3'),
  };
}

/**
 * Classify all anchor links from the page into internal vs. external.
 * Relative URLs are resolved against sourceUrl.
 */
function parseLinks(
  html: string,
  sourceUrl: string,
): ParseArtifactV1['links'] {
  let base: URL;
  try {
    base = new URL(sourceUrl);
  } catch {
    return { internal: [], external: [] };
  }

  const internal = new Set<string>();
  const external = new Set<string>();

  for (const raw of extractHrefs(html)) {
    if (raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;
    try {
      const url = new URL(raw, sourceUrl);
      // Normalise: strip fragment, keep everything else
      url.hash = '';
      if (url.origin === base.origin) {
        internal.add(url.href);
      } else {
        external.add(url.href);
      }
    } catch {
      // Malformed URL — skip
    }
  }

  return {
    internal: [...internal],
    external: [...external],
  };
}

/** Classify links into surface-level hint buckets. */
function parseSurfaceHints(
  allLinks: string[],
): ParseArtifactV1['surface_hints'] {
  const menu        = new Set<string>();
  const reservation = new Set<string>();
  const order       = new Set<string>();
  const event       = new Set<string>();
  const social      = new Set<string>();

  for (const link of allLinks) {
    if (MENU_LINK_PATTERNS.some((p)        => p.test(link))) menu.add(link);
    if (RESERVATION_LINK_URL_PATS.some((p) => p.test(link))) reservation.add(link);
    if (ORDER_LINK_URL_PATS.some((p)       => p.test(link))) order.add(link);
    if (EVENT_LINK_URL_PATS.some((p)       => p.test(link))) event.add(link);
    if (SOCIAL_LINK_URL_PATS.some((p)      => p.test(link))) social.add(link);
  }

  return {
    menu_links:        [...menu],
    reservation_links: [...reservation],
    order_links:       [...order],
    event_links:       [...event],
    social_links:      [...social],
  };
}

/**
 * Extract visible paragraph text blocks.
 * Skips blocks shorter than minLength characters.
 * Caps at maxBlocks to keep artifact_json size manageable.
 */
function parseTextBlocks(
  html: string,
  minLength = 30,
  maxBlocks  = 20,
): string[] {
  const cleaned = removeInert(html);
  const blocks  = extractAllTagText(cleaned, 'p')
    .filter((t) => t.length >= minLength)
    .slice(0, maxBlocks);
  return blocks;
}

/**
 * Detect platform signals from URLs, script tags, and domain analysis.
 *
 * Toast, Clover, and Square disambiguation:
 *  - ordering  → link to platform with ordering-specific path pattern
 *  - website_platform → platform script loaded, OR site domain IS the platform
 *
 * Both may be true simultaneously (e.g. fully Toast-hosted restaurant).
 */
function parsePlatformHints(
  html: string,
  sourceUrl: string,
  externalLinks: string[],
): ParseArtifactV1['platform_hints'] {
  const reservationSet:    Set<string> = new Set();
  const orderingSet:       Set<string> = new Set();
  const websitePlatformSet: Set<string> = new Set();
  let instagram: string | null = null;
  let tiktok: string | null = null;
  let facebook: string | null = null;

  // --- Reservation: scan all external links ---
  for (const link of externalLinks) {
    for (const { platform, re } of RESERVATION_LINK_PATTERNS) {
      if (re.test(link)) reservationSet.add(platform);
    }
  }

  // --- Ordering: scan all external links for ordering-specific patterns ---
  for (const link of externalLinks) {
    for (const { platform, re } of ORDERING_LINK_PATTERNS) {
      if (re.test(link)) orderingSet.add(platform);
    }
    // Instagram handle detection from social links
    const igMatch = link.match(/instagram\.com\/([^/?#\s]+)/i);
    if (igMatch && igMatch[1] !== 'p' && igMatch[1] !== 'reel' && igMatch[1] !== 'explore') {
      if (!instagram) {
        instagram = `https://www.instagram.com/${igMatch[1]}/`;
      }
    }
    // TikTok handle detection
    const tkMatch = link.match(/tiktok\.com\/@?([a-zA-Z0-9._]+)/i);
    if (tkMatch && tkMatch[1] !== 'embed') {
      if (!tiktok) {
        tiktok = `https://www.tiktok.com/@${tkMatch[1]}`;
      }
    }
    // Facebook page detection
    const fbMatch = link.match(/facebook\.com\/([^/?#\s]+)/i);
    if (fbMatch && !['sharer', 'share', 'dialog', 'plugins', 'tr'].includes(fbMatch[1])) {
      if (!facebook) {
        facebook = `https://www.facebook.com/${fbMatch[1]}`;
      }
    }
  }

  // --- Website platform: script-src analysis ---
  const scriptSrcs = extractScriptSrcs(html);
  for (const src of scriptSrcs) {
    for (const { platform, re } of WEBSITE_PLATFORM_SCRIPT_PATTERNS) {
      if (re.test(src)) websitePlatformSet.add(platform);
    }
  }

  // --- Website platform: source domain analysis ---
  for (const { platform, re } of WEBSITE_PLATFORM_DOMAIN_PATTERNS) {
    if (re.test(sourceUrl)) websitePlatformSet.add(platform);
  }

  return {
    reservation:      [...reservationSet],
    ordering:         [...orderingSet],
    website_platform: [...websitePlatformSet],
    social: { instagram, tiktok, facebook },
  };
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

/**
 * Parse a captured HTML page into a structured ParseArtifactV1.
 *
 * This function is pure and deterministic: given the same html + sourceUrl
 * it will always produce the same output. It performs no I/O.
 *
 * Returns a result object so the caller can distinguish parse failures from
 * legitimate empty results (no-signals is not a failure).
 */
export type ParseResult =
  | { ok: true;  artifact: ParseArtifactV1 }
  | { ok: false; error: string };

export function parseSurfaceHtml(
  html: string,
  sourceUrl: string,
): ParseResult {
  if (!html || html.trim().length === 0) {
    return { ok: false, error: 'empty_html' };
  }

  try {
    const page_title      = extractSingleTag(html, 'title');
    const meta_description = extractMeta(html, 'description')
      ?? extractMeta(html, 'og:description');
    const canonical_url   = extractCanonical(html);

    const headings = parseHeadings(html);

    const links       = parseLinks(html, sourceUrl);
    const allLinks    = [...links.internal, ...links.external];

    const surface_hints = parseSurfaceHints(allLinks);

    const text_blocks = parseTextBlocks(html);

    const platform_hints = parsePlatformHints(html, sourceUrl, links.external);

    const artifact: ParseArtifactV1 = {
      page_title,
      meta_description,
      canonical_url,
      headings,
      links,
      surface_hints,
      text_blocks,
      platform_hints,
    };

    return { ok: true, artifact };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `parser_exception: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Database types
// ---------------------------------------------------------------------------

export interface SurfaceParseRow {
  id:          string;
  entityId:   string;
  surfaceType: string;
  sourceUrl:  string;
  rawHtml:    string | null;
  rawText:    string | null;
}

// ---------------------------------------------------------------------------
// DB queries
// ---------------------------------------------------------------------------

/**
 * Find merchant_surfaces rows that are ready for the parse pass.
 * Selects rows where:
 *   fetch_status = 'fetch_success'
 *   parse_status = 'parse_pending'
 */
export async function findSurfacesToParse(params: {
  limit?:       number;
  surfaceType?: string;
  entityId?:    string;
}): Promise<SurfaceParseRow[]> {
  const { limit = 50, surfaceType, entityId } = params;

  const rows = await prisma.merchant_surfaces.findMany({
    where: {
      fetchStatus:  'fetch_success',
      parseStatus:  'parse_pending',
      ...(surfaceType ? { surfaceType: surfaceType } : {}),
      ...(entityId    ? { entityId:    entityId }    : {}),
    },
    select: {
      id:           true,
      entityId:    true,
      surfaceType: true,
      sourceUrl:   true,
      rawHtml:     true,
      rawText:     true,
    },
    take:     limit,
    orderBy:  { discoveredAt: 'asc' },
  });

  return rows;
}

/**
 * Check whether a parse artifact already exists for this surface + type + version.
 * Used for deduplication before writing.
 */
async function artifactExists(
  merchantSurfaceId: string,
  artifactType:      string,
  artifactVersion:   string,
): Promise<boolean> {
  const existing = await prisma.merchant_surface_artifacts.findFirst({
    where: {
      merchantSurfaceId: merchantSurfaceId,
      artifactType:       artifactType,
      artifactVersion:    artifactVersion,
    },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Write a parse artifact to merchant_surface_artifacts.
 * Assumes deduplication check has already been done by the caller.
 */
async function writeArtifact(
  merchantSurfaceId: string,
  artifact:          ParseArtifactV1,
): Promise<void> {
  await prisma.merchant_surface_artifacts.create({
    data: {
      merchantSurfaceId: merchantSurfaceId,
      artifactType:       ARTIFACT_TYPE,
      artifactVersion:    ARTIFACT_VERSION,
      artifactJson:       artifact as object,
    },
  });
}

/**
 * Update parse_status on a merchant_surfaces row.
 *
 * IMPORTANT: Only parse_status and extraction_status may be updated on
 * merchant_surfaces rows (enforced by the DB trigger). All evidence fields
 * remain permanently immutable.
 */
async function updateParseStatus(
  surfaceId:   string,
  parseStatus: 'parse_success' | 'parse_failed',
): Promise<void> {
  await prisma.merchant_surfaces.update({
    where: { id: surfaceId },
    data:  { parseStatus: parseStatus },
  });
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export type ParseOutcome = 'written' | 'deduped' | 'failed';

/**
 * Parse a single surface row and persist the result.
 *
 * Steps:
 *   1. Determine HTML source (raw_html preferred; falls back to raw_text)
 *   2. Deduplicate: if an identical parse_v1 artifact already exists → 'deduped'
 *   3. Parse HTML → ParseArtifactV1 (deterministic, no I/O)
 *   4. On success:  write artifact → update parse_status = 'parse_success'
 *   5. On failure:  update parse_status = 'parse_failed' (no artifact written)
 *
 * Returns 'written' | 'deduped' | 'failed'.
 */
export async function parseAndCaptureSurface(
  row: SurfaceParseRow,
): Promise<ParseOutcome> {
  // Step 1: Resolve HTML source
  const html = row.rawHtml ?? row.rawText ?? '';

  // Step 2: Deduplication — skip if artifact already exists for this surface
  const alreadyParsed = await artifactExists(row.id, ARTIFACT_TYPE, ARTIFACT_VERSION);
  if (alreadyParsed) {
    return 'deduped';
  }

  // Step 3: Parse
  const result = parseSurfaceHtml(html, row.sourceUrl);

  if (!result.ok) {
    await updateParseStatus(row.id, 'parse_failed');
    return 'failed';
  }

  // Step 4: Write artifact and advance parse state
  try {
    await writeArtifact(row.id, result.artifact);
    await updateParseStatus(row.id, 'parse_success');
    return 'written';
  } catch (err: unknown) {
    // Guard against race-condition duplicate writes (unique constraint violation).
    // If the artifact was written concurrently, treat as deduped.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('Unique')) {
      return 'deduped';
    }
    await updateParseStatus(row.id, 'parse_failed');
    return 'failed';
  }
}
