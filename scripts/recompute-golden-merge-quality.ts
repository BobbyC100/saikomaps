#!/usr/bin/env node
/**
 * Batch recompute: match_confidence, merge_quality, field_confidences, winner_sources, field_conflicts.
 * Run nightly (cron) and/or on-ingest (after resolve / after linking).
 *
 * Usage (Neon): ./scripts/db-neon.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/recompute-golden-merge-quality.ts
 *   npm run recompute:golden-merge -- --dry-run
 *   npm run recompute:golden-merge -- --limit 100
 *   npm run recompute:golden-merge -- --canonical-id <id>
 */

import { db } from '@/lib/db';
import { assertDbTargetAllowed } from '@/lib/db-guard';

const CRITICAL_FIELDS = [
  'name',
  'address_street',
  'lat',
  'lng',
  'phone',
  'website',
  'hours',
  'category',
  'cuisines',
  'instagram_handle',
  'neighborhood',
  'description',
] as const;

function parseArgs(): { dryRun: boolean; limit: number | null; canonicalId: string | null } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;
  const idIdx = args.indexOf('--canonical-id');
  const canonicalId = idIdx >= 0 && args[idIdx + 1] ? args[idIdx + 1] : null;
  return { dryRun, limit, canonicalId };
}

async function main() {
  assertDbTargetAllowed();
  const { dryRun, limit, canonicalId } = parseArgs();

  const where = canonicalId ? { canonical_id: canonicalId, lifecycle_status: 'ACTIVE' as const } : { lifecycle_status: 'ACTIVE' as const };
  const goldens = await db.golden_records.findMany({
    where,
    select: {
      canonical_id: true,
      confidence: true,
      source_attribution: true,
      provenance_v2: true,
      resolution_links: { select: { confidence: true } },
    },
    take: limit ?? undefined,
    orderBy: { updated_at: 'desc' },
  });

  console.log(`Recompute golden merge quality (dryRun=${dryRun}, count=${goldens.length})\n`);

  let updated = 0;
  for (const g of goldens) {
    const linkConfidences = g.resolution_links?.map((r) => r.confidence).filter((c): c is number => c != null) ?? [];
    const match_confidence =
      linkConfidences.length > 0 ? Math.max(...linkConfidences) : g.confidence ?? null;

    const attribution = g.source_attribution as Record<string, string> | null | undefined;
    const provenance = g.provenance_v2 as Record<string, { source?: string; confidence?: number; conflict?: boolean }> | null | undefined;

    const field_confidences: Record<string, number> = {};
    const winner_sources: Record<string, string> = {};
    const field_conflicts: string[] = [];

    for (const field of CRITICAL_FIELDS) {
      const provEntry = provenance?.[field];
      const src = attribution?.[field] ?? provEntry?.source ?? null;
      const conf = typeof provEntry?.confidence === 'number' ? provEntry.confidence : null;
      if (src) winner_sources[field] = src;
      if (conf != null) field_confidences[field] = conf;
      if (provEntry?.conflict) field_conflicts.push(field);
    }

    const confValues = Object.values(field_confidences);
    const merge_quality =
      confValues.length > 0 ? confValues.reduce((a, b) => a + b, 0) / confValues.length : null;

    if (!dryRun) {
      await db.golden_records.update({
        where: { canonical_id: g.canonical_id },
        data: {
          match_confidence,
          merge_quality,
          field_confidences: Object.keys(field_confidences).length ? field_confidences : null,
          winner_sources: Object.keys(winner_sources).length ? winner_sources : null,
          field_conflicts: field_conflicts.length ? field_conflicts : null,
        },
      });
      updated++;
    }

    if (updated > 0 && updated % 500 === 0) {
      console.log(`  Progress: ${updated}/${goldens.length}`);
    }
  }

  console.log(`\nDone. Updated ${dryRun ? 0 : updated} golden_records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
