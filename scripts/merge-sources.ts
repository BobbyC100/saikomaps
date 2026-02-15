/**
 * Merge duplicate sources into canonical names
 * 
 * Usage:
 *   npx tsx scripts/merge-sources.ts --dry-run  # Preview changes
 *   npx tsx scripts/merge-sources.ts            # Execute merge
 */

import { db } from "@/lib/db";

type MergePair = { from: string; to: string };

const MERGES: MergePair[] = [
  { from: "LA Times", to: "Los Angeles Times" },
  { from: "MICHELIN Guide", to: "Michelin Guide" },
];

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function ensureCanonicalSource(name: string) {
  const existing = await db.sources.findFirst({ where: { name } });
  if (existing) return existing;

  // Create canonical if missing (safe default)
  return db.sources.create({
    data: {
      name,
      type: "PUBLICATION",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });
}

async function main() {
  const dryRun = hasFlag("--dry-run");

  console.log(`\nmerge-sources.ts`);
  console.log(`dryRun=${dryRun}\n`);

  const results: any[] = [];

  for (const { from, to } of MERGES) {
    const canonical = await ensureCanonicalSource(to);
    const dup = await db.sources.findFirst({ where: { name: from } });

    if (!dup) {
      console.log(`⊘ No duplicate source found: "${from}" (ok)`);
      results.push({ from, to, status: "SKIP_NO_DUP" });
      continue;
    }

    if (dup.id === canonical.id) {
      console.log(`⊘ "${from}" already canonicalized into "${to}" (same id)`);
      results.push({ from, to, status: "SKIP_SAME_ID" });
      continue;
    }

    const coverageCount = await db.place_coverages.count({
      where: { sourceId: dup.id },
    });

    console.log(`\n→ Merge "${from}" → "${to}"`);
    console.log(`   dupId=${dup.id}`);
    console.log(`   canonicalId=${canonical.id}`);
    console.log(`   coverages_to_move=${coverageCount}`);

    if (dryRun) {
      results.push({ from, to, status: "DRY_RUN", coverageCount });
      continue;
    }

    await db.$transaction(async (tx) => {
      // Move coverages
      await tx.place_coverages.updateMany({
        where: { sourceId: dup.id },
        data: { sourceId: canonical.id },
      });

      // Delete duplicate source row
      await tx.sources.delete({ where: { id: dup.id } });
    });

    const afterCount = await db.place_coverages.count({
      where: { sourceId: canonical.id },
    });

    console.log(`   ✅ moved=${coverageCount} (canonical now has ${afterCount})`);
    results.push({ from, to, status: "MERGED", moved: coverageCount });
  }

  console.log(`\nDone.\n`);
  console.table(results);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
