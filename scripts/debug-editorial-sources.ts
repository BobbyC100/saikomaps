#!/usr/bin/env node
/**
 * Debug editorial_sources field structure
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 DEBUGGING EDITORIAL_SOURCES FIELD\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get a sample of places
  const places = await prisma.places.findMany({
    where: {
      status: 'OPEN',
      latitude: { not: null },
      longitude: { not: null },
      latitude: { not: 0 },
      longitude: { not: 0 },
    },
    select: {
      name: true,
      editorial_sources: true,
    },
    take: 20,
  });

  console.log('Sample of 20 places with their editorial_sources:\n');
  
  let nullCount = 0;
  let emptyArrayCount = 0;
  let populatedCount = 0;

  for (const place of places) {
    console.log(`${place.name}:`);
    
    if (place.editorial_sources === null) {
      console.log('  Type: null');
      nullCount++;
    } else if (Array.isArray(place.editorial_sources)) {
      if (place.editorial_sources.length === 0) {
        console.log('  Type: empty array []');
        emptyArrayCount++;
      } else {
        console.log(`  Type: array with ${place.editorial_sources.length} items`);
        console.log(`  Content: ${JSON.stringify(place.editorial_sources, null, 2).slice(0, 200)}...`);
        populatedCount++;
      }
    } else {
      console.log(`  Type: ${typeof place.editorial_sources}`);
      console.log(`  Content: ${JSON.stringify(place.editorial_sources, null, 2).slice(0, 200)}...`);
      populatedCount++;
    }
    console.log('');
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('SUMMARY OF SAMPLE');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`  Null: ${nullCount}`);
  console.log(`  Empty array: ${emptyArrayCount}`);
  console.log(`  Populated: ${populatedCount}`);
  
  // Now get full counts
  const total = await prisma.places.count({
    where: {
      status: 'OPEN',
      latitude: { not: null },
      longitude: { not: null },
      latitude: { not: 0 },
      longitude: { not: 0 },
    },
  });

  console.log(`\n\nTotal launch-ready places: ${total}`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
