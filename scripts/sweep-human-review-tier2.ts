/**
 * Human Review sweep: mark needs_human_review=true for LA places meeting any:
 * 1. Website missing (null/empty)
 * 2. Tier 2 enrichment failed (enrichment_stage = FAILED)
 * 3. Menu/wine/about scrape failed or partial:
 *    - scrape_status IN ('failed','blocked','timeout','partial','no_website')
 *    - OR about_copy AND menu_url AND winelist_url all null
 *
 * Idempotent. LA-only when --la-only.
 *
 * Usage:
 *   npm run tier2:human-review-sweep -- --la-only
 *   npm run tier2:human-review-sweep -- --la-only --dry-run --limit 50
 */

import { db } from '@/lib/db';
import { getPlaceIds } from '@/lib/la-scope';
import { EnrichmentStage } from '@prisma/client';

function parseArgs(): {
  laOnly: boolean;
  dryRun: boolean;
  limit: number | null;
  verbose: boolean;
} {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((a) => a.startsWith('--limit=')) ?? (argv.includes('--limit') ? argv[argv.indexOf('--limit') + 1] : null);
  const limit = limitArg ? parseInt(String(limitArg).replace(/^--limit=/, ''), 10) : null;
  return {
    laOnly: argv.includes('--la-only'),
    dryRun: argv.includes('--dry-run'),
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    verbose: argv.includes('--verbose'),
  };
}

async function main() {
  const { laOnly, dryRun, limit, verbose } = parseArgs();

  if (!laOnly) {
    console.error('This sweep requires --la-only. Exiting.');
    process.exit(1);
  }

  const entityIds = await getPlaceIds({
    laOnly: true,
    limit: limit ?? null,
  });
  if (!entityIds?.length) {
    console.error('--la-only: no entities in LA scope');
    process.exit(1);
  }

  const baseEntityFilter = { id: { in: entityIds } };

  // 1. Website missing
  const websiteMissing = await db.entities.findMany({
    where: {
      ...baseEntityFilter,
      status: 'OPEN',
      googlePlaceId: { not: null },
      NOT: { googlePlaceId: '' },
      OR: [{ website: null }, { website: '' }],
    },
    select: { id: true, name: true },
  });

  // 2. Tier 2 enrichment failed
  const tier2Failed = await db.entities.findMany({
    where: {
      ...baseEntityFilter,
      enrichment_stage: EnrichmentStage.FAILED,
    },
    select: { id: true, name: true },
  });

  // 3. Scrape failed/partial: golden_records with bad status or all-null about/menu/winelist
  const laEntities = await db.entities.findMany({
    where: baseEntityFilter,
    select: { id: true, name: true, googlePlaceId: true },
  });
  const laGpids = new Set(
    laEntities.map((e) => e.googlePlaceId).filter((x): x is string => !!x)
  );

  const scrapeBadRecords = await db.golden_records.findMany({
    where: {
      google_place_id: { in: Array.from(laGpids) },
      OR: [
        {
          scrape_status: {
            in: ['failed', 'blocked', 'timeout', 'partial', 'no_website'],
          },
        },
        {
          about_copy: null,
          menu_url: null,
          winelist_url: null,
        },
      ],
    },
    select: { google_place_id: true },
  });
  const scrapeBadGpids = new Set(
    scrapeBadRecords
      .map((r) => r.google_place_id)
      .filter((x): x is string => !!x)
  );

  const scrapeFailedEntities = scrapeBadGpids.size
    ? await db.entities.findMany({
        where: {
          ...baseEntityFilter,
          googlePlaceId: { in: Array.from(scrapeBadGpids) },
        },
        select: { id: true, name: true },
      })
    : [];

  const toMark = new Map<string, string>();
  for (const r of websiteMissing) toMark.set(r.id, 'website_missing');
  for (const r of tier2Failed) toMark.set(r.id, 'tier2_failed');
  for (const r of scrapeFailedEntities) toMark.set(r.id, toMark.has(r.id) ? toMark.get(r.id)! : 'scrape_failed_partial');

  if (verbose) {
    console.log('  website_missing:', websiteMissing.length);
    console.log('  tier2_failed:', tier2Failed.length);
    console.log('  scrape_failed_partial:', scrapeFailedEntities.length);
  }

  const beforeCount = await db.entities.count({
    where: { id: { in: entityIds }, needs_human_review: true },
  });

  let rowsMarked = 0;
  for (const [entityId, reason] of toMark) {
    if (dryRun) {
      const e = [websiteMissing, tier2Failed, scrapeFailedEntities]
        .flat()
        .find((x) => x.id === entityId);
      console.log(`  [DRY-RUN] would mark: ${e?.name ?? entityId} (${reason})`);
      rowsMarked++;
      continue;
    }
    await db.entities.update({
      where: { id: entityId },
      data: { needs_human_review: true },
    });
    rowsMarked++;
    const e = [websiteMissing, tier2Failed, scrapeFailedEntities]
      .flat()
      .find((x) => x.id === entityId);
    if (verbose) console.log(`  marked: ${e?.name ?? entityId} (${reason})`);
  }

  const afterCount = await db.entities.count({
    where: { id: { in: entityIds }, needs_human_review: true },
  });

  console.log('\n' + '='.repeat(50));
  console.log('HUMAN REVIEW SWEEP SUMMARY');
  console.log('='.repeat(50));
  console.log('  la_only: true');
  if (limit) console.log('  limit:', limit);
  console.log('  rows_marked_this_run:', rowsMarked);
  console.log('  needs_human_review before:', beforeCount);
  console.log('  needs_human_review after:', afterCount);
  console.log('  delta:', afterCount - beforeCount);
  console.log('='.repeat(50));
  if (dryRun) console.log('DRY RUN — no changes written.');
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
