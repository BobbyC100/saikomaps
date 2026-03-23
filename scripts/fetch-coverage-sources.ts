/**
 * Fetch + Archive Coverage Sources
 *
 * Processes all coverage_sources in INGESTED stage:
 * 1. HTTP fetch the URL
 * 2. Extract article text, title, author, published date
 * 3. Archive content and update the source record
 * 4. Advance enrichment_stage to FETCHED (or FAILED)
 *
 * Idempotent: re-running on already-fetched sources is safe (skipped).
 * Rate-limited: 1.5s delay between requests to be polite.
 *
 * Run:
 *   npx tsx scripts/fetch-coverage-sources.ts
 *   npx tsx scripts/fetch-coverage-sources.ts --dry-run
 *   npx tsx scripts/fetch-coverage-sources.ts --limit=10
 *   npx tsx scripts/fetch-coverage-sources.ts --refetch   # re-fetch FAILED sources too
 */

import { db } from '../lib/db';
import { fetchCoverageSource } from '../lib/coverage/fetch-source';

const DEFAULT_LIMIT = 50;
const REQUEST_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const refetch = process.argv.includes('--refetch');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : DEFAULT_LIMIT;

  const stages = refetch ? ['INGESTED', 'FAILED'] : ['INGESTED'];

  console.log(isDryRun ? '🔍 DRY RUN — no DB writes\n' : '🚀 Fetching coverage sources...\n');
  console.log(`  Stages: ${stages.join(', ')}`);
  console.log(`  Limit:  ${limit}\n`);

  const sources = await db.coverage_sources.findMany({
    where: { enrichmentStage: { in: stages } },
    select: {
      id: true,
      url: true,
      publicationName: true,
      entityId: true,
      entity: { select: { slug: true } },
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${sources.length} sources to fetch.\n`);

  let fetched = 0;
  let failed = 0;
  let skipped = 0;
  const publicationStats = new Map<string, { ok: number; fail: number }>();

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const slug = src.entity?.slug ?? '???';
    const progress = `[${i + 1}/${sources.length}]`;

    if (isDryRun) {
      console.log(`  ${progress} [dry] ${slug} — ${src.publicationName} — ${src.url}`);
      skipped++;
      continue;
    }

    console.log(`  ${progress} Fetching: ${slug} — ${src.publicationName}`);

    try {
      const result = await fetchCoverageSource(src.url);

      // Update the source record
      await db.coverage_sources.update({
        where: { id: src.id },
        data: {
          httpStatus: result.httpStatus,
          isAlive: result.isAlive,
          lastCheckedAt: new Date(),
          fetchedAt: result.isAlive ? new Date() : undefined,
          articleTitle: result.articleTitle,
          author: result.author,
          publishedAt: result.publishedAt ?? undefined,
          fetchedContent: result.fetchedContent,
          contentHash: result.contentHash,
          wordCount: result.wordCount,
          enrichmentStage: result.isAlive && result.fetchedContent ? 'FETCHED' : 'FAILED',
        },
      });

      if (result.isAlive && result.fetchedContent) {
        const words = result.wordCount ?? 0;
        const title = result.articleTitle?.slice(0, 60) ?? '(no title)';
        console.log(`    ✓ ${title} — ${words} words${result.author ? ` — by ${result.author}` : ''}`);
        fetched++;
      } else {
        console.log(`    ✗ HTTP ${result.httpStatus} — ${result.error ?? 'no content'}`);
        failed++;
      }

      // Track per-publication stats
      const stat = publicationStats.get(src.publicationName) ?? { ok: 0, fail: 0 };
      if (result.isAlive && result.fetchedContent) stat.ok++;
      else stat.fail++;
      publicationStats.set(src.publicationName, stat);

    } catch (err) {
      console.error(`    ✗ Error: ${(err as Error).message}`);
      failed++;

      // Still mark as FAILED so we don't retry indefinitely
      await db.coverage_sources.update({
        where: { id: src.id },
        data: {
          enrichmentStage: 'FAILED',
          lastCheckedAt: new Date(),
          isAlive: false,
        },
      }).catch(() => {}); // best effort
    }

    // Rate limit between requests
    if (i < sources.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // Summary
  console.log('\n════════════════════════════════════════');
  console.log(isDryRun ? '  DRY RUN SUMMARY' : '  FETCH SUMMARY');
  console.log('════════════════════════════════════════');
  console.log(`  Total processed:  ${sources.length}`);
  console.log(`  Fetched (OK):     ${fetched}`);
  console.log(`  Failed:           ${failed}`);
  if (isDryRun) console.log(`  Skipped (dry):    ${skipped}`);

  if (publicationStats.size > 0) {
    console.log('\n  Per-publication:');
    const sorted = Array.from(publicationStats.entries()).sort((a, b) =>
      (b[1].ok + b[1].fail) - (a[1].ok + a[1].fail)
    );
    for (const [name, stat] of sorted) {
      console.log(`    ${name.padEnd(28)} ✓ ${stat.ok}  ✗ ${stat.fail}`);
    }
  }

  // Show remaining queue size
  const remaining = await db.coverage_sources.count({
    where: { enrichmentStage: 'INGESTED' },
  });
  console.log(`\n  Still INGESTED:   ${remaining}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
