#!/usr/bin/env node
/**
 * Enrichment Performance Test — one controlled run with before/after diff.
 *
 * Flow:
 *   1. Find up to N candidates (website + no category + not MERCHANT_ENRICHED)
 *   2. Capture per-entity before state
 *   3. Run website enrichment on each (writes to DB)
 *   4. Re-query per-entity after state
 *   5. Print diff report + write CSVs
 *
 * Usage:
 *   npm run enrichment:test                    (limit=50, dry-run=false)
 *   npm run enrichment:test -- --limit=10
 *   npm run enrichment:test -- --dry-run
 *   npm run enrichment:test -- --la-only       (restrict to SoCal entities)
 *   npm run enrichment:test -- --limit=10 --la-only --dry-run
 *
 * Output files (written to /tmp):
 *   enrichment_snapshot_before.json
 *   enrichment_snapshot_after.json
 *   successful_enrichments.csv
 *   failed_enrichments.csv
 *   no_change.csv
 */

import { writeFileSync } from "fs";
import { db } from "../lib/db";
import { EnrichmentStage } from "@prisma/client";
import {
  runEnrichmentForPlace,
  applyWriteRules,
} from "../lib/website-enrichment";
import { logPlaceJob } from "../lib/place-job-log";
import { captureSnapshot } from "./enrichment-snapshot";

// ── Types ─────────────────────────────────────────────────────────────────────

type EntityBefore = {
  id: string;
  name: string;
  website: string | null;
  category: string | null;
  neighborhood: string | null;
  enrichment_stage: EnrichmentStage | null;
  last_enriched_at: Date | null;
};

type EntityResult = EntityBefore & {
  category_after: string | null;
  neighborhood_after: string | null;
  stage_after: EnrichmentStage | null;
  http_status: number | null;
  confidence: number | null;
  error: string | null;
};

// ── CSV helpers ───────────────────────────────────────────────────────────────

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_HEADER = "id,name,website,category_before,category_after,stage_before,stage_after,confidence,error";

function toCsvRow(r: EntityResult): string {
  return [
    r.id,
    r.name,
    r.website,
    r.category,
    r.category_after,
    r.enrichment_stage,
    r.stage_after,
    r.confidence != null ? r.confidence.toFixed(3) : "",
    r.error,
  ]
    .map(csvEscape)
    .join(",");
}

function writeCsv(path: string, rows: EntityResult[]) {
  const lines = [CSV_HEADER, ...rows.map(toCsvRow)].join("\n");
  writeFileSync(path, lines, "utf-8");
}

// ── SoCal scoping conditions ──────────────────────────────────────────────────

