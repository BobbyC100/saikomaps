/**
 * Merchant Surface Discovery — Foundation Layer
 * SKAI-WO-FIELDS-INGESTION-FOUNDATION-001
 *
 * Discovers and records merchant surfaces for entities that have a website.
 * Operates as a classification-only pass: fetches the homepage, extracts
 * candidate links, classifies them by pattern, and writes discovered surface
 * rows to merchant_surfaces.
 *
 * IMMUTABILITY CONTRACT
 * merchant_surfaces rows are NEVER updated. Every capture event is a new row.
 * This module only calls prisma.merchant_surfaces.create(). Any attempt to
 * call .update() on merchant_surfaces will be rejected by the DB trigger.
 *
 * SCOPE (this module)
 *   ✓  Fetch homepage
 *   ✓  Extract links from homepage HTML
 *   ✓  Classify links by surface type using pattern rules
 *   ✓  Write discovered rows for sub-surfaces
 *   ✓  Record fetch and parse state on every row
 *
 * OUT OF SCOPE
 *   ✗  Signal extraction
 *   ✗  Menu parsing
 *   ✗  Deep crawl of sub-pages
 *   ✗  Derived program modeling
 */

import { createHash } from 'crypto';
import { db as prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 12_000;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type SurfaceType =
  | 'homepage'
  | 'about'
  | 'menu'
  | 'drinks'
  | 'instagram'
  | 'reservation'
  | 'ordering'
  | 'contact';

type FetchStatus = 'discovered' | 'fetch_success' | 'fetch_failed';
type ParseStatus = 'parse_pending' | 'parse_success' | 'parse_failed';
type ExtractionStatus = 'not_attempted' | 'extracted' | 'no_signals';

// ---------------------------------------------------------------------------
// Surface classification patterns
// ---------------------------------------------------------------------------

const SURFACE_PATTERNS: Array<{ type: SurfaceType; patterns: RegExp[] }> = [
  {
    type: 'about',
    patterns: [/^\/about/i, /^\/our-story/i, /^\/story/i],
  },
  {
    type: 'menu',
    patterns: [/^\/menus?(?:\/|$|\?)/i],
  },
  {
    type: 'drinks',
    patterns: [/^\/drinks/i, /^\/wine/i, /^\/cocktails?/i],
  },
  {
    type: 'reservation',
    patterns: [/^\/reservations?/i, /^\/reserve/i],
  },
  {
    type: 'contact',
    patterns: [/^\/contact/i, /^\/visit/i],
  },
  {
    type: 'ordering',
    patterns: [/^\/order(?:\/|$|\?)/i, /^\/online-order/i],
  },
  // instagram surfaces are discovered from href attributes pointing to instagram.com
  // handled separately in extractLinks
];

function classifyPath(path: string): SurfaceType | null {
  for (const { type, patterns } of SURFACE_PATTERNS) {
    if (patterns.some((re) => re.test(path))) return type;
  }
  return null;
}

// ---------------------------------------------------------------------------
// HTML utilities
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags and collapse whitespace to produce plain text.
 * Does not use a DOM parser — regex only, intentionally simple.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract all same-origin anchor links from HTML.
 * Returns deduplicated list of { path, href, text, isInstagram }.
 */
interface ExtractedLink {
  path: string;      // pathname only, normalized
  href: string;      // full absolute URL
  text: string;      // visible link text
  isInstagram: boolean;
}

function extractLinks(html: string, baseUrl: string): ExtractedLink[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const results: ExtractedLink[] = [];

  // Match both href="..." and href='...'
  const hrefRe = /<a\b[^>]*\shref=(?:"([^"]+)"|'([^']+)')/gi;
  const textRe = />([^<]*)</;

  let match: RegExpExecArray | null;
  while ((match = hrefRe.exec(html)) !== null) {
    const raw = (match[1] ?? match[2] ?? '').trim();
    if (!raw || raw.startsWith('#') || raw.startsWith('javascript:') || raw.startsWith('mailto:')) {
      continue;
    }

    // Instagram external link
    const igMatch = raw.match(/instagram\.com\/([^/?#\s]+)/i);
    if (igMatch) {
      const href = raw.startsWith('http') ? raw : `https://instagram.com/${igMatch[1]}`;
      const key = `instagram:${igMatch[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ path: '/instagram', href, text: igMatch[1], isInstagram: true });
      }
      continue;
    }

    try {
      const url = new URL(raw, baseUrl);
      // Only same-origin links
      if (url.origin !== base.origin) continue;

      const path = url.pathname;
      if (seen.has(path) || path === '/' || path === '') continue;
      seen.add(path);

      // Grab link text from the surrounding context (best-effort)
      const after = html.slice(hrefRe.lastIndex, hrefRe.lastIndex + 200);
      const textMatch = textRe.exec(after);
      const text = textMatch ? textMatch[1].trim() : '';

      results.push({ path, href: url.href, text, isInstagram: false });
    } catch {
      // Malformed URL — skip
    }
  }

  return results;
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface FetchSuccess {
  ok: true;
  html: string;
  text: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  durationMs: number;
}

interface FetchFailure {
  ok: false;
  error: string;
  durationMs: number;
}

async function fetchPage(url: string): Promise<FetchSuccess | FetchFailure> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const contentType = res.headers.get('content-type') ?? '';
    const html = await res.text();
    const text = htmlToText(html);
    const durationMs = Date.now() - start;

    return {
      ok: true,
      html,
      text,
      finalUrl: res.url,
      httpStatus: res.status,
      contentType: contentType.split(';')[0].trim(),
      durationMs,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message ?? err),
      durationMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Evidence writers (create-only, never update)
// ---------------------------------------------------------------------------

async function writeSurface(params: {
  entityId: string;
  surfaceType: SurfaceType;
  sourceUrl: string;
  fetchStatus: FetchStatus;
  parseStatus?: ParseStatus;
  extractionStatus?: ExtractionStatus;
  contentType?: string;
  contentHash?: string;
  rawText?: string;
  rawHtml?: string;
  fetchedAt?: Date;
  metadataJson?: Record<string, unknown>;
}): Promise<string> {
  const row = await prisma.merchant_surfaces.create({
    data: {
      entity_id: params.entityId,
      surface_type: params.surfaceType,
      source_url: params.sourceUrl,
      fetch_status: params.fetchStatus,
      parse_status: params.parseStatus ?? null,
      extraction_status: params.extractionStatus ?? 'not_attempted',
      content_type: params.contentType ?? null,
      content_hash: params.contentHash ?? null,
      raw_text: params.rawText ?? null,
      raw_html: params.rawHtml ?? null,
      fetched_at: params.fetchedAt ?? null,
      metadata_json: params.metadataJson
        ? (params.metadataJson as any)
        : undefined,
    },
  });
  return row.id;
}

// ---------------------------------------------------------------------------
// Discovery result type
// ---------------------------------------------------------------------------

export interface DiscoveryResult {
  entityId: string;
  websiteUrl: string;
  homepageStatus: FetchStatus;
  homepageRowId: string;
  discoveredSurfaces: Array<{
    surfaceType: SurfaceType;
    sourceUrl: string;
    rowId: string;
  }>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Discover merchant surfaces for a single entity.
 *
 * Steps:
 *   1. Fetch homepage → write fetch_success or fetch_failed row
 *   2. If fetch succeeded, extract + classify all same-origin links
 *   3. Write one `discovered` row per classified surface (no content yet)
 *
 * Does NOT fetch sub-pages. Does NOT extract signals. Does NOT modify entities.
 * Creates only merchant_surfaces rows.
 */
export async function discoverEntitySurfaces(
  entityId: string,
  websiteUrl: string,
): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    entityId,
    websiteUrl,
    homepageStatus: 'fetch_failed',
    homepageRowId: '',
    discoveredSurfaces: [],
  };

  // -------------------------------------------------------------------------
  // Step 1: Fetch homepage
  // -------------------------------------------------------------------------
  const fetched = await fetchPage(websiteUrl);

  if (!fetched.ok) {
    const failure = fetched as FetchFailure;
    result.homepageRowId = await writeSurface({
      entityId,
      surfaceType: 'homepage',
      sourceUrl: websiteUrl,
      fetchStatus: 'fetch_failed',
      metadataJson: { error: failure.error, fetch_duration_ms: failure.durationMs },
    });
    result.homepageStatus = 'fetch_failed';
    result.error = failure.error;
    return result;
  }

  const contentHash = sha256(fetched.text);

  result.homepageRowId = await writeSurface({
    entityId,
    surfaceType: 'homepage',
    sourceUrl: fetched.finalUrl,
    fetchStatus: 'fetch_success',
    parseStatus: 'parse_pending',
    contentType: fetched.contentType || 'text/html',
    contentHash,
    rawText: fetched.text,
    rawHtml: fetched.html,
    fetchedAt: new Date(),
    metadataJson: {
      http_status: fetched.httpStatus,
      final_url: fetched.finalUrl,
      fetch_duration_ms: fetched.durationMs,
      original_url: websiteUrl,
    },
  });
  result.homepageStatus = 'fetch_success';

  // -------------------------------------------------------------------------
  // Step 2: Extract and classify links
  // -------------------------------------------------------------------------
  const links = extractLinks(fetched.html, fetched.finalUrl);
  const seen = new Set<string>(); // deduplicate by (surfaceType, href)

  for (const link of links) {
    let surfaceType: SurfaceType | null = null;

    if (link.isInstagram) {
      surfaceType = 'instagram';
    } else {
      surfaceType = classifyPath(link.path);
    }

    if (!surfaceType) continue;

    const dedupeKey = `${surfaceType}:${link.href}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    // -----------------------------------------------------------------------
    // Step 3: Write discovered row for each classified surface
    // -----------------------------------------------------------------------
    const rowId = await writeSurface({
      entityId,
      surfaceType,
      sourceUrl: link.href,
      fetchStatus: 'discovered',
      metadataJson: {
        discovered_from_id: result.homepageRowId,
        link_text: link.text || null,
        link_path: link.path,
      },
    });

    result.discoveredSurfaces.push({
      surfaceType,
      sourceUrl: link.href,
      rowId,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Surface fetch pass — SKAI-WO-FIELDS-SURFACE-FETCH-001
// ---------------------------------------------------------------------------

/** Surface types that require auth or special handling — skip in the HTTP fetch pass. */
const SKIP_FETCH_TYPES = new Set<string>(['instagram']);

/** Max body size to store: 1.5 MB */
const MAX_BODY_BYTES = 1_500_000;

/**
 * Read a fetch Response body up to MAX_BODY_BYTES.
 * Returns the clamped string and whether it was truncated.
 */
async function readBodyClamped(res: Response): Promise<{ body: string; truncated: boolean }> {
  if (!res.body) return { body: '', truncated: false };

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = MAX_BODY_BYTES - totalBytes;
    if (value.byteLength >= remaining) {
      chunks.push(value.slice(0, remaining));
      truncated = true;
      reader.cancel();
      break;
    }
    chunks.push(value);
    totalBytes += value.byteLength;
  }

  const merged = new Uint8Array(chunks.reduce((acc, c) => acc + c.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body: new TextDecoder('utf-8', { fatal: false }).decode(merged), truncated };
}

/**
 * Fetch a single discovered surface URL.
 * Follows up to 3 redirects. Enforces 5 s timeout and 1.5 MB body cap.
 * Returns a structured result; does NOT write to the database.
 */
export interface SurfaceFetchResult {
  ok: boolean;
  html: string;
  text: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  durationMs: number;
  truncated: boolean;
  error?: string;
}

export async function fetchSurfaceUrl(url: string): Promise<SurfaceFetchResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    const { body: html, truncated } = await readBodyClamped(res);
    const text = htmlToText(html);

    return {
      ok: true,
      html,
      text,
      finalUrl: res.url,
      httpStatus: res.status,
      contentType,
      durationMs: Date.now() - start,
      truncated,
    };
  } catch (err: any) {
    return {
      ok: false,
      html: '',
      text: '',
      finalUrl: url,
      httpStatus: 0,
      contentType: '',
      durationMs: Date.now() - start,
      truncated: false,
      error: err?.name === 'AbortError' ? 'timeout_5s' : String(err?.message ?? err),
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface DiscoveredSurfaceRow {
  id: string;
  entity_id: string;
  surface_type: string;
  source_url: string;
}

/**
 * Query merchant_surfaces for rows that are ready to fetch.
 * Returns rows with fetch_status = 'discovered', excluding surface types
 * that require special handling (e.g. instagram).
 */
export async function findDiscoveredSurfaces(params: {
  limit?: number;
  surfaceType?: string;
  entityId?: string;
}): Promise<DiscoveredSurfaceRow[]> {
  const { limit = 50, surfaceType, entityId } = params;

  const rows = await prisma.merchant_surfaces.findMany({
    where: {
      fetch_status: 'discovered',
      surface_type: surfaceType
        ? surfaceType
        : { notIn: [...SKIP_FETCH_TYPES] },
      ...(entityId ? { entity_id: entityId } : {}),
    },
    select: { id: true, entity_id: true, surface_type: true, source_url: true },
    take: limit,
    orderBy: { discovered_at: 'asc' },
  });

  return rows;
}

/**
 * Fetch a single discovered surface row and write the result as a new evidence row.
 * Deduplication: if a row with the same (entity_id, surface_type, content_hash)
 * already exists with fetch_status = 'fetch_success', skip the write.
 *
 * Returns 'written' | 'deduped' | 'failed'.
 */
export async function fetchAndCaptureSurface(
  row: DiscoveredSurfaceRow,
): Promise<'written' | 'deduped' | 'failed'> {
  const fetched = await fetchSurfaceUrl(row.source_url);

  if (!fetched.ok) {
    await writeSurface({
      entityId: row.entity_id,
      surfaceType: row.surface_type as SurfaceType,
      sourceUrl: row.source_url,
      fetchStatus: 'fetch_failed',
      metadataJson: {
        error: fetched.error,
        fetch_duration_ms: fetched.durationMs,
        discovered_surface_id: row.id,
      },
    });
    return 'failed';
  }

  const contentHash = sha256(fetched.text);

  // Deduplication check: same evidence already captured for this entity + surface type?
  const existing = await prisma.merchant_surfaces.findFirst({
    where: {
      entity_id: row.entity_id,
      surface_type: row.surface_type,
      content_hash: contentHash,
      fetch_status: 'fetch_success',
    },
    select: { id: true },
  });

  if (existing) {
    return 'deduped';
  }

  await writeSurface({
    entityId: row.entity_id,
    surfaceType: row.surface_type as SurfaceType,
    sourceUrl: fetched.finalUrl,
    fetchStatus: 'fetch_success',
    parseStatus: 'parse_pending',
    contentType: fetched.contentType || 'text/html',
    contentHash,
    rawText: fetched.text,
    rawHtml: fetched.html,
    fetchedAt: new Date(),
    metadataJson: {
      http_status: fetched.httpStatus,
      final_url: fetched.finalUrl,
      original_url: row.source_url,
      fetch_duration_ms: fetched.durationMs,
      truncated: fetched.truncated,
      discovered_surface_id: row.id,
    },
  });

  return 'written';
}

// ---------------------------------------------------------------------------
// Batch helper: find entities that have a website but no homepage surface yet
// ---------------------------------------------------------------------------

export async function findEntitiesNeedingDiscovery(params: {
  limit?: number;
  entityId?: string;
}): Promise<Array<{ id: string; website: string; name: string }>> {
  const { limit = 50, entityId } = params;

  // Entities that already have a homepage surface row
  const alreadyDiscovered = await prisma.merchant_surfaces.findMany({
    where: { surface_type: 'homepage' },
    select: { entity_id: true },
    distinct: ['entity_id'],
  });
  const doneIds = new Set(alreadyDiscovered.map((r) => r.entity_id));

  const where: any = {
    website: { not: null },
    ...(entityId ? { id: entityId } : {}),
  };

  const entities = await prisma.entities.findMany({
    where,
    select: { id: true, website: true, name: true },
    take: limit * 3, // over-fetch to account for filtering
  });

  return entities
    .filter((e) => !doneIds.has(e.id) && !!e.website)
    .slice(0, limit)
    .map((e) => ({ id: e.id, website: e.website!, name: e.name }));
}
