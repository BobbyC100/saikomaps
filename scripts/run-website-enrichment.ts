#!/usr/bin/env node
/**
 * SAIKO Website Enrichment Spec v1.1 — runner script
 *
 * Idempotency verified — safe for re-run:
 *   - merchant_enrichment_runs: append-only audit (each run = new row; no overwrite)
 *   - merchant_signals: upsert by entityId
 *   - entities: deterministic overwrite (last_enriched_at, category, etc.)
 *   - No append-only arrays that grow per run
 *
 * Usage:
 *   npm run enrich:website -- --la-only [--limit=N] [--dry-run]
 *   npm run enrich:website -- --la-only --refresh [--limit=N]
 *   npm run enrich:website -- --mode=categoryOnly --la-only [--limit=N] [--dry-run]
 *   npm run enrich:website -- --mode=categoryOnly --ignoreCategoryThrottle --la-only
 *   npm run enrich:website -- --ids=uuid1,uuid2,...          (explicit mode, bypasses all scoping)
 *   npm run enrich:website -- --ids=uuid1,uuid2,... --refresh (re-enrich even if already enriched)
 *   npm run enrich:website -- --entity="Gjelina"            (enrich one entity by name)
 *
 * --la-only is REQUIRED for default/pipeline mode (fails fast without it).
 * --ids bypasses --la-only, candidate discovery, and all scoping; runs only the listed IDs.
 * Selection (default): enrichment_stage IN (GOOGLE_COVERAGE_COMPLETE, MERCHANT_ENRICHED) + website + OPEN + never enriched
 * --refresh: same base query but includes already-enriched entities (pipeline) / force re-enrich (explicit)
 * --mode=categoryOnly: website + empty category, exclude STAY, throttle by category_enrich_attempted_at (30 days)
 * --ignoreCategoryThrottle: (categoryOnly only) bypass throttle; keep allowlist, conf≥0.65, STAY exclusion
 */

import { writeFileSync } from "fs";
import { EnrichmentStage, PrimaryVertical } from "@prisma/client";
import { db } from "../lib/db";
import {
  runEnrichmentForPlace,
  applyWriteRules,
  applyWriteRulesCategoryOnly,
} from "../lib/website-enrichment";
import { logPlaceJob } from "../lib/place-job-log";

type RunRecord = {
  id: string;
  name: string;
  website: string;
  http_status: number | null;
  confidence: number | null;
  inferred_category: string | null;
  error: string | null;
  outcome: "improved" | "no-change" | "failed";
};

function csvLine(r: RunRecord): string {
  const esc = (v: string | number | null) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [r.id, r.name, r.website, r.http_status, r.confidence, r.inferred_category, r.error]
    .map(esc)
    .join(",");
}

function writeRunReport(records: RunRecord[], label: string) {
  const successes = records.filter((r) => r.outcome === "improved");
  const noChange  = records.filter((r) => r.outcome === "no-change");
  const failures  = records.filter((r) => r.outcome === "failed");
  const rate = records.length > 0 ? Math.round((successes.length / records.length) * 100) : 0;

  const HR = "─".repeat(50);
  console.log(`\n${HR}`);
  console.log(`  RUN REPORT (${label})`);
  console.log(HR);
  console.log(`  Processed:   ${records.length}`);
  console.log(`  Improved:    ${successes.length}  (${rate}%)`);
  console.log(`  No change:   ${noChange.length}`);
  console.log(`  Failed:      ${failures.length}`);
  console.log(HR);

  const HEADER = "id,name,website,http_status,confidence,inferred_category,error";
  const write = (path: string, rows: RunRecord[]) => {
    writeFileSync(path, [HEADER, ...rows.map(csvLine)].join("\n"), "utf-8");
    console.log(`  ${path.split("/").pop()}: ${rows.length} rows → ${path}`);
  };

  write("/tmp/enrichment_successes.csv", successes);
  write("/tmp/enrichment_no_change.csv", noChange);
  write("/tmp/enrichment_failures.csv",  failures);
  console.log(HR + "\n");
}

const REFRESH_STALENESS_DAYS = 180;
const CATEGORY_ONLY_THROTTLE_DAYS = 30;

