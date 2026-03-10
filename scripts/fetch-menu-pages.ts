#!/usr/bin/env node
/**
 * WO-002 — Offering Menu Fetch Pass
 *
 * Fetches HTML menu pages discovered by the Merchant Surface Scanner and
 * stores durable raw text. Acquisition only — no parsing, no claims, no signals.
 *
 * Input:  merchant_surface_scans (latest successful scan, menu_format = 'html')
 * Output: menu_fetches (append-only), R2 HTML receipts
 *
 * Usage:
 *   npx tsx scripts/fetch-menu-pages.ts [--limit=N] [--slug=<slug>] [--dry-run]
 */

import { db } from "../lib/db";
import { createHash }           from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { parse as parseHtml }   from "node-html-parser";
import { randomUUID }           from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT    = 20;
const FETCH_TIMEOUT_MS = 15_000;
const CONCURRENCY      = 4;
const TEXT_METHOD      = "node-html-parser-v1";

// R2 is S3-compatible — credentials from .env.local
const R2_BUCKET   = process.env.R2_BUCKET_NAME ?? "saiko-assets";
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_KEY_ID   = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET   = process.env.R2_SECRET_ACCESS_KEY;

const r2 = R2_ENDPOINT && R2_KEY_ID && R2_SECRET
  ? new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_KEY_ID, secretAccessKey: R2_SECRET },
    })
  : null;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuTarget {
  entity_id:   string;
  entity_name: string;
  slug:        string;
  source_url:  string;   // final_url from the surface scan (resolved base for relative menu_url)
  menu_url:    string;   // may be relative or absolute
}

interface FetchOutcome {
  target:              MenuTarget;
  resolved_url:        string;
  final_url:           string | null;
  http_status:         number | null;
  fetch_duration_ms:   number | null;
  raw_text:            string | null;
  content_hash:        string | null;
  raw_html_pointer:    string | null;
  error:               string | null;
}

// ---------------------------------------------------------------------------
// Text extraction — visible text only, no scripts/styles/nav/footer
// ---------------------------------------------------------------------------

const STRIP_TAGS = new Set([
  "script", "style", "noscript", "nav", "header", "footer",
  "aside", "iframe", "svg", "button", "form",
]);

