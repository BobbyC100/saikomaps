#!/usr/bin/env node
/**
 * Merchant Surface Scanner — Work Order 001
 *
 * Detection-only pass. Fetches each restaurant homepage once and writes an
 * append-only snapshot to merchant_surface_scans. Never overwrites existing rows.
 * Current state is derived from the latest successful snapshot per entity.
 *
 * Usage:
 *   npx tsx scripts/scan-merchant-surfaces.ts [--limit=N] [--slug=<slug>] [--dry-run]
 *
 * Scope (default): LA bounding-box entities with a website set.
 * --slug: target exactly one entity regardless of bbox or enrichment state.
 * --dry-run: print what would be written without touching the DB.
 */

import { db } from "../lib/db";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LA_BBOX   = { latMin: 33.6, latMax: 34.5, lonMin: -118.9, lonMax: -117.6 };
const FETCH_TIMEOUT_MS = 12_000;
const CONCURRENCY      = 6;
const DEFAULT_LIMIT    = 60;

// ---------------------------------------------------------------------------
// Detection maps
// ---------------------------------------------------------------------------

const PLATFORM_FINGERPRINTS: Array<[string, RegExp]> = [
  ["squarespace", /squarespace/i],
  ["bentobox",    /bentobox/i],
  ["wordpress",   /wp-content|wp-includes/i],
  ["shopify",     /shopify/i],
  ["wix",         /wix\.com/i],
  ["webflow",     /webflow/i],
];

const RESERVATION_PATTERNS: Array<[string, RegExp]> = [
  ["resy",       /resy\.com/i],
  ["opentable",  /opentable\.com/i],
  ["tock",       /exploretock\.com|tock\.com/i],
  ["sevenrooms", /sevenrooms\.com/i],
];

const ORDERING_PATTERNS: Array<[string, RegExp]> = [
  ["toast",    /toasttab\.com/i],
  ["chownow",  /chownow\.com/i],
  ["square",   /square\.site|squareup\.com/i],
  ["doordash", /doordash\.com/i],
  ["ubereats",  /ubereats\.com/i],
];

const NEWSLETTER_PATTERNS: Array<[string, RegExp]> = [
  ["mailchimp",   /mailchimp\.com|list-manage\.com|mc\.us\d/i],
  ["klaviyo",     /klaviyo\.com/i],
  ["substack",    /substack\.com/i],
  ["convertkit",  /convertkit\.com|ck\.page/i],
];

// Private dining: require specific intent language — not just "events"
const PRIVATE_DINING_RE =
  /private\s+dining|private\s+event|large\s+party|group\s+dining|buyout|host\s+an?\s+event|exclusive\s+use|semi.?private/i;

// Common nav/footer link labels to exclude from sibling-entity capture
const NAV_NOISE_RE =
  /^(about|menu|menus|contact|reservations?|reserve|book|gift\s+cards?|careers?|jobs?|faq|press|events?|home|instagram|facebook|twitter|tiktok|yelp|google|directions?|order\s+online|order|shop|login|sign\s+in|accessibility|privacy|terms|blog|newsletter|subscribe|magazine)$/i;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanResult {
  entity_id: string;
  source_url: string;
  final_url: string | null;
  http_status: number | null;
  fetch_error: string | null;
  website_platform: string | null;
  menu_present: boolean;
  menu_format: "html" | "pdf" | "external" | "none";
  menu_url: string | null;
  menu_read_state: "readable" | "unreadable_pdf" | "inaccessible" | "none";
  reservation_platform: string | null;
  reservation_url: string | null;
  ordering_platform: string | null;
  ordering_url: string | null;
  instagram_present: boolean;
  instagram_url: string | null;
  newsletter_present: boolean;
  newsletter_platform: string | null;
  gift_cards_present: boolean;
  careers_present: boolean;
  private_dining_present: boolean;
  sibling_entities_present: boolean;
  sibling_entity_urls: string[];
  sibling_entity_labels: string[];
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchHomepage(
  url: string,
): Promise<{ html: string; finalUrl: string; status: number } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    const html = await res.text();
    return { html, finalUrl: res.url, status: res.status };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Heuristic helpers
// ---------------------------------------------------------------------------

function firstMatch(html: string, patterns: Array<[string, RegExp]>): string | null {
  for (const [name, re] of patterns) {
    if (re.test(html)) return name;
  }
  return null;
}

/** Extract first URL matching a platform pattern from href attributes. */
function firstUrl(html: string, re: RegExp): string | null {
  // Look for href="..." containing the pattern
  const hrefRe = /href="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    if (re.test(m[1])) return m[1];
  }
  return null;
}

