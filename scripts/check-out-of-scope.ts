#!/usr/bin/env node
/**
 * Check for out-of-scope places (not in LA County)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Known non-LA County neighborhoods
  const outOfScopeNeighborhoods = [
    'West Berkeley',
    'Kailua',
    'Honolulu',
    'Waikiki',
    'Denver',
    'Ojai', // Ventura County
  ];

  console.log('\n🔍 Checking for out-of-scope places (not LA County)...\n');
  
  const places = await prisma.entities.findMany({
    where: {
      OR: [
        {
          neighborhood: {
            in: outOfScopeNeighborhoods,
          },
        },
        {
          address: {
            contains: 'Denver',
          },
        },
        {
          address: {
            contains: 'Berkeley',
          },
        },
        {
          address: {
            contains: 'Hawaii',
          },
        },
        {
          address: {
            contains: ', HI ',
          },
        },
        {
          address: {
            contains: ', CO ',
          },
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      neighborhood: true,
      status: true,
      website: true,
    },
    orderBy: {
      neighborhood: 'asc',
    },
  });

  console.log(`Found ${places.length} out-of-scope places\n`);
  console.log('════════════════════════════════════════════════════════════\n');

  const byNeighborhood = new Map<string, any[]>();
  
  for (const place of places) {
    const neighborhood = place.neighborhood || 'Unknown';
    if (!byNeighborhood.has(neighborhood)) {
      byNeighborhood.set(neighborhood, []);
    }
    byNeighborhood.get(neighborhood)!.push(place);
  }

  for (const [neighborhood, places] of byNeighborhood.entries()) {
    console.log(`\n📍 ${neighborhood} (${places.length} places)`);
    console.log('─'.repeat(60));
    
    for (const place of places) {
      console.log(`  • ${place.name}`);
      console.log(`    Status: ${place.status}`);
      console.log(`    Address: ${place.address || 'N/A'}`);
      console.log(`    Slug: ${place.slug}`);
      console.log('');
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('SUMMARY BY NEIGHBORHOOD');
  console.log('════════════════════════════════════════════════════════════\n');
  
  for (const [neighborhood, places] of Array.from(byNeighborhood.entries()).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${neighborhood}: ${places.length} places`);
  }
  
  console.log(`\n  TOTAL: ${places.length} out-of-scope places`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
