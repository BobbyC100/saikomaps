#!/usr/bin/env node
/**
 * Enrichment Snapshot — captures aggregate entity/enrichment metrics to JSON.
 *
 * Usage:
 *   npm run enrichment:snapshot                         (prints to stdout)
 *   npm run enrichment:snapshot -- --save-to=/tmp/enrichment_snapshot_before.json
 */

import { writeFileSync } from "fs";
import { db } from "../lib/db";
import { EnrichmentStage } from "@prisma/client";

export type EnrichmentSnapshot = {
  timestamp: string;
  total_entities: number;
  with_category: number;
  with_neighborhood: number;
  with_website: number;
  with_gpid: number;
  merchant_enriched: number;
  google_coverage_complete: number;
  not_started: number;
  failed: number;
  stage_null: number;
};

export async function captureSnapshot(): Promise<EnrichmentSnapshot> {
  const [
    total,
    with_category,
    with_neighborhood,
    with_website,
    with_gpid,
    merchant_enriched,
    google_coverage_complete,
    not_started,
    failed,
    stage_null,
  ] = await Promise.all([
    db.entities.count(),
    db.entities.count({ where: { category: { not: null }, NOT: { category: "" } } }),
    db.entities.count({ where: { neighborhood: { not: null }, NOT: { neighborhood: "" } } }),
    db.entities.count({ where: { website: { not: null }, NOT: { website: "" } } }),
    db.entities.count({ where: { googlePlaceId: { not: null }, NOT: { googlePlaceId: "" } } }),
    db.entities.count({ where: { enrichment_stage: EnrichmentStage.MERCHANT_ENRICHED } }),
    db.entities.count({ where: { enrichment_stage: EnrichmentStage.GOOGLE_COVERAGE_COMPLETE } }),
    db.entities.count({ where: { enrichment_stage: EnrichmentStage.NOT_STARTED } }),
    db.entities.count({ where: { enrichment_stage: EnrichmentStage.FAILED } }),
    db.entities.count({ where: { enrichment_stage: null } }),
  ]);

  return {
    timestamp: new Date().toISOString(),
    total_entities: total,
    with_category,
    with_neighborhood,
    with_website,
    with_gpid,
    merchant_enriched,
    google_coverage_complete,
    not_started,
    failed,
    stage_null,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const saveTo = args.find((a) => a.startsWith("--save-to="))?.slice(10);

  const snapshot = await captureSnapshot();

  console.log("\nENRICHMENT SNAPSHOT");
  console.log("─".repeat(40));
  console.log(`  Timestamp:                  ${snapshot.timestamp}`);
  console.log(`  Total entities:             ${snapshot.total_entities}`);
  console.log(`  With category:              ${snapshot.with_category}`);
  console.log(`  With neighborhood:          ${snapshot.with_neighborhood}`);
  console.log(`  With website:               ${snapshot.with_website}`);
  console.log(`  With Google Place ID:       ${snapshot.with_gpid}`);
  console.log("  —");
  console.log(`  Stage: NOT_STARTED:         ${snapshot.not_started}`);
  console.log(`  Stage: GOOGLE_COMPLETE:     ${snapshot.google_coverage_complete}`);
  console.log(`  Stage: MERCHANT_ENRICHED:   ${snapshot.merchant_enriched}`);
  console.log(`  Stage: FAILED:              ${snapshot.failed}`);
  console.log(`  Stage: (null):              ${snapshot.stage_null}`);
  console.log("─".repeat(40));

  if (saveTo) {
    writeFileSync(saveTo, JSON.stringify(snapshot, null, 2));
    console.log(`  Saved → ${saveTo}\n`);
  }
}

main()
  .catch((e) => {
    console.error("Snapshot failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
