/**
 * Backfill Entity State Model v1 fields from legacy PlaceStatus.
 *
 * Maps the single PlaceStatus enum to three independent axes:
 *   operatingStatus, enrichmentStatus, publicationStatus
 *
 * Mapping:
 *   CANDIDATE          → enrichmentStatus: INGESTED,  publicationStatus: UNPUBLISHED, operatingStatus: NULL
 *   OPEN               → enrichmentStatus: ENRICHED,  operatingStatus: OPERATING,     publicationStatus: PUBLISHED
 *   CLOSED             → enrichmentStatus: ENRICHED,  operatingStatus: TEMPORARILY_CLOSED, publicationStatus: UNPUBLISHED
 *   PERMANENTLY_CLOSED → enrichmentStatus: ENRICHED,  operatingStatus: PERMANENTLY_CLOSED, publicationStatus: UNPUBLISHED
 *
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-entity-state-model.ts
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-entity-state-model.ts --apply
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-entity-state-model.ts --limit 100 --apply
 *
 * Dry-run by default. Pass --apply to write.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  let apply = false;
  let limit = Infinity;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') apply = true;
    else if (args[i] === '--limit') limit = parseInt(args[++i] || '0', 10) || Infinity;
  }

  return { apply, limit };
}

interface StatusCount {
  status: string;
  count: number;
}

async function main() {
  const { apply, limit } = parseArgs();

  console.log(`\n=== Entity State Model Backfill ===`);
  console.log(`Mode: ${apply ? '🔴 APPLY (writing to database)' : '🟡 DRY RUN (no writes)'}`);
  if (limit < Infinity) console.log(`Limit: ${limit} per status`);
  console.log('');

  // Count entities by current PlaceStatus
  const statusCounts = await prisma.$queryRaw<StatusCount[]>`
    SELECT status::text, COUNT(*)::int AS count
    FROM entities
    GROUP BY status
    ORDER BY count DESC
  `;

  console.log('Current PlaceStatus distribution:');
  for (const { status, count } of statusCounts) {
    console.log(`  ${status}: ${count}`);
  }
  console.log('');

  // Check how many already have new fields populated
  const alreadyBackfilled = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM entities
    WHERE operating_status IS NOT NULL
       OR enrichment_status IS NOT NULL
       OR publication_status IS NOT NULL
  `;
  const backfilledCount = alreadyBackfilled[0]?.count ?? 0;

  if (backfilledCount > 0) {
    console.log(`⚠️  ${backfilledCount} entities already have new fields populated.`);
    console.log('   This script only updates entities where ALL three new fields are NULL.');
    console.log('');
  }

  // Mapping definitions
  const mappings = [
    {
      oldStatus: 'CANDIDATE',
      operatingStatus: null,  // unknown until enrichment resolves it
      enrichmentStatus: 'INGESTED',
      publicationStatus: 'UNPUBLISHED',
    },
    {
      oldStatus: 'OPEN',
      operatingStatus: 'OPERATING',
      enrichmentStatus: 'ENRICHED',
      publicationStatus: 'PUBLISHED',
    },
    {
      oldStatus: 'CLOSED',
      operatingStatus: 'TEMPORARILY_CLOSED',
      enrichmentStatus: 'ENRICHED',
      publicationStatus: 'UNPUBLISHED',
    },
    {
      oldStatus: 'PERMANENTLY_CLOSED',
      operatingStatus: 'PERMANENTLY_CLOSED',
      enrichmentStatus: 'ENRICHED',
      publicationStatus: 'UNPUBLISHED',
    },
  ];

  console.log('Backfill mapping:');
  for (const m of mappings) {
    const count = statusCounts.find((s) => s.status === m.oldStatus)?.count ?? 0;
    console.log(`  ${m.oldStatus} (${count} entities):`);
    console.log(`    → operatingStatus:   ${m.operatingStatus ?? 'NULL'}`);
    console.log(`    → enrichmentStatus:  ${m.enrichmentStatus}`);
    console.log(`    → publicationStatus: ${m.publicationStatus}`);
  }
  console.log('');

  if (!apply) {
    console.log('Dry run complete. Pass --apply to write changes.');
    await prisma.$disconnect();
    return;
  }

  // Apply backfill
  let totalUpdated = 0;

  for (const m of mappings) {
    const limitClause = limit < Infinity ? `LIMIT ${limit}` : '';

    // Build SET clause — operatingStatus may be NULL for CANDIDATE
    const opStatusSet = m.operatingStatus
      ? `operating_status = '${m.operatingStatus}'::"OperatingStatus",`
      : '';

    const result = await prisma.$executeRawUnsafe(`
      UPDATE entities
      SET
        ${opStatusSet}
        enrichment_status = '${m.enrichmentStatus}'::"EnrichmentStatus",
        publication_status = '${m.publicationStatus}'::"PublicationStatus"
      WHERE status = '${m.oldStatus}'::"PlaceStatus"
        AND operating_status IS NULL
        AND enrichment_status IS NULL
        AND publication_status IS NULL
      ${limitClause}
    `);

    console.log(`  ${m.oldStatus}: ${result} entities updated`);
    totalUpdated += result;
  }

  console.log(`\nTotal updated: ${totalUpdated}`);

  // Verify
  const verification = await prisma.$queryRaw<{ status: string; op: string | null; enrich: string | null; pub: string | null; count: number }[]>`
    SELECT
      status::text,
      operating_status::text AS op,
      enrichment_status::text AS enrich,
      publication_status::text AS pub,
      COUNT(*)::int AS count
    FROM entities
    GROUP BY status, operating_status, enrichment_status, publication_status
    ORDER BY status, count DESC
  `;

  console.log('\nPost-backfill verification (status → new fields):');
  for (const row of verification) {
    console.log(`  ${row.status} → op:${row.op ?? 'NULL'} enrich:${row.enrich ?? 'NULL'} pub:${row.pub ?? 'NULL'} (${row.count})`);
  }

  // Check for any unmapped entities
  const unmapped = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM entities
    WHERE enrichment_status IS NULL
  `;
  const unmappedCount = unmapped[0]?.count ?? 0;

  if (unmappedCount > 0) {
    console.log(`\n⚠️  ${unmappedCount} entities still have NULL enrichment_status.`);
  } else {
    console.log('\n✓ All entities have enrichment_status populated.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Backfill failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
