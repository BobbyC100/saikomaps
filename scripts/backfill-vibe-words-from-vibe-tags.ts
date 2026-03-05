/**
 * Backfill: copy golden_records.vibe_tags → identity_signals.vibe_words
 *
 * Run once after deploying the vibeTags rip-and-replace.
 * Safe to re-run (skips records that already have vibe_words populated).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-vibe-words-from-vibe-tags.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[backfill-vibe-words] Starting…');

  // Fetch golden records that have vibe_tags but whose identity_signals lacks vibe_words
  const records = await prisma.golden_records.findMany({
    where: {
      vibe_tags: { isEmpty: false },
    },
    select: {
      id: true,
      vibe_tags: true,
      identity_signals: true,
    },
  });

  console.log(`[backfill-vibe-words] Found ${records.length} records with vibe_tags`);

  let skipped = 0;
  let updated = 0;
  let failed = 0;

  for (const record of records) {
    const existing = record.identity_signals as Record<string, unknown> | null;
    const existingVibeWords = existing?.vibe_words as string[] | undefined;

    if (existingVibeWords && existingVibeWords.length > 0) {
      skipped++;
      continue;
    }

    // Normalize: lowercase + dedupe
    const rawTags = record.vibe_tags as string[];
    const vibeWords = [...new Set(rawTags.map((t) => t.toLowerCase().trim()).filter(Boolean))];

    if (vibeWords.length === 0) {
      skipped++;
      continue;
    }

    const merged: Record<string, unknown> = { ...(existing ?? {}), vibe_words: vibeWords };

    try {
      await prisma.golden_records.update({
        where: { id: record.id },
        data: { identity_signals: merged },
      });
      updated++;
    } catch (err) {
      console.error(`[backfill-vibe-words] Failed to update record ${record.id}:`, err);
      failed++;
    }
  }

  console.log(`[backfill-vibe-words] Done. updated=${updated} skipped=${skipped} failed=${failed}`);
}

main()
  .catch((err) => {
    console.error('[backfill-vibe-words] Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