function detectMenu(
  html: string,
  baseHost: string,
): Pick<ScanResult, "menu_present" | "menu_format" | "menu_url" | "menu_read_state"> {
  // PDF link
  const pdfMatch = html.match(/href="([^"]*\.pdf[^"]*)"/i);
  if (pdfMatch) {
    return {
      menu_present: true,
      menu_format: "pdf",
      menu_url: pdfMatch[1],
      menu_read_state: "unreadable_pdf",
    };
  }

  // Internal /menu path — prefer exact /menu or /menus over partial matches
  const menuPathMatch = html.match(/href="([^"]*\/menus?(?:\/[^"]*)?)"[^>]*>/i);
  if (menuPathMatch) {
    const href = menuPathMatch[1];
    try {
      const linkHost = href.startsWith("http") ? new URL(href).hostname : baseHost;
      if (linkHost === baseHost || href.startsWith("/")) {
        return { menu_present: true, menu_format: "html", menu_url: href, menu_read_state: "readable" };
      }
      return { menu_present: true, menu_format: "external", menu_url: href, menu_read_state: "readable" };
    } catch {
      return { menu_present: true, menu_format: "html", menu_url: href, menu_read_state: "readable" };
    }
  }

  // External menu service (bentobox menus, etc.)
  const extMenuMatch = html.match(/href="(https?:\/\/(?:www\.)?(?:[^"]*menu[^"]*))"/i);
  if (extMenuMatch) {
    try {
      const linkHost = new URL(extMenuMatch[1]).hostname;
      if (linkHost !== baseHost) {
        return { menu_present: true, menu_format: "external", menu_url: extMenuMatch[1], menu_read_state: "readable" };
      }
    } catch { /* ignore */ }
  }

  return { menu_present: false, menu_format: "none", menu_url: null, menu_read_state: "none" };
}

/** Extract sibling entity links from nav and footer sections. */
function detectSiblingEntities(
  html: string,
  baseHost: string,
): { present: boolean; urls: string[]; labels: string[] } {
  // Extract nav and footer sections
  const navMatch  = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/i);
  const footMatch = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
  const scope = (navMatch?.[1] ?? "") + (footMatch?.[1] ?? "");
  if (!scope) return { present: false, urls: [], labels: [] };

  const linkRe = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const urls: string[] = [];
  const labels: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(scope)) !== null) {
    const href  = m[1].trim();
    // Strip HTML tags from label, collapse whitespace
    const label = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!label || NAV_NOISE_RE.test(label)) continue;
    // Only external links (different domain) count as sibling entities
    if (!href.startsWith("http")) continue;
    try {
      const linkHost = new URL(href).hostname.replace(/^www\./, "");
      const ownHost  = baseHost.replace(/^www\./, "");
      if (linkHost === ownHost) continue;
      // Skip social/utility domains
      if (/instagram|facebook|twitter|tiktok|yelp|google|tripadvisor|opentable|resy|exploretock|tock\.com|doordash|ubereats|toasttab|chownow|squareup|square\.site|sevenrooms|mailchimp|klaviyo|substack/.test(linkHost)) continue;
      if (!urls.includes(href)) {
        urls.push(href);
        labels.push(label);
      }
    } catch { /* invalid URL */ }
  }

  return { present: urls.length > 0, urls, labels };
}

// ---------------------------------------------------------------------------
// Probe one entity
// ---------------------------------------------------------------------------