const SOCAL_TOKENS = [
  "Los Angeles", "Santa Monica", "Venice", "Pasadena", "Long Beach",
  "Culver City", "West Hollywood", "Beverly Hills", "Burbank", "Glendale",
  "Manhattan Beach", "Hermosa Beach", "Redondo Beach", "Torrance", "Inglewood",
  "Marina del Rey", "El Segundo", "Malibu", "Echo Park", "Silver Lake",
  "DTLA", "Koreatown", "Hollywood", "San Fernando Valley", "Studio City",
  "Sherman Oaks", "Los Feliz",
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.slice(8) ?? "50", 10) || 50;
  const dryRun = args.includes("--dry-run");
  const laOnly = args.includes("--la-only");

  const BEFORE_PATH = "/tmp/enrichment_snapshot_before.json";
  const AFTER_PATH  = "/tmp/enrichment_snapshot_after.json";
  const SUCCESS_CSV = "/tmp/successful_enrichments.csv";
  const FAILED_CSV  = "/tmp/failed_enrichments.csv";
  const NOCHANGE_CSV = "/tmp/no_change.csv";

  console.log("\n" + "═".repeat(56));
  console.log("  ENRICHMENT PERFORMANCE TEST");
  console.log(`  limit=${limit}  la-only=${laOnly}  dry-run=${dryRun}`);
  console.log("═".repeat(56));

  // ── Step 1: Aggregate before snapshot ──────────────────────────────────────
  console.log("\n[1/5] Capturing before snapshot...");
  const snapshotBefore = await captureSnapshot();
  writeFileSync(BEFORE_PATH, JSON.stringify(snapshotBefore, null, 2));
  console.log(`  Saved → ${BEFORE_PATH}`);

  // ── Step 2: Find candidates ────────────────────────────────────────────────
  console.log("\n[2/5] Selecting candidates...");
  console.log("  Criteria: website not null + category null + stage != MERCHANT_ENRICHED");

  const soCalConditions = laOnly
    ? [
        {
          OR: [
            { address: { contains: ", CA", mode: "insensitive" as const } },
            { address: { contains: " CA ", mode: "insensitive" as const } },
          ],
        },
        {
          OR: [
            { neighborhood: { not: null } },
            ...SOCAL_TOKENS.map((t) => ({
              address: { contains: t, mode: "insensitive" as const },
            })),
          ],
        },
      ]
    : [];

  const candidateWhere = {
    AND: [
      { website: { not: null } },
      { NOT: { website: "" } },
      { OR: [{ category: null }, { category: "" }] },
      { NOT: { enrichment_stage: EnrichmentStage.MERCHANT_ENRICHED } },
      ...soCalConditions,
    ],
  };

  const foundRaw = await db.entities.findMany({
    where: candidateWhere,
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      website: true,
      category: true,
      neighborhood: true,
      enrichment_stage: true,
      last_enriched_at: true,
    },
  });

  const candidates: EntityBefore[] = foundRaw.filter(
    (e) => (e.website?.trim()?.length ?? 0) > 0
  );

  if (candidates.length === 0) {
    console.log("  No candidates found. Exiting.");
    process.exit(0);
  }

  console.log(`  Found ${candidates.length} candidate(s)\n`);
  if (laOnly) console.log("  scope=socal");

  // ── Step 3: Run enrichment ─────────────────────────────────────────────────
  console.log(`\n[3/5] Running enrichment on ${candidates.length} entities${dryRun ? " (DRY RUN)" : ""}...`);
  console.log("─".repeat(56));

  const results: EntityResult[] = [];

  for (const entity of candidates) {
    const website = entity.website!.trim();
    process.stdout.write(`  ${entity.name.padEnd(34)} `);

    let http_status: number | null = null;
    let confidence: number | null = null;
    let error: string | null = null;

    try {
      if (!dryRun) {
        await db.entities.update({
          where: { id: entity.id },
          data: { last_enrichment_attempt_at: new Date() },
        });
      }

      const payload = await runEnrichmentForPlace({ place_id: entity.id, website });
      http_status = payload.http_status;
      confidence = payload.confidence;

      if (!dryRun) {
        await applyWriteRules(payload);
        await logPlaceJob({
          entityId: entity.id,
          entityType: "place",
          jobType: "SCAN",
          pagesFetched: payload.raw?.about_text_sample ? 2 : 1,
          aiCalls: 0,
        });
      }

      console.log(`http=${http_status} conf=${confidence.toFixed(2)} cat=${payload.signals.inferred_category ?? "—"}`);
    } catch (e) {
      error = e instanceof Error ? e.message.slice(0, 300) : String(e);
      console.log(`ERROR: ${error.slice(0, 60)}`);

      if (!dryRun) {
        const row = await db.entities.findUnique({
          where: { id: entity.id },
          select: { enrichment_retry_count: true },
        });
        await db.entities.update({
          where: { id: entity.id },
          data: {
            last_enrichment_error: error.slice(0, 2000),
            enrichment_retry_count: (row?.enrichment_retry_count ?? 0) + 1,
            enrichment_stage: EnrichmentStage.FAILED,
          },
        });
      }
    }

    results.push({
      ...entity,
      category_after: null,     // filled in step 4
      neighborhood_after: null,
      stage_after: null,
      http_status,
      confidence,
      error,
    });
  }

  // ── Step 4: Re-query after state ───────────────────────────────────────────
  console.log("\n[4/5] Capturing after state...");

  const snapshotAfter = await captureSnapshot();
  writeFileSync(AFTER_PATH, JSON.stringify(snapshotAfter, null, 2));
  console.log(`  Saved → ${AFTER_PATH}`);

  if (!dryRun) {
    const ids = candidates.map((c) => c.id);
    const afterRows = await db.entities.findMany({
      where: { id: { in: ids } },
      select: { id: true, category: true, neighborhood: true, enrichment_stage: true },
    });
    const afterMap = new Map(afterRows.map((r) => [r.id, r]));

    for (const r of results) {
      const after = afterMap.get(r.id);
      r.category_after    = after?.category ?? r.category;
      r.neighborhood_after = after?.neighborhood ?? r.neighborhood;
      r.stage_after       = after?.enrichment_stage ?? r.enrichment_stage;
    }
  } else {
    // dry-run: after = before
    for (const r of results) {
      r.category_after    = r.category;
      r.neighborhood_after = r.neighborhood;
      r.stage_after       = r.enrichment_stage;
    }
  }

  // ── Step 5: Diff + report ──────────────────────────────────────────────────
  console.log("\n[5/5] Generating report...");

  const successful = results.filter(
    (r) => !r.error && (r.category_after !== r.category || r.stage_after !== r.enrichment_stage)
  );
  const failed     = results.filter((r) => !!r.error);
  const noChange   = results.filter(
    (r) => !r.error && r.category_after === r.category && r.stage_after === r.enrichment_stage
  );

  const categoryFilled      = results.filter((r) => !r.category && r.category_after).length;
  const neighborhoodFilled  = results.filter((r) => !r.neighborhood && r.neighborhood_after).length;
  const stageAdvanced       = results.filter(
    (r) => r.stage_after === EnrichmentStage.MERCHANT_ENRICHED && r.enrichment_stage !== EnrichmentStage.MERCHANT_ENRICHED
  ).length;
  const stageFailed         = results.filter((r) => r.stage_after === EnrichmentStage.FAILED).length;

  const successRate = results.length > 0
    ? Math.round((successful.length / results.length) * 100)
    : 0;

  const HR = "─".repeat(56);

  console.log("\n" + "═".repeat(56));
  console.log("  ENRICHMENT PERFORMANCE REPORT");
  console.log("═".repeat(56));
  console.log(`\n  Entities processed:        ${results.length}`);
  console.log(`  Improved (any change):     ${successful.length}`);
  console.log(`  No change:                 ${noChange.length}`);
  console.log(`  Failed:                    ${failed.length}`);
  console.log(`  Success rate:              ${successRate}%`);

  console.log(`\n${HR}`);
  console.log("  DATA GAINS");
  console.log(HR);
  console.log(`  Category filled:           +${categoryFilled}`);
  console.log(`  Neighborhood filled:       +${neighborhoodFilled}`);

  console.log(`\n${HR}`);
  console.log("  STAGE TRANSITIONS");
  console.log(HR);
  console.log(`  → MERCHANT_ENRICHED:       +${stageAdvanced}`);
  console.log(`  → FAILED:                  +${stageFailed}`);

  console.log(`\n${HR}`);
  console.log("  AGGREGATE DELTAS (global)");
  console.log(HR);
  const d = (a: number, b: number) => (a - b >= 0 ? `+${a - b}` : String(a - b));
  console.log(`  with_category:             ${d(snapshotAfter.with_category, snapshotBefore.with_category)}`);
  console.log(`  with_neighborhood:         ${d(snapshotAfter.with_neighborhood, snapshotBefore.with_neighborhood)}`);
  console.log(`  merchant_enriched:         ${d(snapshotAfter.merchant_enriched, snapshotBefore.merchant_enriched)}`);
  console.log(`  failed:                    ${d(snapshotAfter.failed, snapshotBefore.failed)}`);

  if (dryRun) {
    console.log("\n  (DRY RUN — no writes made; deltas above are all 0)");
  }

  // Write CSVs
  writeCsv(SUCCESS_CSV,  successful);
  writeCsv(FAILED_CSV,   failed);
  writeCsv(NOCHANGE_CSV, noChange);

  console.log(`\n${HR}`);
  console.log("  OUTPUT FILES");
  console.log(HR);
  console.log(`  Before snapshot:           ${BEFORE_PATH}`);
  console.log(`  After snapshot:            ${AFTER_PATH}`);
  console.log(`  Successful enrichments:    ${SUCCESS_CSV}  (${successful.length} rows)`);
  console.log(`  Failed enrichments:        ${FAILED_CSV}  (${failed.length} rows)`);
  console.log(`  No change:                 ${NOCHANGE_CSV}  (${noChange.length} rows)`);
  console.log("═".repeat(56) + "\n");
}

main()
  .catch((e) => {
    console.error("Enrichment test failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
