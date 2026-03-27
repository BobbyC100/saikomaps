#!/usr/bin/env node
/**
 * Validate Entity State Model coverage for recent writes.
 *
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/validate-entity-state-model.ts
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/validate-entity-state-model.ts --days 7
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const daysIndex = args.indexOf('--days');
  const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : 7;
  return { days: Number.isFinite(days) && days > 0 ? days : 7 };
}

async function main() {
  const { days } = parseArgs();

  const [recent, missingAnyAxis, missingEnrichment] = await Promise.all([
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM entities
      WHERE created_at >= NOW() - (${days}::text || ' days')::interval
    `,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM entities
      WHERE created_at >= NOW() - (${days}::text || ' days')::interval
        AND (
          operating_status IS NULL
          OR enrichment_status IS NULL
          OR publication_status IS NULL
        )
    `,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM entities
      WHERE created_at >= NOW() - (${days}::text || ' days')::interval
        AND enrichment_status IS NULL
    `,
  ]);

  const recentCount = recent[0]?.count ?? 0;
  const missingAxisCount = missingAnyAxis[0]?.count ?? 0;
  const missingEnrichmentCount = missingEnrichment[0]?.count ?? 0;

  console.log('\n=== Entity State Model Validation ===');
  console.log(`Window: last ${days} day(s)`);
  console.log(`Recent entities: ${recentCount}`);
  console.log(`Missing any axis: ${missingAxisCount}`);
  console.log(`Missing enrichment_status: ${missingEnrichmentCount}`);

  if (missingEnrichmentCount > 0) {
    console.error('\nValidation failed: some recent entities still have NULL enrichment_status.');
    process.exitCode = 1;
  } else {
    console.log('\nValidation passed: no recent entities have NULL enrichment_status.');
  }
}

main()
  .catch((err) => {
    console.error('Validation failed with error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
