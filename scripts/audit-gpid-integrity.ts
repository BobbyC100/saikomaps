#!/usr/bin/env node
/**
 * GPID Integrity Audit — pre-flight check before enrichment
 *
 * Checks:
 *   1. Null or empty google_place_id
 *   2. Duplicate google_place_id
 *   3. Non-ChIJ format anomalies
 *
 * Usage:
 *   npx tsx scripts/audit-gpid-integrity.ts
 *   ./scripts/db-use.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/audit-gpid-integrity.ts
 *
 * Exit: 0 if clean, 1 if duplicates exist
 */

import { db } from "@/config/db";

const prisma = db.admin;

async function main() {
  console.log("=== GPID Integrity Audit ===\n");

  // 1) Empty GPID
  const emptyCount = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT count(*)::bigint as count
    FROM public.entities
    WHERE google_place_id IS NULL OR btrim(google_place_id) = ''
  `.then((r) => Number(r[0]?.count ?? 0));

  // 2) Duplicates
  const duplicates = await prisma.$queryRaw<
    { google_place_id: string; count: bigint }[]
  >`
    SELECT google_place_id, count(*)::bigint as count
    FROM public.entities
    WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> ''
    GROUP BY google_place_id
    HAVING count(*) > 1
  `;

  // 3) Malformed (non-ChIJ)
  const malformed = await prisma.$queryRaw<
    { id: string; google_place_id: string }[]
  >`
    SELECT id, google_place_id
    FROM public.entities
    WHERE google_place_id IS NOT NULL
      AND btrim(google_place_id) <> ''
      AND google_place_id NOT LIKE 'ChIJ%'
  `;

  const totalWithGpid = await prisma.entities.count({
    where: {
      googlePlaceId: { not: null },
      NOT: { googlePlaceId: "" },
    },
  });

  console.log("Counts:");
  console.log(`  Entities with GPID:     ${totalWithGpid}`);
  console.log(`  Empty/null GPID:        ${emptyCount}`);
  console.log(`  Duplicate GPIDs:        ${duplicates.length}`);
  console.log(`  Malformed (non-ChIJ):   ${malformed.length}`);

  if (duplicates.length > 0) {
    console.log("\nDuplicate GPIDs:");
    for (const d of duplicates) {
      console.log(`  ${d.google_place_id}: ${d.count} entities`);
    }
  }

  if (malformed.length > 0) {
    console.log("\nMalformed GPIDs (first 10):");
    for (const m of malformed.slice(0, 10)) {
      console.log(`  ${m.id} | ${m.google_place_id}`);
    }
    if (malformed.length > 10) {
      console.log(`  ... and ${malformed.length - 10} more`);
    }
  }

  const hasDuplicates = duplicates.length > 0;
  if (hasDuplicates) {
    console.log("\n❌ FAIL: Duplicate GPIDs exist. Resolve before enrichment.");
    process.exit(1);
  }

  console.log("\n✅ GPID integrity: clean");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