async function scanEntity(entity: { id: string; name: string; website: string }): Promise<ScanResult> {
  const base: ScanResult = {
    entity_id: entity.id,
    source_url: entity.website,
    final_url: null,
    http_status: null,
    fetch_error: null,
    website_platform: null,
    menu_present: false,
    menu_format: "none",
    menu_url: null,
    menu_read_state: "none",
    reservation_platform: null,
    reservation_url: null,
    ordering_platform: null,
    ordering_url: null,
    instagram_present: false,
    instagram_url: null,
    newsletter_present: false,
    newsletter_platform: null,
    gift_cards_present: false,
    careers_present: false,
    private_dining_present: false,
    sibling_entities_present: false,
    sibling_entity_urls: [],
    sibling_entity_labels: [],
  };

  const fetched = await fetchHomepage(entity.website);
  if ("error" in fetched) {
    base.fetch_error = fetched.error;
    base.menu_read_state = "inaccessible";
    return base;
  }

  const { html, finalUrl, status } = fetched;
  base.final_url   = finalUrl;
  base.http_status = status;

  if (status >= 400) {
    base.menu_read_state = "inaccessible";
    return base;
  }

  let baseHost = "unknown";
  try { baseHost = new URL(finalUrl).hostname; } catch { /* ok */ }

  // Platform
  base.website_platform = firstMatch(html, PLATFORM_FINGERPRINTS) ?? "custom";

  // Menu
  Object.assign(base, detectMenu(html, baseHost));

  // Reservation — detect platform AND capture the actual URL
  const resPlatform = firstMatch(html, RESERVATION_PATTERNS);
  if (resPlatform) {
    base.reservation_platform = resPlatform;
    const patternEntry = RESERVATION_PATTERNS.find(([name]) => name === resPlatform);
    if (patternEntry) base.reservation_url = firstUrl(html, patternEntry[1]);
  }

  // Ordering
  const orderPlatform = firstMatch(html, ORDERING_PATTERNS);
  if (orderPlatform) {
    base.ordering_platform = orderPlatform;
    const patternEntry = ORDERING_PATTERNS.find(([name]) => name === orderPlatform);
    if (patternEntry) base.ordering_url = firstUrl(html, patternEntry[1]);
  }

  // Instagram
  const igUrl = firstUrl(html, /instagram\.com/i);
  if (igUrl) {
    base.instagram_present = true;
    base.instagram_url = igUrl;
  }

  // Newsletter — check for newsletter platform embed before falling back to keyword
  const newsletterPlatform = firstMatch(html, NEWSLETTER_PATTERNS);
  if (newsletterPlatform) {
    base.newsletter_present  = true;
    base.newsletter_platform = newsletterPlatform;
  } else if (/newsletter|subscribe|mailing list/i.test(html)) {
    base.newsletter_present  = true;
    base.newsletter_platform = "unknown";
  }

  // Gift cards
  base.gift_cards_present = /gift\s*cards?/i.test(html);

  // Careers — require a link, not just the word
  base.careers_present = /href="[^"]*\b(careers?|jobs?)\b[^"]*"|\bcareers?\s+page\b|work\s+with\s+us/i.test(html);

  // Private dining — tighter language requirement (no false positives from generic "events")
  base.private_dining_present = PRIVATE_DINING_RE.test(html);

  // Sibling entities
  const siblings = detectSiblingEntities(html, baseHost);
  base.sibling_entities_present = siblings.present;
  base.sibling_entity_urls      = siblings.urls;
  base.sibling_entity_labels    = siblings.labels;

  return base;
}

// ---------------------------------------------------------------------------
// DB write (append-only)
// ---------------------------------------------------------------------------

async function writeScan(result: ScanResult): Promise<void> {
  await db.merchant_surface_scans.create({
    data: {
      id:        randomUUID(),
      entity_id: result.entity_id,
      source_url: result.source_url,
      final_url:  result.final_url ?? undefined,
      http_status: result.http_status ?? undefined,
      website_platform:       result.website_platform ?? undefined,
      menu_present:           result.menu_present,
      menu_format:            result.menu_format !== "none" ? result.menu_format : undefined,
      menu_url:               result.menu_url ?? undefined,
      menu_read_state:        result.menu_read_state !== "none" ? result.menu_read_state : undefined,
      reservation_platform:   result.reservation_platform ?? undefined,
      reservation_url:        result.reservation_url ?? undefined,
      ordering_platform:      result.ordering_platform ?? undefined,
      ordering_url:           result.ordering_url ?? undefined,
      instagram_present:      result.instagram_present,
      instagram_url:          result.instagram_url ?? undefined,
      newsletter_present:     result.newsletter_present,
      newsletter_platform:    result.newsletter_platform ?? undefined,
      gift_cards_present:     result.gift_cards_present,
      careers_present:        result.careers_present,
      private_dining_present: result.private_dining_present,
      sibling_entities_present: result.sibling_entities_present,
      sibling_entity_urls:    result.sibling_entity_urls.length > 0
        ? result.sibling_entity_urls
        : undefined,
      sibling_entity_labels:  result.sibling_entity_labels.length > 0
        ? result.sibling_entity_labels
        : undefined,
    },
  });
}

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------

