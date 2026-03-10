#!/usr/bin/env node
/**
 * Surface Presence Audit — lightweight homepage probe
 *
 * Fetches the homepage HTML for ~50 LA restaurants and detects the presence of
 * key merchant surfaces using simple string/regex heuristics. No DB writes.
 *
 * Output: data/audits/merchant_surface_presence.csv
 */

import { db } from "../lib/db";
import { createWriteStream } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LA_BBOX = { latMin: 33.6, latMax: 34.5, lonMin: -118.9, lonMax: -117.6 };
const TARGET_COUNT = 55;          // fetch a few extra in case of timeouts
const FETCH_TIMEOUT_MS = 10_000;
const CONCURRENCY = 5;            // parallel fetch slots
const OUTPUT_PATH = join(process.cwd(), "data/audits/merchant_surface_presence.csv");

// ---------------------------------------------------------------------------
// Heuristic maps
// ---------------------------------------------------------------------------

const PLATFORM_FINGERPRINTS: Record<string, RegExp> = {
  squarespace: /squarespace/i,
  bentobox:    /bentobox/i,
  wordpress:   /wp-content/i,
  shopify:     /shopify/i,
  wix:         /wix\.com/i,
  webflow:     /webflow/i,
};

const RESERVATION_PATTERNS: Record<string, RegExp> = {
  resy:       /resy\.com/i,
  opentable:  /opentable\.com/i,
  tock:       /exploretock\.com|tock\.com/i,
  sevenrooms: /sevenrooms\.com/i,
};

