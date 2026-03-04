#!/usr/bin/env node
/**
 * Mark Place as Closed
 *
 * Updates entities table (legacy). For golden_records, use admin close API.
 *
 * Usage:
 *   npm run place:close -- <slug> [reason]
 *   npm run place:close -- guisados-restaurant "Permanently closed"
 */

import { PrismaClient, EntityStatus, TraceSource, TraceEventType } from '@prisma/client';
import { writeTrace } from '@/lib/traces';

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  const reason = process.argv[3] || 'Closed';
  
  if (!slug) {
    console.error('Usage: npm run place:close -- <slug> [reason]');
    console.error('Example: npm run place:close -- guisados-restaurant "Permanently closed"');
    process.exit(1);
  }
  
  // Find the place
  const place = await prisma.entities.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
    },
  });
  
  if (!place) {
    console.error(`❌ Place not found: ${slug}`);
    process.exit(1);
  }
  
  if (place.status === EntityStatus.CLOSED) {
    console.log(`⚠️  ${place.name} is already marked as CLOSED`);
    return;
  }
  
  // Mark as closed
  await prisma.entities.update({
    where: { slug },
    data: {
      status: EntityStatus.CLOSED,
    },
  });

  // TRACES: HUMAN_OVERRIDE — manual status change (entity_id = canonical_id when synced from golden)
  try {
    await writeTrace({
      entityId: place.id,
      source: TraceSource.admin,
      eventType: TraceEventType.HUMAN_OVERRIDE,
      fieldName: 'status',
      oldValue: place.status,
      newValue: { status: EntityStatus.CLOSED, reason: reason ?? 'script' },
    });
  } catch (e) {
    // FK may fail if entity is legacy (not in golden_records); non-fatal
    console.warn('Trace write skipped (entity may not be in golden_records):', (e as Error).message);
  }

  console.log(`\n✅ Marked as CLOSED: ${place.name}`);
  console.log(`   Slug: ${slug}`);
  console.log(`   Reason: ${reason}`);
  console.log(`\n💡 To show on site, update queries to filter: status: 'OPEN'`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
