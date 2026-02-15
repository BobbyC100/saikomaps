/**
 * Verify source normalization status
 * 
 * Usage:
 *   npx tsx scripts/verify-sources.ts
 */

import { db } from "@/lib/db";

async function main() {
  const names = ["Los Angeles Times", "LA Times", "Michelin Guide", "MICHELIN Guide"];

  const sources = await db.sources.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });

  console.log("\nSources:");
  console.table(sources);

  const coverages = await db.place_coverages.groupBy({
    by: ["sourceId"],
    _count: { _all: true },
    where: {
      source: { name: { in: names } },
    },
  });

  console.log("\nCoverages by sourceId:");
  console.table(coverages);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