const ORDERING_PATTERNS: Record<string, RegExp> = {
  toast:    /toasttab\.com/i,
  chownow:  /chownow\.com/i,
  square:   /square\.site|squareup\.com/i,
  doordash: /doordash\.com/i,
  uber:     /ubereats\.com/i,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditRow {
  name: string;
  website: string;
  website_platform: string;
  menu_present: boolean;
  menu_format: "html" | "pdf" | "external" | "none";
  reservation_platform: string;
  ordering_platform: string;
  instagram_present: boolean;
  newsletter_present: boolean;
  careers_present: boolean;
  events_private_dining_present: boolean;
  sibling_entities_present: boolean;
  gift_cards_present: boolean;
  image_density: "low" | "medium" | "high";
  fetch_status: number | "timeout" | "error";
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchHomepage(url: string): Promise<{ html: string; status: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const html = await res.text();
    return { html, status: res.status };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Heuristics
// ---------------------------------------------------------------------------

function detectPlatform(html: string): string {
  for (const [name, re] of Object.entries(PLATFORM_FINGERPRINTS)) {
    if (re.test(html)) return name;
  }
  return "unknown";
}

function detectReservation(html: string): string {
  for (const [name, re] of Object.entries(RESERVATION_PATTERNS)) {
    if (re.test(html)) return name;
  }
  return "none";
}

function detectOrdering(html: string): string {
  for (const [name, re] of Object.entries(ORDERING_PATTERNS)) {
    if (re.test(html)) return name;
  }
  return "none";
}

function detectMenuFormat(html: string, baseHost: string): { present: boolean; format: AuditRow["menu_format"] } {
  // PDF link
  if (/href="[^"]*\.pdf"/i.test(html)) return { present: true, format: "pdf" };
  // Internal /menu path
  if (/href="[^"]*\/menu[^"]*"/i.test(html)) return { present: true, format: "html" };
  // External menu domain (bentobox, etc.)
  const externalMenuMatch = html.match(/href="(https?:\/\/(?!www\.[^"]*\.com\/menu)[^"]*menu[^"]*)"/i);
  if (externalMenuMatch) {
    try {
      const linkHost = new URL(externalMenuMatch[1]).hostname;
      if (linkHost !== baseHost) return { present: true, format: "external" };
    } catch { /* ignore */ }
  }
  // Generic text indicator
  if (/\bmenu\b/i.test(html)) return { present: true, format: "html" };
  return { present: false, format: "none" };
}

function countImages(html: string): AuditRow["image_density"] {
  const matches = html.match(/<img\b/gi);
  const count = matches?.length ?? 0;
  if (count < 5) return "low";
  if (count < 20) return "medium";
  return "high";
}

function detectSiblingEntities(html: string): boolean {
  return /sister restaurant|our restaurants|from the team behind|also visit|our other|sibling/i.test(html);
}

// ---------------------------------------------------------------------------
// Probe single entity
// ---------------------------------------------------------------------------

async function probeEntity(name: string, website: string): Promise<AuditRow> {
  const base: AuditRow = {
    name,
    website,
    website_platform: "unknown",
    menu_present: false,
    menu_format: "none",
    reservation_platform: "none",
    ordering_platform: "none",
    instagram_present: false,
    newsletter_present: false,
    careers_present: false,
    events_private_dining_present: false,
    sibling_entities_present: false,
    gift_cards_present: false,
    image_density: "low",
    fetch_status: "error",
  };

  const result = await fetchHomepage(website);
  if (!result) {
    base.fetch_status = "timeout";
    return base;
  }

  const { html, status } = result;
  base.fetch_status = status;

  if (status < 200 || status >= 400) return base;

  let baseHost = "unknown";
  try { baseHost = new URL(website).hostname; } catch { /* ok */ }

  base.website_platform           = detectPlatform(html);
  base.reservation_platform       = detectReservation(html);
  base.ordering_platform          = detectOrdering(html);
  base.instagram_present          = /instagram\.com/i.test(html);
  base.newsletter_present         = /newsletter|subscribe|mailing list/i.test(html);
  base.careers_present            = /\bcareers?\b|\bjobs?\b|\bwork with us\b/i.test(html);
  base.events_private_dining_present = /private dining|events|buyout|private event/i.test(html);
  base.sibling_entities_present   = detectSiblingEntities(html);
  base.gift_cards_present         = /gift card/i.test(html);
  base.image_density              = countImages(html);

  const menu = detectMenuFormat(html, baseHost);
  base.menu_present = menu.present;
  base.menu_format  = menu.format;

  return base;
}

// ---------------------------------------------------------------------------
// CSV writer
// ---------------------------------------------------------------------------

const CSV_HEADERS: (keyof AuditRow)[] = [
  "name", "website", "website_platform",
  "menu_present", "menu_format",
  "reservation_platform", "ordering_platform",
  "instagram_present", "newsletter_present",
  "careers_present", "events_private_dining_present",
  "sibling_entities_present", "gift_cards_present",
  "image_density", "fetch_status",
];

function toCsvRow(row: AuditRow): string {
  return CSV_HEADERS.map((k) => {
    const v = String(row[k] ?? "");
    return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(",");
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
  console.log("Surface Presence Audit — LA Restaurant Batch\n");

  const entities = await db.entities.findMany({
    where: {
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
    take: TARGET_COUNT,
    orderBy: { updatedAt: "desc" },
  });

  // Filter out blank websites
  const targets = entities.filter((e) => (e.website?.trim().length ?? 0) > 0);
  console.log(`Probing ${targets.length} entities...\n`);

  const results: AuditRow[] = new Array(targets.length);

  await runPool(
    targets,
    async (entity, idx) => {
      const row = await probeEntity(entity.name, entity.website!.trim());
      results[idx] = row;
      const menuStr = row.menu_present ? `menu=${row.menu_format}` : "no-menu";
      const resStr  = row.reservation_platform !== "none" ? row.reservation_platform : "—";
      const statusStr = String(row.fetch_status);
      console.log(
        `  [${String(idx + 1).padStart(2)}] ${entity.name.slice(0, 40).padEnd(40)} ` +
        `http=${statusStr} plat=${row.website_platform.padEnd(12)} ${menuStr} res=${resStr}`,
      );
    },
    CONCURRENCY,
  );

  // Write CSV
  const out = createWriteStream(OUTPUT_PATH);
  out.write(CSV_HEADERS.join(",") + "\n");
  for (const row of results.filter(Boolean)) {
    out.write(toCsvRow(row) + "\n");
  }
  out.end();

  // Summary stats
  const fetched     = results.filter((r) => typeof r.fetch_status === "number" && r.fetch_status < 400);
  const menuCount   = fetched.filter((r) => r.menu_present).length;
  const resCount    = fetched.filter((r) => r.reservation_platform !== "none").length;
  const orderCount  = fetched.filter((r) => r.ordering_platform !== "none").length;
  const igCount     = fetched.filter((r) => r.instagram_present).length;
  const pdfMenus    = fetched.filter((r) => r.menu_format === "pdf").length;
  const htmlMenus   = fetched.filter((r) => r.menu_format === "html").length;
  const extMenus    = fetched.filter((r) => r.menu_format === "external").length;
  const platforms   = fetched.reduce<Record<string, number>>((acc, r) => {
    acc[r.website_platform] = (acc[r.website_platform] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n${"=".repeat(60)}`);
  console.log(`AUDIT SUMMARY (${fetched.length} successful fetches of ${targets.length} probed)`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Menu present:         ${menuCount} (html=${htmlMenus}, pdf=${pdfMenus}, external=${extMenus})`);
  console.log(`Reservation platform: ${resCount}`);
  console.log(`Ordering platform:    ${orderCount}`);
  console.log(`Instagram present:    ${igCount}`);
  console.log(`Newsletter:           ${fetched.filter((r) => r.newsletter_present).length}`);
  console.log(`Careers:              ${fetched.filter((r) => r.careers_present).length}`);
  console.log(`Events/private dining:${fetched.filter((r) => r.events_private_dining_present).length}`);
  console.log(`Gift cards:           ${fetched.filter((r) => r.gift_cards_present).length}`);
  console.log(`Sibling entities:     ${fetched.filter((r) => r.sibling_entities_present).length}`);
  console.log(`\nWebsite platforms:`);
  for (const [plat, n] of Object.entries(platforms).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${plat.padEnd(16)} ${n}`);
  }
  console.log(`\nOutput: ${OUTPUT_PATH}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
