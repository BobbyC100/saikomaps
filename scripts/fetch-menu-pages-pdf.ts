#!/usr/bin/env node
/**
 * WO-002B — Offering Menu Fetch Pass (PDF)
 *
 * Extends the menu fetch pipeline to acquire PDF menus discovered by the
 * Merchant Surface Scanner. Acquisition only — no parsing, no claims, no signals.
 *
 * Process per entity:
 *   1. Read menu_url from current-state merchant_surface_scans (menu_format = 'pdf')
 *   2. Fetch the URL (binary)
 *   3. Validate content-type = application/pdf — bail out gracefully if not
 *   4. Upload raw PDF receipt to R2
 *   5. Run pdftotext to extract visible text
 *   6. Classify pdf_type (text_based | image_based | unknown)
 *   7. Classify extraction_quality (good | sparse | empty)
 *   8. Compute sha256(raw_text)
 *   9. Write append-only row to menu_fetches
 *
 * Usage:
 *   npx tsx scripts/fetch-menu-pages-pdf.ts [--limit=N] [--slug=<slug>] [--dry-run]
 *
 * Downstream: menu_fetches rows are format-agnostic — interpretation passes
 *   consume (entity_id, raw_text, content_hash, fetched_at) regardless of
 *   whether the source was HTML or PDF.
 */

import { db }                        from "../lib/db";
import { createHash }                from "crypto";
import { execFile }                  from "child_process";
import { writeFile, unlink }         from "fs/promises";
import { tmpdir }                    from "os";
import { join }                      from "path";
import { promisify }                 from "util";
import { randomUUID }                from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT    = 20;
const FETCH_TIMEOUT_MS = 20_000;   // PDFs can be slow — give extra headroom
const CONCURRENCY      = 3;        // Keep low: disk I/O + pdftotext subprocess
const TEXT_METHOD      = "pdftotext";

// Extraction quality thresholds (character count of extracted raw_text)
const QUALITY_GOOD_MIN   = 200;  // clearly usable
const QUALITY_SPARSE_MIN = 20;   // some text, likely weak

// R2 — same bucket as HTML pass, different key prefix
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

type PdfType           = "text_based" | "image_based" | "unknown";
type ExtractionQuality = "good" | "sparse" | "empty";

interface PdfTarget {
  entityId:   string;
  entityName: string;
  slug:        string;
  sourceUrl:  string;   // resolved base URL from the surface scan
  menuUrl:    string;   // may be relative or absolute
}

