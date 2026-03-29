#!/usr/bin/env node
/**
 * WO-002 — Offering Menu Fetch Pass
 *
 * Fetches HTML menu pages discovered by the Merchant Surface Scanner and
 * stores durable raw text. Acquisition only — no parsing, no claims, no signals.
 *
 * Input:  merchant_surface_scans (preferred current-state source)
 *         fallback: merchant_surfaces discovered/fetched menu-like URLs
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
import { ORCHESTRATION_REASON } from "../lib/enrichment/orchestration-reasons";

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
  entityId:   string;
  entityName: string;
  slug:        string;
  sourceUrl:  string;   // final_url from the surface scan (resolved base for relative menu_url)
  menuUrl:    string;   // may be relative or absolute
}

interface FetchOutcome {
  target:              MenuTarget;
  resolvedUrl:        string;
  finalUrl:           string | null;
  httpStatus:         number | null;
  contentType:        string | null;
  fetchDurationMs:   number | null;
  rawText:            string | null;
  contentHash:        string | null;
  rawHtmlPointer:    string | null;
  failureReason:      string | null;
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
  const resolvedUrl = resolveMenuUrl(target.menuUrl, target.sourceUrl);
  const base: FetchOutcome = {
    target,
    resolvedUrl:      resolvedUrl,
    finalUrl:         null,
    httpStatus:       null,
    contentType:      null,
    fetchDurationMs: null,
    rawText:          null,
    contentHash:      null,
    rawHtmlPointer:  null,
    failureReason:    null,
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

    base.fetchDurationMs = Date.now() - t0;
    base.httpStatus = res.status;
    base.finalUrl   = res.url;
    base.contentType = res.headers.get("content-type");

    if (res.status >= 400) {
      base.failureReason = ORCHESTRATION_REASON.MENU_FETCH_HTTP_ERROR;
      return base;
    }

    const html   = await res.text();
    const fetchedAt = new Date();

    // Extract visible text
    base.rawText     = extractText(html);
    base.contentHash = createHash("sha256").update(base.rawText).digest("hex");

    // Write HTML receipt to R2 (non-blocking best-effort)
    base.rawHtmlPointer = await writeToR2(target.entityId, html, fetchedAt);
    if (!base.rawText || base.rawText.length === 0) {
      base.failureReason = ORCHESTRATION_REASON.MENU_FETCH_EMPTY_TEXT;
    }

    return base;
  } catch (err) {
    base.fetchDurationMs = Date.now() - t0;
    base.error = err instanceof Error ? err.message : String(err);
    base.failureReason = ORCHESTRATION_REASON.MENU_FETCH_FAILED;
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
  const method = outcome.failureReason
    ? `${TEXT_METHOD}|${outcome.failureReason}`
    : TEXT_METHOD;
  await db.menu_fetches.create({
    data: {
      id:                    randomUUID(),
      entityId:             outcome.target.entityId,
      sourceUrl:            outcome.resolvedUrl,
      finalUrl:             outcome.finalUrl ?? undefined,
      menuFormat:           "html",
      httpStatus:           outcome.httpStatus ?? undefined,
      contentType:          outcome.contentType ?? undefined,
      fetchDurationMs:     outcome.fetchDurationMs ?? undefined,
      rawText:              outcome.rawText ?? undefined,
      contentHash:          outcome.contentHash ?? undefined,
      rawHtmlPointer:      outcome.rawHtmlPointer ?? undefined,
      textExtractionMethod: method,
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
  // Fallback to discovered merchant_surfaces menu URLs when scan snapshots are absent.
  type RawTarget = { entityId: string; entityName: string; slug: string; sourceUrl: string; menuUrl: string };

  const rawTargets = slugArg
    ? await db.$queryRaw<RawTarget[]>`
        SELECT DISTINCT ON (mss.entity_id)
          e.id           AS "entityId",
          e.name         AS "entityName",
          e.slug,
          COALESCE(mss.final_url, mss.source_url) AS "sourceUrl",
          mss.menu_url   AS "menuUrl"
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
          e.id           AS "entityId",
          e.name         AS "entityName",
          e.slug,
          COALESCE(mss.final_url, mss.source_url) AS "sourceUrl",
          mss.menu_url   AS "menuUrl"
        FROM merchant_surface_scans mss
        JOIN entities e ON e.id = mss.entity_id
        WHERE mss.http_status < 400
          AND mss.menu_present = true
          AND mss.menu_format  = 'html'
          AND mss.menu_url IS NOT NULL
        ORDER BY mss.entity_id, mss.fetched_at DESC
        LIMIT ${limit}`;

  let targets: MenuTarget[] = rawTargets.map((r) => ({
    entityId:   r.entityId,
    entityName: r.entityName,
    slug:        r.slug,
    sourceUrl:  r.sourceUrl,
    menuUrl:    r.menuUrl,
  }));

  if (targets.length === 0) {
    const fallbackTargets = slugArg
      ? await db.$queryRaw<RawTarget[]>`
          SELECT DISTINCT ON (ms.entity_id, ms.source_url)
            e.id AS "entityId",
            e.name AS "entityName",
            e.slug,
            COALESCE(NULLIF(e.website, ''), ms.source_url) AS "sourceUrl",
            ms.source_url AS "menuUrl"
          FROM merchant_surfaces ms
          JOIN entities e ON e.id = ms.entity_id
          WHERE e.slug = ${slugArg}
            AND ms.source_url IS NOT NULL
            AND ms.source_url ~* '/(menu|dinner|lunch|brunch|cafe|wine|drinks?)'
          ORDER BY ms.entity_id, ms.source_url, ms.discovered_at DESC
          LIMIT ${limit}`
      : await db.$queryRaw<RawTarget[]>`
          SELECT DISTINCT ON (ms.entity_id, ms.source_url)
            e.id AS "entityId",
            e.name AS "entityName",
            e.slug,
            COALESCE(NULLIF(e.website, ''), ms.source_url) AS "sourceUrl",
            ms.source_url AS "menuUrl"
          FROM merchant_surfaces ms
          JOIN entities e ON e.id = ms.entity_id
          WHERE ms.source_url IS NOT NULL
            AND ms.source_url ~* '/(menu|dinner|lunch|brunch|cafe|wine|drinks?)'
          ORDER BY ms.entity_id, ms.source_url, ms.discovered_at DESC
          LIMIT ${limit}`;

    targets = fallbackTargets.map((r) => ({
      entityId:   r.entityId,
      entityName: r.entityName,
      slug:        r.slug,
      sourceUrl:  r.sourceUrl,
      menuUrl:    r.menuUrl,
    }));
  }

  console.log(`${targets.length} HTML menu targets from scans/surfaces\n`);

  const outcomes: FetchOutcome[] = new Array(targets.length);
  let written = 0;
  let errors  = 0;

  await runPool(
    targets,
    async (target, idx) => {
      const outcome = await fetchMenu(target);
      outcomes[idx] = outcome;

      const statusStr = outcome.httpStatus ? String(outcome.httpStatus) : outcome.error ? "ERR" : "?";
      const textLen   = outcome.rawText?.length ?? 0;
      const hashShort = outcome.contentHash?.slice(0, 8) ?? "—";
      const r2Str     = outcome.rawHtmlPointer ? "r2=✓" : "r2=—";
      const reasonStr = outcome.failureReason ?? "OK";

      console.log(
        `  [${String(idx + 1).padStart(2)}] ${target.entityName.slice(0, 36).padEnd(36)} ` +
        `http=${statusStr} ${String(outcome.fetchDurationMs ?? 0).padStart(5)}ms ` +
        `text=${String(textLen).padStart(6)}c hash=${hashShort} ${r2Str} reason=${reasonStr}`,
      );
      if (outcome.error) console.log(`      error: ${outcome.error}`);

      // No silent drops: persist every attempted target as a row.
      if (outcome.httpStatus !== null || outcome.error) {
        try {
          await writeFetch(outcome, dryRun);
          if (!dryRun) written++;
        } catch (err) {
          console.error(`    !! DB write failed for ${target.entityName}:`, err);
          errors++;
        }
      }
    },
    CONCURRENCY,
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const ok       = outcomes.filter((o) => o?.httpStatus && o.httpStatus < 400);
  const withText = ok.filter((o) => (o.rawText?.length ?? 0) > 50);
  const withR2   = ok.filter((o) => o.rawHtmlPointer);
  const failures = outcomes.filter((o) => o?.failureReason !== null);
  const avgLen   = withText.length > 0
    ? Math.round(withText.reduce((s, o) => s + (o.rawText?.length ?? 0), 0) / withText.length)
    : 0;

  console.log(`\n${"═".repeat(60)}`);
  console.log(`FETCH SUMMARY  (${ok.length} ok / ${targets.length} attempted / ${written} written)`);
  console.log(`${"═".repeat(60)}`);
  console.log(`Usable text (>50c):  ${withText.length} / ${ok.length}`);
  console.log(`Avg text length:     ${avgLen.toLocaleString()} chars`);
  console.log(`R2 receipts stored:  ${withR2.length} / ${ok.length}`);
  if (failures.length > 0) {
    const reasonCounts = new Map<string, number>();
    for (const row of failures) {
      const key = row.failureReason ?? "UNKNOWN";
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }
    console.log(`Failure reasons:`);
    for (const [reason, count] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${reason.padEnd(26)} ${count}`);
    }
  }
  if (errors) console.log(`DB errors:           ${errors}`);
  if (dryRun) console.log(`\n[dry-run] No rows written.`);
  else        console.log(`\n${written} rows written to menu_fetches.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
