#!/usr/bin/env node
/**
 * Compute Trace signals for Fields-active entities.
 * Trace scope = entities with active FieldsMembership only.
 * v0.2 placeholder: continuity, turnover=0, duration=0, clustering=0.
 *
 * Usage: node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/compute-trace.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const start = Date.now();
  let entitiesProcessed = 0;
  let errorCount = 0;

  const memberships = await prisma.fieldsMembership.findMany({
    where: { removedAt: null },
    select: { entityId: true },
    distinct: ['entityId'],
  });

  const entityIds = memberships.map((m) => m.entityId);

  for (const entityId of entityIds) {
    try {
      const count = await prisma.entityActorRelationship.count({
        where: { entityId },
      });

      const signals = {
        continuity: count,
        turnover: 0,
        duration: 0,
        clustering: 0,
      };

      await prisma.traceSignalsCache.upsert({
        where: { entityId },
        create: {
          entityId,
          computedAt: new Date(),
          signals: signals as object,
        },
        update: {
          computedAt: new Date(),
          signals: signals as object,
        },
      });

      entitiesProcessed++;
    } catch (e) {
      errorCount++;
    }
  }

  const runtimeMs = Date.now() - start;
  console.log('entities processed:', entitiesProcessed);
  console.log('job runtime (ms):', runtimeMs);
  console.log('error count:', errorCount);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