async function runPool<T>(
  items: T[],
  worker: (item: T, idx: number) => Promise<void>,
  concurrency: number,
): Promise<void> {
  let i = 0;
  async function next(): Promise<void> {
    const idx = i++;
    if (idx >= items.length) return;
    await worker(items[idx], idx);
    return next();
  }
  await Promise.all(Array.from({ length: concurrency }, next));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args     = process.argv.slice(2);
  const slugArg  = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  const limit    = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10) || DEFAULT_LIMIT;
  const dryRun   = args.includes("--dry-run");

  console.log(`Merchant Surface Scanner — Work Order 001${dryRun ? " [DRY RUN]" : ""}\n`);

  // Entity selection
  const entities = await db.entities.findMany({
    where: slugArg
      ? { slug: slugArg, website: { not: null } }
      : {
          primary_vertical: "EAT",
          website: { not: null },
          canonical_state: {
            is: {
              latitude:  { gte: LA_BBOX.latMin, lte: LA_BBOX.latMax },
              longitude: { gte: LA_BBOX.lonMin, lte: LA_BBOX.lonMax },
            },
          },
        },
    select: { id: true, name: true, website: true },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  const targets = entities.filter((e) => (e.website?.trim().length ?? 0) > 0);
  console.log(`Scanning ${targets.length} entities (limit=${limit}${slugArg ? `, slug=${slugArg}` : ""})...\n`);

  const results: ScanResult[] = new Array(targets.length);
  let written = 0;
  let errors  = 0;

  await runPool(
    targets,
    async (entity, idx) => {
      const result = await scanEntity({ ...entity, website: entity.website! });
      results[idx] = result;

      const statusStr = result.http_status ? String(result.http_status) : result.fetch_error ? "ERR" : "?";
      const menuStr   = result.menu_present
        ? `menu=${result.menu_format}${result.menu_url ? "" : ""}` : "no-menu";
      const resStr    = result.reservation_platform ?? "—";
      const sibStr    = result.sibling_entities_present
        ? `siblings=[${result.sibling_entity_labels.slice(0, 2).join(", ")}]` : "";

      console.log(
        `  [${String(idx + 1).padStart(2)}] ${entity.name.slice(0, 38).padEnd(38)} ` +
        `http=${statusStr} plat=${(result.website_platform ?? "?").padEnd(12)} ` +
        `${menuStr.padEnd(14)} res=${resStr.padEnd(12)} ${sibStr}`,
      );

      if (!dryRun && result.http_status && result.http_status < 400) {
        try {
          await writeScan(result);
          written++;
        } catch (err) {
          console.error(`    !! DB write failed for ${entity.name}:`, err);
          errors++;
        }
      }
    },
    CONCURRENCY,
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const ok = results.filter((r) => r?.http_status && r.http_status < 400);
  const menuFormats = ok.reduce<Record<string, number>>((acc, r) => {
    const f = r.menu_present ? r.menu_format : "none";
    acc[f] = (acc[f] ?? 0) + 1;
    return acc;
  }, {});
  const platforms = ok.reduce<Record<string, number>>((acc, r) => {
    const p = r.website_platform ?? "unknown";
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const resPlatforms = ok
    .filter((r) => r.reservation_platform)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.reservation_platform!] = (acc[r.reservation_platform!] ?? 0) + 1;
      return acc;
    }, {});
  const orderPlatforms = ok
    .filter((r) => r.ordering_platform)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.ordering_platform!] = (acc[r.ordering_platform!] ?? 0) + 1;
      return acc;
    }, {});

  console.log(`\n${"═".repeat(62)}`);
  console.log(`SCAN SUMMARY  (${ok.length} ok / ${targets.length} probed / ${written} written)`);
  console.log(`${"═".repeat(62)}`);
  console.log(`\nMenu formats:`);
  for (const [f, n] of Object.entries(menuFormats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${f.padEnd(14)} ${n}`);
  }
  console.log(`\nReservation platforms:`);
  for (const [p, n] of Object.entries(resPlatforms).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p.padEnd(14)} ${n}`);
  }
  console.log(`\nOrdering platforms:`);
  if (Object.keys(orderPlatforms).length === 0) console.log(`  (none detected)`);
  for (const [p, n] of Object.entries(orderPlatforms).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p.padEnd(14)} ${n}`);
  }
  console.log(`\nWebsite platforms:`);
  for (const [p, n] of Object.entries(platforms).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p.padEnd(14)} ${n}`);
  }
  console.log(`\nSurface presence:`);
  const surface = (field: keyof ScanResult) => ok.filter((r) => r[field]).length;
  console.log(`  instagram          ${surface("instagram_present")} / ${ok.length}`);
  console.log(`  newsletter         ${surface("newsletter_present")} / ${ok.length}`);
  console.log(`  gift_cards         ${surface("gift_cards_present")} / ${ok.length}`);
  console.log(`  careers            ${surface("careers_present")} / ${ok.length}`);
  console.log(`  private_dining     ${surface("private_dining_present")} / ${ok.length}`);
  console.log(`  sibling_entities   ${surface("sibling_entities_present")} / ${ok.length}`);

  if (dryRun) console.log(`\n[dry-run] No rows written.`);
  else        console.log(`\n${written} scan snapshots written to merchant_surface_scans. ${errors ? `${errors} errors.` : ""}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
