#!/usr/bin/env node
/**
 * Entity State Report — read-only snapshot of the full entity dataset.
 *
 * Sections:
 *   1. Dataset overview (counts)
 *   2. Geography (CA / LA / non-US)
 *   3. Enrichment stage coverage
 *   4. Missing critical data
 *   5. Potential name duplicates
 *
 * Usage: npm run entities:report
 */

import { db } from "../lib/db";
import { EnrichmentStage } from "@prisma/client";

const HR = "─".repeat(50);

function section(title: string) {
  console.log(`\n${title}`);
  console.log(HR);
}

function row(label: string, value: number | string, total?: number) {
  const pct = typeof value === "number" && total ? ` (${Math.round((value / total) * 100)}%)` : "";
  const padded = String(value).padStart(6);
  console.log(`  ${label.padEnd(32)} ${padded}${pct}`);
}

async function main() {
  console.log("\n" + "═".repeat(50));
  console.log("  ENTITY STATE REPORT");
  console.log("  " + new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC");
  console.log("═".repeat(50));

  // ── 1. DATASET OVERVIEW ───────────────────────────────────────────────────
  section("1. DATASET OVERVIEW");

  const total = await db.entities.count();
  const withCoords = await db.entities.count({
    where: { latitude: { not: null }, longitude: { not: null } },
  });
  const withWebsite = await db.entities.count({
    where: { website: { not: null }, NOT: { website: "" } },
  });
  const withNeighborhood = await db.entities.count({
    where: { neighborhood: { not: null }, NOT: { neighborhood: "" } },
  });
  const withGpid = await db.entities.count({
    where: { googlePlaceId: { not: null }, NOT: { googlePlaceId: "" } },
  });

  row("Total entities", total);
  row("With coordinates", withCoords, total);
  row("With website", withWebsite, total);
  row("With neighborhood", withNeighborhood, total);
  row("With Google Place ID", withGpid, total);

  // ── 2. GEOGRAPHY ─────────────────────────────────────────────────────────
  section("2. GEOGRAPHY");

  // CA = address contains ", CA" (case-insensitive)
  const californiaCount = await db.entities.count({
    where: {
      OR: [
        { address: { contains: ", CA", mode: "insensitive" } },
        { address: { contains: " CA ", mode: "insensitive" } },
      ],
    },
  });

  // LA footprint = CA + neighborhood populated or SoCal token
  const SOCAL_TOKENS = [
    "Los Angeles", "Santa Monica", "Venice", "Pasadena", "Long Beach",
    "Culver City", "West Hollywood", "Beverly Hills", "Burbank", "Glendale",
    "Manhattan Beach", "Hermosa Beach", "Redondo Beach", "Torrance", "Inglewood",
    "Marina del Rey", "El Segundo", "Malibu", "Echo Park", "Silver Lake",
    "DTLA", "Koreatown", "Hollywood", "San Fernando Valley", "Studio City",
    "Sherman Oaks", "Los Feliz",
  ];

  const laCount = await db.entities.count({
    where: {
      AND: [
        {
          OR: [
            { address: { contains: ", CA", mode: "insensitive" } },
            { address: { contains: " CA ", mode: "insensitive" } },
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
      ],
    },
  });

  // Non-US = address does not contain ", CA" or common US state patterns
  // Simple proxy: no ", CA" and no address or address looks international
  const noAddressCount = await db.entities.count({
    where: { OR: [{ address: null }, { address: "" }] },
  });
  const hasAddress = total - noAddressCount;
  const nonCaliforniaWithAddress = await db.entities.count({
    where: {
      AND: [
        { address: { not: null } },
        { NOT: { address: "" } },
        { NOT: { address: { contains: ", CA", mode: "insensitive" } } },
        { NOT: { address: { contains: " CA ", mode: "insensitive" } } },
      ],
    },
  });

  row("California entities (address)", californiaCount, total);
  row("  of which SoCal / LA footprint", laCount, total);
  row("Non-CA with address", nonCaliforniaWithAddress, total);
  row("No address at all", noAddressCount, total);

  // ── 3. ENRICHMENT STAGE ───────────────────────────────────────────────────
  section("3. ENRICHMENT STAGE");

  const stageCounts = await db.entities.groupBy({
    by: ["enrichment_stage"],
    _count: { _all: true },
    orderBy: { _count: { _all: "desc" } },
  });

  // Ensure all known stages are shown even if count is zero
  const stageMap = new Map(stageCounts.map((s) => [s.enrichment_stage ?? "NULL", s._count._all]));
  const ALL_STAGES: Array<EnrichmentStage | null> = [
    null,
    EnrichmentStage.NOT_STARTED,
    EnrichmentStage.GOOGLE_COVERAGE_COMPLETE,
    EnrichmentStage.MERCHANT_ENRICHED,
    EnrichmentStage.FAILED,
  ];
  for (const stage of ALL_STAGES) {
    const label = stage ?? "(null / unset)";
    const count = stageMap.get(stage ?? "NULL") ?? 0;
    row(label, count, total);
  }

  // ── 4. MISSING CRITICAL DATA ──────────────────────────────────────────────
  section("4. MISSING CRITICAL DATA");

  const missingWebsite = await db.entities.count({
    where: { OR: [{ website: null }, { website: "" }] },
  });
  const missingCoords = await db.entities.count({
    where: { OR: [{ latitude: null }, { longitude: null }] },
  });
  const missingCategory = await db.entities.count({
    where: { OR: [{ category: null }, { category: "" }] },
  });
  const missingNeighborhood = await db.entities.count({
    where: { OR: [{ neighborhood: null }, { neighborhood: "" }] },
  });
  const missingGpid = await db.entities.count({
    where: { OR: [{ googlePlaceId: null }, { googlePlaceId: "" }] },
  });

  row("Missing website", missingWebsite, total);
  row("Missing coordinates", missingCoords, total);
  row("Missing category", missingCategory, total);
  row("Missing neighborhood", missingNeighborhood, total);
  row("Missing Google Place ID", missingGpid, total);

  // ── 5. POTENTIAL DUPLICATES ───────────────────────────────────────────────
  section("5. POTENTIAL DUPLICATES (same name)");

  // Raw SQL: group by normalized name, find dupes
  type DupeRow = { normalized_name: string; count: bigint };
  const dupes = await db.$queryRaw<DupeRow[]>`
    SELECT
      LOWER(TRIM(name)) AS normalized_name,
      COUNT(*)::bigint   AS count
    FROM public.entities
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 25
  `;

  if (dupes.length === 0) {
    console.log("  No duplicate names found.");
  } else {
    console.log(`  ${dupes.length} name(s) appear more than once:\n`);
    for (const d of dupes) {
      console.log(`  "${d.normalized_name}" — ${d.count}`);
    }
  }

  console.log("\n" + "═".repeat(50));
  console.log("  END OF REPORT");
  console.log("═".repeat(50) + "\n");
}

main()
  .catch((e) => {
    console.error("Report failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
