#!/usr/bin/env node
/**
 * SAIKO Website Enrichment Spec v1.1 — runner script
 *
 * Usage:
 *   npm run enrich:website [-- --limit=N] [--refresh] [--dry-run]
 *   npm run enrich:website [-- --mode=categoryOnly --limit=N] [--dry-run]
 *   npm run enrich:website [-- --mode=categoryOnly --ignoreCategoryThrottle]  # bypass 30d throttle (emergency re-try)
 *
 * Selection (default): website + empty category + last_enriched_at null
 * --refresh: website + last_enriched_at older than 180 days
 * --mode=categoryOnly: website + empty category, exclude STAY, throttle by category_enrich_attempted_at (30 days)
 * --ignoreCategoryThrottle: (categoryOnly only) bypass throttle; keep allowlist, conf≥0.65, STAY exclusion
 */

import { db } from "../lib/db";
import {
  runEnrichmentForPlace,
  applyWriteRules,
  applyWriteRulesCategoryOnly,
} from "../lib/website-enrichment";
import { logPlaceJob } from "../lib/place-job-log";

const REFRESH_STALENESS_DAYS = 180;
const CATEGORY_ONLY_THROTTLE_DAYS = 30;

async function main() {
  const args = process.argv.slice(2);
  const limit =
    parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10) || 50;
  const refresh = args.includes("--refresh");
  const dryRun = args.includes("--dry-run");
  const categoryOnly =
    args.find((a) => a.startsWith("--mode="))?.split("=")[1] === "categoryOnly";
  const ignoreCategoryThrottle =
    args.includes("--ignoreCategoryThrottle") ||
    args.includes("--forceCategoryCandidates");

  const throttleCutoff = new Date(
    Date.now() - CATEGORY_ONLY_THROTTLE_DAYS * 24 * 60 * 60 * 1000
  );

  const where = categoryOnly
    ? {
        AND: [
          { website: { not: null } },
          { NOT: { website: "" } },
          { OR: [{ category: null }, { category: "" }] },
          { primary_vertical: { not: "STAY" } },
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
    : refresh
      ? {
          website: { not: null },
          last_enriched_at: {
            lt: new Date(
              Date.now() - REFRESH_STALENESS_DAYS * 24 * 60 * 60 * 1000
            ),
          },
        }
      : {
          AND: [
            { website: { not: null } },
            { NOT: { website: "" } },
            { OR: [{ category: null }, { category: "" }] },
            { last_enriched_at: null },
          ],
        };

  const places = await db.entities.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, website: true, name: true, category: true },
  });

  const candidates = places.filter(
    (p) => (p.website?.trim()?.length ?? 0) > 0
  );

  console.log(
    `Website enrichment: ${candidates.length} places (mode=${categoryOnly ? "categoryOnly" : refresh ? "refresh" : "default"}, ignoreThrottle=${ignoreCategoryThrottle}, dryRun=${dryRun})\n`
  );

  let wouldWrite = 0;
  let didWrite = 0;

  for (const place of candidates) {
    const website = place.website!.trim();
    if (!website) continue;
    try {
      const payload = await runEnrichmentForPlace({
        place_id: place.id,
        website,
      });
      const pagesFetched = payload.raw?.about_text_sample ? 2 : 1;
      if (!dryRun) {
        await logPlaceJob({
          entityId: place.id,
          entityType: "place",
          jobType: "SCAN",
          pagesFetched,
          aiCalls: 0,
        });
      }
      console.log(
        `  ${place.name} | ${payload.http_status} | conf=${payload.confidence.toFixed(2)} | cat=${payload.signals.inferred_category ?? "—"}`
      );
      if (categoryOnly) {
        const result = await applyWriteRulesCategoryOnly(payload, { dryRun });
        if (result.wouldWriteCategory) wouldWrite++;
        if (result.didWriteCategory) didWrite++;
      } else if (!dryRun) {
        await applyWriteRules(payload);
      }
    } catch (e) {
      console.error(`  ${place.name} FULL ERROR:`);
      console.error(e);
    }
  }

  if (categoryOnly) {
    if (dryRun) {
      console.log(`\nMatched: ${candidates.length} | Would write: ${wouldWrite} categories`);
    } else {
      console.log(`\nMatched: ${candidates.length} | Written: ${didWrite} categories filled`);
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
