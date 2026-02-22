#!/usr/bin/env node
/**
 * Report Actor + Trace coverage for Saiko Fields.
 *
 * Usage: node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/report-fields-trace-coverage.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const activeEntityIds = await prisma.fieldsMembership
    .findMany({
      where: { removedAt: null },
      select: { entityId: true },
      distinct: ['entityId'],
    })
    .then((rows) => new Set(rows.map((r) => r.entityId)));

  const withActor = await prisma.entityActorRelationship
    .findMany({
      where: { entityId: { in: [...activeEntityIds] } },
      select: { entityId: true },
      distinct: ['entityId'],
    })
    .then((rows) => new Set(rows.map((r) => r.entityId)));

  const withTrace = await prisma.traceSignalsCache
    .findMany({
      where: { entityId: { in: [...activeEntityIds] } },
      select: { entityId: true, computedAt: true },
    })
    .then((rows) => {
      const byEntity = new Map<string, Date>();
      for (const r of rows) {
        byEntity.set(r.entityId, r.computedAt);
      }
      return byEntity;
    });

  const total = activeEntityIds.size;
  const withActorCount = [...activeEntityIds].filter((id) => withActor.has(id)).length;
  const withoutActorCount = total - withActorCount;
  const withTraceCount = [...activeEntityIds].filter((id) => withTrace.has(id)).length;
  const missingTraceCount = total - withTraceCount;

  const lastCompute =
    withTrace.size > 0
      ? [...withTrace.values()].reduce((a, b) => (a > b ? a : b))
      : null;

  console.log('Actor Coverage:');
  console.log('  Fields-active entities:', total);
  console.log('  with >=1 actor relationship:', withActorCount);
  console.log('  without actor relationship:', withoutActorCount);

  console.log('');
  console.log('Trace Coverage:');
  console.log('  Fields-active entities:', total);
  console.log('  with trace signals:', withTraceCount);
  console.log('  missing trace signals:', missingTraceCount);
  console.log('  last compute timestamp:', lastCompute ?? 'N/A');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