function extractText(html: string): string {
  const root = parseHtml(html, {
    blockTextElements: { script: false, style: false, pre: true },
  });

  // Remove noise elements in-place
  for (const tag of STRIP_TAGS) {
    root.querySelectorAll(tag).forEach((el) => el.remove());
  }

  // Walk the remaining tree, collect text nodes
  const lines: string[] = [];
  function walk(node: ReturnType<typeof parseHtml>) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      const t = node.text.trim();
      if (t) lines.push(t);
      return;
    }
    for (const child of node.childNodes) {
      walk(child as ReturnType<typeof parseHtml>);
    }
  }
  walk(root);

  // Join, strip DOCTYPE/xml artifacts, deduplicate consecutive blank lines
  return lines
    .join("\n")
    .replace(/^<!DOCTYPE[^\n]*\n?/im, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// R2 write
// ---------------------------------------------------------------------------

async function writeToR2(
  entityId: string,
  html: string,
  fetchedAt: Date,
): Promise<string | null> {
  if (!r2) return null;
  const ts  = fetchedAt.toISOString().replace(/[:.]/g, "-");
  const key = `menu-fetches/${entityId}/${ts}.html`;
  try {
    await r2.send(new PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         key,
      Body:        html,
      ContentType: "text/html; charset=utf-8",
    }));
    return `r2://${R2_BUCKET}/${key}`;
  } catch (err) {
    console.warn(`    [r2] upload failed: ${(err as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Resolve relative menu URL against the entity's scanned base URL
// ---------------------------------------------------------------------------

function resolveMenuUrl(menuUrl: string, baseUrl: string): string {
  if (menuUrl.startsWith("http://") || menuUrl.startsWith("https://")) return menuUrl;
  try {
    return new URL(menuUrl, baseUrl).toString();
  } catch {
    return menuUrl;
  }
}

// ---------------------------------------------------------------------------
// Fetch one menu page
// ---------------------------------------------------------------------------

async function fetchMenu(target: MenuTarget): Promise<FetchOutcome> {
  const resolvedUrl = resolveMenuUrl(target.menu_url, target.source_url);
  const base: FetchOutcome = {
    target,
    resolved_url:      resolvedUrl,
    final_url:         null,
    http_status:       null,
    fetch_duration_ms: null,
    raw_text:          null,
    content_hash:      null,
    raw_html_pointer:  null,
    error:             null,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();

  try {
    const res = await fetch(resolvedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    base.fetch_duration_ms = Date.now() - t0;
    base.http_status = res.status;
    base.final_url   = res.url;

    if (res.status >= 400) return base;

    const html   = await res.text();
    const fetchedAt = new Date();

    // Extract visible text
    base.raw_text     = extractText(html);
    base.content_hash = createHash("sha256").update(base.raw_text).digest("hex");

    // Write HTML receipt to R2 (non-blocking best-effort)
    base.raw_html_pointer = await writeToR2(target.entity_id, html, fetchedAt);

    return base;
  } catch (err) {
    base.fetch_duration_ms = Date.now() - t0;
    base.error = err instanceof Error ? err.message : String(err);
    return base;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// DB write — append only
// ---------------------------------------------------------------------------

async function writeFetch(outcome: FetchOutcome, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  await db.menu_fetches.create({
    data: {
      id:                    randomUUID(),
      entity_id:             outcome.target.entity_id,
      source_url:            outcome.resolved_url,
      final_url:             outcome.final_url ?? undefined,
      menu_format:           "html",
      http_status:           outcome.http_status ?? undefined,
      fetch_duration_ms:     outcome.fetch_duration_ms ?? undefined,
      raw_text:              outcome.raw_text ?? undefined,
      content_hash:          outcome.content_hash ?? undefined,
      raw_html_pointer:      outcome.raw_html_pointer ?? undefined,
      text_extraction_method: TEXT_METHOD,
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
  const args    = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  const limit   = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10) || DEFAULT_LIMIT;
  const dryRun  = args.includes("--dry-run");

  if (!r2) {
    console.warn("⚠️  R2 not configured — HTML receipts will not be stored. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local\n");
  }

  console.log(`WO-002 — Menu Fetch Pass${dryRun ? " [DRY RUN]" : ""}\n`);

  // ----- Resolve targets from current-state surface scans ------------------
  // "Current state" = latest successful scan per entity (http_status < 400)
  type RawTarget = { entity_id: string; entity_name: string; slug: string; source_url: string; menu_url: string };

  const rawTargets = slugArg
    ? await db.$queryRaw<RawTarget[]>`
        SELECT DISTINCT ON (mss.entity_id)
          e.id           AS entity_id,
          e.name         AS entity_name,
          e.slug,
          COALESCE(mss.final_url, mss.source_url) AS source_url,
          mss.menu_url
        FROM merchant_surface_scans mss
        JOIN entities e ON e.id = mss.entity_id
        WHERE mss.http_status < 400
          AND mss.menu_present = true
          AND mss.menu_format  = 'html'
          AND mss.menu_url IS NOT NULL
          AND e.slug = ${slugArg}
        ORDER BY mss.entity_id, mss.fetched_at DESC
        LIMIT ${limit}`
    : await db.$queryRaw<RawTarget[]>`
        SELECT DISTINCT ON (mss.entity_id)
          e.id           AS entity_id,
          e.name         AS entity_name,
          e.slug,
          COALESCE(mss.final_url, mss.source_url) AS source_url,
          mss.menu_url
        FROM merchant_surface_scans mss
        JOIN entities e ON e.id = mss.entity_id
        WHERE mss.http_status < 400
          AND mss.menu_present = true
          AND mss.menu_format  = 'html'
          AND mss.menu_url IS NOT NULL
        ORDER BY mss.entity_id, mss.fetched_at DESC
        LIMIT ${limit}`;

  const targets: MenuTarget[] = rawTargets.map((r) => ({
    entity_id:   r.entity_id,
    entity_name: r.entity_name,
    slug:        r.slug,
    source_url:  r.source_url,
    menu_url:    r.menu_url,
  }));

  console.log(`${targets.length} HTML menu targets from surface scans\n`);

  const outcomes: FetchOutcome[] = new Array(targets.length);
  let written = 0;
  let errors  = 0;

  await runPool(
    targets,
    async (target, idx) => {
      const outcome = await fetchMenu(target);
      outcomes[idx] = outcome;

      const statusStr = outcome.http_status ? String(outcome.http_status) : outcome.error ? "ERR" : "?";
      const textLen   = outcome.raw_text?.length ?? 0;
      const hashShort = outcome.content_hash?.slice(0, 8) ?? "—";
      const r2Str     = outcome.raw_html_pointer ? "r2=✓" : "r2=—";

      console.log(
        `  [${String(idx + 1).padStart(2)}] ${target.entity_name.slice(0, 36).padEnd(36)} ` +
        `http=${statusStr} ${String(outcome.fetch_duration_ms ?? 0).padStart(5)}ms ` +
        `text=${String(textLen).padStart(6)}c hash=${hashShort} ${r2Str}`,
      );
      if (outcome.error) console.log(`      error: ${outcome.error}`);

      if (outcome.http_status && outcome.http_status < 400) {
        try {
          await writeFetch(outcome, dryRun);
          if (!dryRun) written++;
        } catch (err) {
          console.error(`    !! DB write failed for ${target.entity_name}:`, err);
          errors++;
        }
      }
    },
    CONCURRENCY,
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const ok       = outcomes.filter((o) => o?.http_status && o.http_status < 400);
  const withText = ok.filter((o) => (o.raw_text?.length ?? 0) > 50);
  const withR2   = ok.filter((o) => o.raw_html_pointer);
  const avgLen   = withText.length > 0
    ? Math.round(withText.reduce((s, o) => s + (o.raw_text?.length ?? 0), 0) / withText.length)
    : 0;

  console.log(`\n${"═".repeat(60)}`);
  console.log(`FETCH SUMMARY  (${ok.length} ok / ${targets.length} attempted / ${written} written)`);
  console.log(`${"═".repeat(60)}`);
  console.log(`Usable text (>50c):  ${withText.length} / ${ok.length}`);
  console.log(`Avg text length:     ${avgLen.toLocaleString()} chars`);
  console.log(`R2 receipts stored:  ${withR2.length} / ${ok.length}`);
  if (errors) console.log(`DB errors:           ${errors}`);
  if (dryRun) console.log(`\n[dry-run] No rows written.`);
  else        console.log(`\n${written} rows written to menu_fetches.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
