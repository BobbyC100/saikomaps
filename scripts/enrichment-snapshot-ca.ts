#!/usr/bin/env node
/**
 * CA enrichment snapshot — 10-second sanity check.
 * Usage: npm run entities:enrichment-snapshot
 */

import { db } from "../lib/db";

async function main() {
  type StageRow = { enrichment_stage: string | null; n: number };
  type CountRow = { n: number };

  const [total, caCount, stageRows, failedRow, catNullRow] = await Promise.all([
    db.entities.count(),
    db.entities.count({
      where: { address: { contains: ", CA", mode: "insensitive" } },
    }),
    db.$queryRaw<StageRow[]>`
      SELECT enrichment_stage, COUNT(*)::int AS n
      FROM public.entities
      WHERE address ILIKE '%, CA%'
      GROUP BY 1
      ORDER BY n DESC
    `,
    db.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS n
      FROM public.entities
      WHERE address ILIKE '%, CA%'
        AND enrichment_stage = 'FAILED'
    `,
    db.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS n
      FROM public.entities
      WHERE address ILIKE '%, CA%'
        AND (category IS NULL OR BTRIM(category) = '')
    `,
  ]);

  const failed = failedRow[0]?.n ?? 0;
  const catNull = catNullRow[0]?.n ?? 0;

  console.log("\nCA ENRICHMENT SNAPSHOT");
  console.log("─".repeat(38));
  console.log(`  Total entities:      ${total}`);
  console.log(`  CA entities:         ${caCount}`);
  console.log("  Stage breakdown (CA):");
  for (const row of stageRows) {
    console.log(`    ${(row.enrichment_stage ?? "(null)").padEnd(28)} ${row.n}`);
  }
  console.log(`  Failed (CA):         ${failed}`);
  console.log(`  Category null (CA):  ${catNull}`);
  console.log("─".repeat(38) + "\n");
}

main()
  .catch((e) => {
    console.error("Snapshot failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