async function main() {
  if (!db.entities) {
    throw new Error("Entity model not found — enrichment cannot run");
  }

  const args = process.argv.slice(2);
  const limit =
    parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10) || 50;
  const refresh = args.includes("--refresh");
  const dryRun = args.includes("--dry-run");
  const laOnly = args.includes("--la-only");
  const categoryOnly =
    args.find((a) => a.startsWith("--mode="))?.split("=")[1] === "categoryOnly";
  const ignoreCategoryThrottle =
    args.includes("--ignoreCategoryThrottle") ||
    args.includes("--forceCategoryCandidates");

  // --ids: explicit operator mode — bypasses all discovery, scoping, and --la-only guard.
  const idsArg = args.find((a) => a.startsWith("--ids="))?.slice(6) ?? "";
  const ids = idsArg ? idsArg.split(",").map((s) => s.trim()).filter(Boolean) : [];

  // --entity="Name": find one entity by name (case-insensitive) and enrich it.
  // Resolved to an ID and merged into explicit mode. Takes precedence over --ids.
  const entityName = args.find((a) => a.startsWith("--entity="))?.slice(9)?.replace(/^["']|["']$/g, "") ?? "";

  // ── Shared select shape ───────────────────────────────────────────────────
  const ENTITY_SELECT = {
    id: true,
    website: true,
    name: true,
    category: true,
    address: true,
    neighborhood: true,
    last_enriched_at: true,
  } as const;

  // ── SoCal token list (used by pipeline mode --la-only) ───────────────────
  const SOCAL_TOKENS = [
    "Los Angeles", "Santa Monica", "Venice", "Pasadena", "Long Beach",
    "Culver City", "West Hollywood", "Beverly Hills", "Burbank", "Glendale",
    "Manhattan Beach", "Hermosa Beach", "Redondo Beach", "Torrance", "Inglewood",
    "Marina del Rey", "El Segundo", "Malibu", "Echo Park", "Silver Lake",
    "DTLA", "Koreatown", "Hollywood", "San Fernando Valley", "Studio City",
    "Sherman Oaks", "Los Feliz",
  ];

  // ── Candidate resolution ──────────────────────────────────────────────────
  let candidates: Array<{
    id: string;
    website: string | null;
    name: string;
    category: string | null;
    address: string | null;
    neighborhood: string | null;
    last_enriched_at: Date | null;
  }>;
  let mode: string;

  // Resolve --entity name → id and inject into ids list
  if (entityName) {
    const match = await db.entities.findFirst({
      where: { name: { equals: entityName, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (!match) {
      console.error(`--entity: no entity found with name "${entityName}"`);
      process.exit(1);
    }
    console.log(`--entity: resolved "${entityName}" → ${match.id}`);
    ids.push(match.id);
  }

  if (ids.length > 0) {
    // ── EXPLICIT MODE ───────────────────────────────────────────────────────
    // Ignores --la-only, scoping, candidate-discovery filters.
    mode = "explicit";

    const found = await db.entities.findMany({
      where: { id: { in: ids } },
      select: ENTITY_SELECT,
    });

    const foundIds = new Set(found.map((e) => e.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      console.log(`Missing ${missingIds.length} ID(s) — not found in DB:`);
      missingIds.slice(0, 20).forEach((id) => console.log(`  ${id}`));
      if (missingIds.length > 20) console.log(`  ... and ${missingIds.length - 20} more`);
    }

    // Refresh semantics: skip already-enriched unless --refresh is passed.
    let skippedAlreadyEnriched = 0;
    const enrichable = refresh
      ? found
      : found.filter((e) => {
          if (e.last_enriched_at) { skippedAlreadyEnriched++; return false; }
          return true;
        });

    candidates = enrichable.filter((e) => (e.website?.trim()?.length ?? 0) > 0);

    console.log(
      `Website enrichment: ${candidates.length} entities (mode=explicit, refresh=${refresh}, dryRun=${dryRun})`
    );
    if (skippedAlreadyEnriched > 0) {
      console.log(`  Skipped ${skippedAlreadyEnriched} already enriched (pass --refresh to re-enrich)`);
    }
    console.log("");

    if (candidates.length === 0) {
      console.log("No enrichable entities found. Exiting.");
      return;
    }
  } else {
    // ── PIPELINE MODE ───────────────────────────────────────────────────────
    // Requires --la-only for default mode; applies SoCal scoping when set.

    if (!laOnly && !refresh && !categoryOnly) {
      console.error(
        "ERROR: Default enrichment mode requires --la-only.\n" +
        "       Pass --la-only to restrict to SoCal entities, or --refresh / --mode=categoryOnly for targeted runs.\n" +
        "       To enrich specific entities directly: --ids=uuid1,uuid2,...\n" +
        "       Example: npm run enrich:website -- --la-only --limit=50"
      );
      process.exit(1);
    }

    mode = categoryOnly ? "categoryOnly" : "default";

    const throttleCutoff = new Date(
      Date.now() - CATEGORY_ONLY_THROTTLE_DAYS * 24 * 60 * 60 * 1000
    );

    const where = categoryOnly
      ? {
          AND: [
            { website: { not: null } },
            { NOT: { website: "" } },
            { OR: [{ category: null }, { category: "" }] },
            { primary_vertical: { not: PrimaryVertical.STAY } },
            ...(ignoreCategoryThrottle
              ? []
              : [
                  {
                    OR: [
                      { category_enrich_attempted_at: null },
                      { category_enrich_attempted_at: { lt: throttleCutoff } },
                    ],
                  },
                ]),
          ],
        }
      : {
          // Default + refresh mode share the same base query.
          // --refresh: re-enrich anything (ignore last_enriched_at).
          // Default:   only entities never enriched (last_enriched_at IS NULL).
          enrichment_stage: {
            in: [
              EnrichmentStage.GOOGLE_COVERAGE_COMPLETE,
              EnrichmentStage.MERCHANT_ENRICHED,
            ],
          },
          website: { not: null },
          NOT: { website: "" },
          status: "OPEN" as const,
          ...(refresh ? {} : { last_enriched_at: null }),
        };

    // SoCal scoping (--la-only).
    // Hard guard: California address. Soft guard: neighborhood populated OR SoCal token in address.
    // Future: replace with entities.market = 'los_angeles' once that column is backfilled.
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
              ...SOCAL_TOKENS.map((token) => ({
                address: { contains: token, mode: "insensitive" as const },
              })),
            ],
          },
        ]
      : [];

    if (laOnly) {
      console.log("scope=socal  filter: address ILIKE '%, CA%' AND (neighborhood IS NOT NULL OR SoCal token)");
    }

    const found = await db.entities.findMany({
      where: { AND: [where, ...soCalConditions] },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: ENTITY_SELECT,
    });

    candidates = found.filter((e) => (e.website?.trim()?.length ?? 0) > 0);

    console.log(
      `Website enrichment: ${candidates.length} entities (mode=${mode}, refresh=${refresh}, scope=${laOnly ? "socal" : "global"}, ignoreThrottle=${ignoreCategoryThrottle}, dryRun=${dryRun})\n`
    );

    if (candidates.length === 0) {
      console.log(
        "Website enrichment: 0 candidates (no category gaps in scope). Skipping." +
        "\n  Next: npm run enrich:google -- --la-only --limit=25" +
        "\n  Or target a specific entity: npm run enrich:website -- --ids=<uuid>"
      );
      process.exit(0);
    }

    if (laOnly && candidates.length > 0) {
      console.log("SoCal sample (first 5):");
      for (const e of candidates.slice(0, 5)) {
        console.log(`  ${e.name} | ${e.address ?? "—"} | ${e.neighborhood ?? "—"}`);
      }
      console.log("");
    }
  }

  // ── Enrichment loop (shared by both modes) ────────────────────────────────
  let wouldWrite = 0;
  let didWrite = 0;
  const runRecords: RunRecord[] = [];

  for (const entity of candidates) {
    const website = entity.website!.trim();
    if (!website) continue;
    if (!dryRun) {
      await db.entities.update({
        where: { id: entity.id },
        data: { last_enrichment_attempt_at: new Date() },
      });
    }
    try {
      const payload = await runEnrichmentForPlace({
        place_id: entity.id,
        website,
      });
      const pagesFetched = payload.raw?.about_text_sample ? 2 : 1;
      if (!dryRun) {
        await logPlaceJob({
          entityId: entity.id,
          entityType: "place",
          jobType: "SCAN",
          pagesFetched,
          aiCalls: 0,
        });
      }
      const inferredCat = payload.signals.inferred_category ?? null;
      console.log(
        `  ${entity.name} | ${payload.http_status} | conf=${payload.confidence.toFixed(2)} | cat=${inferredCat ?? "—"}`
      );

      let improved = false;
      if (categoryOnly) {
        const result = await applyWriteRulesCategoryOnly(payload, { dryRun });
        if (result.wouldWriteCategory) wouldWrite++;
        if (result.didWriteCategory) { didWrite++; improved = true; }
      } else if (!dryRun) {
        await applyWriteRules(payload);
        // "improved" = inferred category filled OR confidence indicates real signal
        improved = !!inferredCat || payload.confidence >= 0.5;
      } else {
        improved = !!inferredCat || payload.confidence >= 0.5;
      }

      runRecords.push({
        id: entity.id,
        name: entity.name,
        website,
        http_status: payload.http_status,
        confidence: payload.confidence,
        inferred_category: inferredCat,
        error: null,
        outcome: improved ? "improved" : "no-change",
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (!dryRun) {
        const row = await db.entities.findUnique({
          where: { id: entity.id },
          select: { enrichment_retry_count: true },
        });
        await db.entities.update({
          where: { id: entity.id },
          data: {
            last_enrichment_error: errMsg.slice(0, 2000),
            enrichment_retry_count: (row?.enrichment_retry_count ?? 0) + 1,
            enrichment_stage: EnrichmentStage.FAILED,
          },
        });
      }
      console.error(`  ${entity.name} ERROR: ${errMsg.slice(0, 120)}`);
      runRecords.push({
        id: entity.id,
        name: entity.name,
        website,
        http_status: null,
        confidence: null,
        inferred_category: null,
        error: errMsg.slice(0, 500),
        outcome: "failed",
      });
    }
  }

  if (categoryOnly) {
    if (dryRun) {
      console.log(`\nMatched: ${candidates.length} | Would write: ${wouldWrite} categories`);
    } else {
      console.log(`\nMatched: ${candidates.length} | Written: ${didWrite} categories filled`);
    }
  }

  writeRunReport(runRecords, mode + (dryRun ? "/dry-run" : ""));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
