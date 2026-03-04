/**
 * Tier 2 batch: crawl website, extract about/menu/winelist signals, write to existing tables.
 * Marks needs_human_review=true on meaningful failures. No retries beyond 1.
 *
 * Usage:
 *   npm run tier2:dry -- --la-only --limit 20
 *   npm run tier2:run -- --la-only
 *
 * Requires: GOOGLE_PLACES_API_KEY in .env.local (not used by crawl; for consistency).
 * Crawl limits: max 2 req/place, 1.5MB HTML, 5s timeout, 3 redirects, respect robots, same-domain only.
 */

import { db } from '@/lib/db';
import { getPlaceIds } from '@/lib/la-scope';
import {
  runEnrichmentForPlace,
  applyWriteRules,
} from '@/lib/website-enrichment';
import { EnrichmentStage } from '@prisma/client';

function parseArgs(): { limit: number; dryRun: boolean; laOnly: boolean } {
  const argv = process.argv.slice(2);
  let limit = Infinity;
  const eq = argv.find((a) => a.startsWith('--limit='));
  if (eq) {
    const n = parseInt(eq.split('=')[1] ?? '0', 10);
    if (n > 0) limit = n;
  } else {
    const idx = argv.indexOf('--limit');
    if (idx >= 0 && argv[idx + 1]) {
      const n = parseInt(argv[idx + 1], 10);
      if (n > 0) limit = n;
    }
  }
  const dryRun = argv.includes('--dry-run');
  const laOnly = argv.includes('--la-only');
  return { limit, dryRun, laOnly };
}

function isFailure(payload: { http_status: number | null; notes: string[] }): boolean {
  if (payload.http_status !== 200) return true;
  if (payload.notes.some((n) => n.includes('fetch failed') || n.includes('non-200')))
    return true;
  return false;
}

async function main() {
  const { limit, dryRun, laOnly } = parseArgs();

  const baseWhere = {
    status: 'OPEN' as const,
    googlePlaceId: { not: null },
    NOT: { googlePlaceId: '' },
    website: { not: null },
    NOT: { website: '' },
  };

  let entityIds: string[] | null = null;
  if (laOnly) {
    entityIds = await getPlaceIds({
      laOnly: true,
      limit: Number.isFinite(limit) ? limit : null,
    });
    if (!entityIds?.length) {
      console.error('--la-only: no entities in LA scope');
      process.exit(1);
    }
  }

  const where = {
    ...baseWhere,
    ...(entityIds?.length ? { id: { in: entityIds } } : {}),
  };

  const takeOption = !laOnly && limit > 0 && Number.isFinite(limit) ? { take: limit } : {};

  const places = await db.entities.findMany({
    where,
    select: { id: true, name: true, website: true },
    ...takeOption,
  });

  const candidates = places.filter((p) => (p.website?.trim()?.length ?? 0) > 0);

  // Audit: counts before
  const [merchantSignalsBefore, humanReviewBefore] = await Promise.all([
    db.merchant_signals.count(),
    db.entities.count({ where: { needs_human_review: true } }),
  ]);

  console.log(
    `Tier 2 enrichment: ${candidates.length} places (dryRun=${dryRun} laOnly=${laOnly})\n`
  );

  let processed = 0;
  let successCount = 0;
  let failureCount = 0;
  let markedHumanReview = 0;

  for (const place of candidates) {
    const website = place.website!.trim();
    processed++;

    try {
      const payload = await runEnrichmentForPlace({
        place_id: place.id,
        website,
      });

      const failed = isFailure(payload);

      if (failed) {
        failureCount++;
        if (!dryRun) {
          await db.entities.update({
            where: { id: place.id },
            data: {
              needs_human_review: true,
              last_enrichment_error: payload.notes.join('; ').slice(0, 2000),
              enrichment_stage: EnrichmentStage.FAILED,
            },
          });
          markedHumanReview++;
        }
        console.log(`  ❌ ${place.name} | ${payload.http_status} | ${payload.notes.join(', ')}`);
      } else {
        successCount++;
        if (!dryRun) {
          await applyWriteRules(payload);
        }
        console.log(
          `  ✅ ${place.name} | ${payload.http_status} | conf=${payload.confidence.toFixed(2)} | menu=${payload.signals.menu_url ? 'yes' : 'no'}`
        );
      }
    } catch (err) {
      failureCount++;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (!dryRun) {
        await db.entities.update({
          where: { id: place.id },
          data: {
            needs_human_review: true,
            last_enrichment_error: errMsg.slice(0, 2000),
            enrichment_stage: EnrichmentStage.FAILED,
          },
        });
        markedHumanReview++;
      }
      console.error(`  ❌ ${place.name} | ERROR: ${errMsg}`);
    }
  }

  // Audit: counts after
  const [merchantSignalsAfter, humanReviewAfter] = await Promise.all([
    db.merchant_signals.count(),
    db.entities.count({ where: { needs_human_review: true } }),
  ]);

  console.log('\n' + '='.repeat(50));
  console.log('TIER 2 RUN SUMMARY');
  console.log('='.repeat(50));
  console.log('  processed_count:', processed);
  console.log('  success_count:', successCount);
  console.log('  failure_count:', failureCount);
  console.log('  marked_human_review_count:', markedHumanReview);
  console.log('  merchant_signals before:', merchantSignalsBefore);
  console.log('  merchant_signals after:', merchantSignalsAfter);
  console.log('  merchant_signals delta:', merchantSignalsAfter - merchantSignalsBefore);
  console.log('  needs_human_review before:', humanReviewBefore);
  console.log('  needs_human_review after:', humanReviewAfter);
  console.log('  needs_human_review delta:', humanReviewAfter - humanReviewBefore);
  console.log('  (menu_signals / winelist_signals: N/A — not written by Tier 2)');
  console.log('='.repeat(50));
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
