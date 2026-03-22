/**
 * Backfill coverage_sources from entities.editorialSources JSON.
 *
 * Parses the legacy {"sources": ["url1", "url2"]} JSON field and creates
 * coverage_sources rows for each URL that matches an approved editorial source.
 *
 * Non-approved URLs (venue websites, Yelp, Reddit, etc.) are skipped.
 * Uses the approved source registry from lib/source-registry.ts.
 *
 * Idempotent: uses upsert on (entityId, url) compound unique.
 * Non-destructive: only inserts, never deletes existing rows.
 *
 * Run:
 *   npx tsx scripts/backfill-coverage-from-editorial-sources.ts --dry-run
 *   npx tsx scripts/backfill-coverage-from-editorial-sources.ts
 *   npx tsx scripts/backfill-coverage-from-editorial-sources.ts --include-non-approved
 */

import { db } from '../lib/db';
import {
  isApprovedEditorialUrl,
  findApprovedSource,
  derivePublicationName,
} from '../lib/source-registry';

/**
 * Extract URLs from the editorialSources JSON field.
 * Handles known shapes:
 *   {"sources": ["url1", "url2"]}
 *   ["url1", "url2"]
 *   [{"url": "..."}, {"link": "..."}]
 */
function extractUrls(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];

  // Shape: {"sources": ["url1", "url2"]}
  if (!Array.isArray(data) && 'sources' in (data as Record<string, unknown>)) {
    const sources = (data as Record<string, unknown>).sources;
    if (Array.isArray(sources)) {
      return sources.filter((s): s is string => typeof s === 'string' && s.startsWith('http'));
    }
  }

  // Shape: flat array of strings or objects
  if (Array.isArray(data)) {
    const urls: string[] = [];
    for (const item of data) {
      if (typeof item === 'string' && item.startsWith('http')) {
        urls.push(item);
      } else if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        const u = obj.url || obj.link;
        if (typeof u === 'string' && u.startsWith('http')) {
          urls.push(u);
        }
      }
    }
    return urls;
  }

  return [];
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const includeNonApproved = process.argv.includes('--include-non-approved');

  console.log(isDryRun
    ? '🔍 DRY RUN — no rows will be written'
    : '🚀 Backfilling coverage_sources from editorialSources JSON...');
  console.log(includeNonApproved
    ? '  Mode: ALL URLs (including non-approved sources)\n'
    : '  Mode: APPROVED SOURCES ONLY (use --include-non-approved for all)\n');

  // Fetch all active entities that have editorialSources data
  const entities = await db.entities.findMany({
    where: {
      status: { in: ['OPEN', 'CANDIDATE'] },
      editorialSources: { not: { equals: null as any } },
    },
    select: {
      id: true,
      slug: true,
      editorialSources: true,
    },
  });

  console.log(`Found ${entities.length} entities with editorialSources data.\n`);

  let totalUrls = 0;
  let approved = 0;
  let filtered = 0;
  let upserted = 0;
  let errors = 0;
  const sourceNameCounts = new Map<string, number>();

  for (const entity of entities) {
    const urls = extractUrls(entity.editorialSources);
    if (urls.length === 0) continue;

    totalUrls += urls.length;

    for (const url of urls) {
      // Filter to approved sources unless --include-non-approved
      if (!includeNonApproved && !isApprovedEditorialUrl(url)) {
        filtered++;
        continue;
      }
      approved++;

      const approvedSource = findApprovedSource(url);
      const publicationName = approvedSource?.displayName ?? derivePublicationName(url);
      sourceNameCounts.set(publicationName, (sourceNameCounts.get(publicationName) ?? 0) + 1);

      if (isDryRun) {
        const tag = approvedSource ? '✓' : '○';
        console.log(`  [dry ${tag}] ${entity.slug} — ${publicationName} — ${url}`);
        upserted++;
        continue;
      }

      try {
        await db.coverage_sources.upsert({
          where: { entityId_url: { entityId: entity.id, url } },
          create: {
            entityId: entity.id,
            publicationName,
            url,
            enrichmentStage: 'INGESTED',
          },
          update: {
            publicationName, // refresh name if registry improved
          },
        });
        console.log(`  ✓ ${entity.slug} — ${publicationName}`);
        upserted++;
      } catch (err) {
        console.error(`  ✗ ${entity.slug} — ${url}: ${err}`);
        errors++;
      }
    }
  }

  // Summary
  console.log('\n════════════════════════════════════════');
  console.log(isDryRun ? '  DRY RUN SUMMARY' : '  BACKFILL SUMMARY');
  console.log('════════════════════════════════════════');
  console.log(`  Entities processed:     ${entities.length}`);
  console.log(`  URLs found:             ${totalUrls}`);
  console.log(`  Approved (included):    ${approved}`);
  console.log(`  Filtered (non-approved):${filtered > 0 ? ' ' : ''}${filtered}`);
  console.log(`  Rows upserted:          ${upserted}`);
  console.log(`  Errors:                 ${errors}`);

  console.log('\n  Source name distribution:');
  const sorted = Array.from(sourceNameCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    console.log(`    ${name.padEnd(28)} ${count}`);
  }

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