interface PdfOutcome {
  target:               PdfTarget;
  resolvedUrl:         string;
  finalUrl:            string | null;
  httpStatus:          number | null;
  contentType:         string | null;     // actual HTTP content-type received
  fetchDurationMs:    number | null;
  rawText:             string | null;
  contentHash:         string | null;
  rawHtmlPointer:     string | null;     // r2 receipt (PDF bytes)
  pdfType:             PdfType;
  extractionQuality:   ExtractionQuality;
  error:                string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveUrl(url: string, base: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  try { return new URL(url, base).toString(); } catch { return url; }
}

function classifyQuality(charCount: number): ExtractionQuality {
  if (charCount >= QUALITY_GOOD_MIN)   return "good";
  if (charCount >= QUALITY_SPARSE_MIN) return "sparse";
  return "empty";
}

function classifyPdfType(charCount: number, extractionSucceeded: boolean): PdfType {
  if (!extractionSucceeded) return "unknown";
  // If pdftotext ran but got no text → no text layer → image-based (scanned)
  if (charCount < QUALITY_SPARSE_MIN) return "image_based";
  return "text_based";
}

// ---------------------------------------------------------------------------
// pdftotext — write buffer to temp file, run pdftotext, clean up
// ---------------------------------------------------------------------------

async function runPdfToText(pdfBuffer: Buffer): Promise<{ text: string; success: boolean }> {
  const tmpPath = join(tmpdir(), `saiko-menu-${randomUUID()}.pdf`);
  try {
    await writeFile(tmpPath, pdfBuffer);
    // -layout preserves whitespace layout; "-" writes to stdout
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-layout", tmpPath, "-"],
      { maxBuffer: 10 * 1024 * 1024 },  // 10 MB stdout cap
    );
    return { text: stdout.trim(), success: true };
  } catch (err) {
    // pdftotext exits non-zero for encrypted/corrupt PDFs — treat as empty
    return { text: "", success: false };
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// R2 write — PDF bytes stored as receipt
// ---------------------------------------------------------------------------

async function writePdfToR2(
  entityId: string,
  pdfBuffer: Buffer,
  fetchedAt: Date,
): Promise<string | null> {
  if (!r2) return null;
  const ts  = fetchedAt.toISOString().replace(/[:.]/g, "-");
  const key = `menu-fetches/${entityId}/${ts}.pdf`;
  try {
    await r2.send(new PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         key,
      Body:        pdfBuffer,
      ContentType: "application/pdf",
    }));
    return `r2://${R2_BUCKET}/${key}`;
  } catch (err) {
    console.warn(`    [r2] upload failed: ${(err as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch one PDF menu
// ---------------------------------------------------------------------------

async function fetchPdf(target: PdfTarget): Promise<PdfOutcome> {
  const resolvedUrl = resolveUrl(target.menuUrl, target.sourceUrl);

  const base: PdfOutcome = {
    target,
    resolvedUrl:       resolvedUrl,
    finalUrl:          null,
    httpStatus:        null,
    contentType:       null,
    fetchDurationMs:  null,
    rawText:           null,
    contentHash:       null,
    rawHtmlPointer:   null,
    pdfType:           "unknown",
    extractionQuality: "empty",
    error:              null,
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
        Accept: "application/pdf,*/*",
      },
      redirect: "follow",
    });

    base.fetchDurationMs = Date.now() - t0;
    base.httpStatus       = res.status;
    base.finalUrl         = res.url;
    base.contentType      = res.headers.get("content-type");

    if (res.status >= 400) return base;

    const fetchedAt  = new Date();
    const bodyBuffer = Buffer.from(await res.arrayBuffer());

    // Validate content-type before attempting extraction
    const ct = (base.contentType ?? "").toLowerCase();
    const isPdf = ct.includes("application/pdf") || ct.includes("application/octet-stream");

    if (!isPdf) {
      // Not a PDF (HTML redirect, login wall, etc.) — store what we got, no extraction
      base.pdfType           = "unknown";
      base.extractionQuality = "empty";
      // Still upload receipt if it's not giant (useful for debugging)
      if (bodyBuffer.length < 2 * 1024 * 1024) {
        base.rawHtmlPointer = await writePdfToR2(target.entityId, bodyBuffer, fetchedAt);
      }
      return base;
    }

    // --- PDF confirmed ---

    // Upload raw PDF receipt to R2
    base.rawHtmlPointer = await writePdfToR2(target.entityId, bodyBuffer, fetchedAt);

    // Extract text with pdftotext
    const { text, success } = await runPdfToText(bodyBuffer);

    base.rawText           = text || null;
    base.pdfType           = classifyPdfType(text.length, success);
    base.extractionQuality = classifyQuality(text.length);

    if (text.length > 0) {
      base.contentHash = createHash("sha256").update(text).digest("hex");
    }

    return base;
  } catch (err) {
    base.fetchDurationMs = Date.now() - t0;
    base.error = err instanceof Error ? err.message : String(err);
    return base;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// DB write — append only
// ---------------------------------------------------------------------------

async function writeFetch(outcome: PdfOutcome, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  await db.menu_fetches.create({
    data: {
      id:                    randomUUID(),
      entityId:             outcome.target.entityId,
      sourceUrl:            outcome.resolvedUrl,
      finalUrl:             outcome.finalUrl          ?? undefined,
      menuFormat:           "pdf",
      httpStatus:           outcome.httpStatus        ?? undefined,
      contentType:          outcome.contentType       ?? undefined,
      fetchDurationMs:     outcome.fetchDurationMs  ?? undefined,
      rawText:              outcome.rawText            ?? undefined,
      contentHash:          outcome.contentHash        ?? undefined,
      rawHtmlPointer:      outcome.rawHtmlPointer    ?? undefined,
      textExtractionMethod: TEXT_METHOD,
      pdfType:              outcome.pdfType,
      extractionQuality:    outcome.extractionQuality,
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
    console.warn("⚠️  R2 not configured — PDF receipts will not be stored. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local\n");
  }

  console.log(`WO-002B — PDF Menu Fetch Pass${dryRun ? " [DRY RUN]" : ""}\n`);

  // ----- Resolve targets from current-state surface scans ------------------

  type RawTarget = {
    entityId:   string;
    entityName: string;
    slug:        string;
    sourceUrl:  string;
    menuUrl:    string;
  };

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
          AND mss.menu_format  = 'pdf'
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
          AND mss.menu_format  = 'pdf'
          AND mss.menu_url IS NOT NULL
        ORDER BY mss.entity_id, mss.fetched_at DESC
        LIMIT ${limit}`;

  const targets: PdfTarget[] = rawTargets.map((r) => ({
    entityId:   r.entityId,
    entityName: r.entityName,
    slug:        r.slug,
    sourceUrl:  r.sourceUrl,
    menuUrl:    r.menuUrl,
  }));

  console.log(`${targets.length} PDF menu targets from surface scans\n`);
  if (targets.length === 0) {
    console.log("No PDF targets. Run scan-merchant-surfaces.ts first to populate merchant_surface_scans.");
    return;
  }

  const outcomes: PdfOutcome[] = new Array(targets.length);
  let written = 0;
  let errors  = 0;

  await runPool(
    targets,
    async (target, idx) => {
      const outcome = await fetchPdf(target);
      outcomes[idx] = outcome;

      const statusStr = outcome.httpStatus ? String(outcome.httpStatus) : outcome.error ? "ERR" : "?";
      const ctStr     = (outcome.contentType ?? "—").slice(0, 24);
      const textLen   = outcome.rawText?.length ?? 0;
      const r2Str     = outcome.rawHtmlPointer ? "r2=✓" : "r2=—";

      console.log(
        `  [${String(idx + 1).padStart(2)}] ${target.entityName.slice(0, 34).padEnd(34)} ` +
        `http=${statusStr.padEnd(3)} ${String(outcome.fetchDurationMs ?? 0).padStart(5)}ms ` +
        `type=${outcome.pdfType.padEnd(11)} q=${outcome.extractionQuality.padEnd(6)} ` +
        `text=${String(textLen).padStart(6)}c ${r2Str}`,
      );
      if (outcome.error)               console.log(`      error: ${outcome.error}`);
      if (!outcome.contentType?.toLowerCase().includes("pdf") && outcome.httpStatus && outcome.httpStatus < 400) {
        console.log(`      ⚠  content-type mismatch: ${ctStr} — text extraction skipped`);
      }

      // Write a row for every attempt (success or content-type mismatch) so current-state is derivable
      const shouldWrite = outcome.httpStatus !== null && !outcome.error;
      if (shouldWrite) {
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

  const ok           = outcomes.filter((o) => o?.httpStatus && o.httpStatus < 400);
  const realPdfs     = ok.filter((o) => o.contentType?.toLowerCase().includes("pdf"));
  const withGoodText = ok.filter((o) => o.extractionQuality === "good");
  const withSparse   = ok.filter((o) => o.extractionQuality === "sparse");
  const empty        = ok.filter((o) => o.extractionQuality === "empty");
  const imageBased   = ok.filter((o) => o.pdfType === "image_based");
  const withR2       = ok.filter((o) => o.rawHtmlPointer);

  console.log(`\n${"═".repeat(68)}`);
  console.log(`FETCH SUMMARY  (${ok.length} ok / ${targets.length} attempted / ${written} written)`);
  console.log(`${"═".repeat(68)}`);
  console.log(`Confirmed PDF responses:  ${realPdfs.length} / ${ok.length}`);
  console.log(`Extraction quality:`);
  console.log(`  good   (≥${QUALITY_GOOD_MIN}c):   ${withGoodText.length}`);
  console.log(`  sparse (${QUALITY_SPARSE_MIN}–${QUALITY_GOOD_MIN - 1}c):  ${withSparse.length}`);
  console.log(`  empty  (<${QUALITY_SPARSE_MIN}c):    ${empty.length}`);
  console.log(`Image-based (no text layer): ${imageBased.length}`);
  console.log(`R2 receipts stored:          ${withR2.length} / ${ok.length}`);
  if (errors) console.log(`DB errors:                   ${errors}`);

  if (imageBased.length > 0) {
    console.log(`\nImage-based PDFs (OCR candidates):`);
    imageBased.forEach((o) => console.log(`  • ${o.target.entityName} — ${o.resolvedUrl}`));
  }

  if (dryRun) console.log(`\n[dry-run] No rows written.`);
  else        console.log(`\n${written} rows written to menu_fetches.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
