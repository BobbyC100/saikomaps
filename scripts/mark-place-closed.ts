#!/usr/bin/env node
/**
 * Mark Place as Closed
 * 
 * Usage:
 *   npm run place:close -- <slug> [reason]
 *   npm run place:close -- guisados-restaurant "Permanently closed"
 */

import { PrismaClient, EntityStatus } from '@prisma/client';

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
      // Note: You might want to add a closed_at field and closed_reason field to schema
    },
  });
  
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
