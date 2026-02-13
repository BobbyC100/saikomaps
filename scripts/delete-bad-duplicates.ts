#!/usr/bin/env node
/**
 * Delete Bad Duplicates
 *
 * Deletes places with NULL address AND 0,0 coordinates.
 * These are incomplete duplicates of places that have full data.
 *
 * Usage:
 *   npm run delete:bad-duplicates             # dry run
 *   npm run delete:bad-duplicates -- --execute # delete
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteBadDuplicates(dryRun = true) {
  // Get curated place IDs
  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  // Find places with NULL address AND 0,0 coordinates
  // These are the "bad" duplicates
  const badDuplicates = await prisma.places.findMany({
    where: {
      id: { in: curatedIds },
      address: null,
      latitude: 0,
      longitude: 0,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      phone: true,
      website: true,
      neighborhood: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('DELETE BAD DUPLICATES');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Found ${badDuplicates.length} bad duplicates to delete`);
  console.log(`Mode: ${dryRun ? '⚠️  DRY RUN' : '✅ LIVE DELETE'}\n`);

  if (dryRun) {
    console.log('Bad duplicates that would be deleted:\n');
    console.log('─'.repeat(80));
    
    badDuplicates.slice(0, 20).forEach((place, i) => {
      console.log(`${i + 1}. ${place.name} (${place.slug})`);
      if (place.neighborhood) console.log(`   Neighborhood: ${place.neighborhood}`);
      if (place.phone) console.log(`   Phone: ${place.phone}`);
      if (place.website) console.log(`   Website: ${place.website}`);
    });
    
    if (badDuplicates.length > 20) {
      console.log(`\n... and ${badDuplicates.length - 20} more`);
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\nTotal to delete: ${badDuplicates.length}`);
    console.log('\n⚠️  DRY RUN - No changes made');
    console.log('Run with --execute to delete\n');
  } else {
    let deleted = 0;
    
    console.log('Deleting bad duplicates...\n');
    
    for (const place of badDuplicates) {
      // Delete provenance first
      await prisma.provenance.deleteMany({
        where: { place_id: place.id },
      });
      
      // Delete place
      await prisma.places.delete({
        where: { id: place.id },
      });
      
      deleted++;
      if (deleted % 10 === 0 || deleted === badDuplicates.length) {
        console.log(`  Deleted ${deleted}/${badDuplicates.length}...`);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n✅ Deleted ${deleted} bad duplicates\n`);
    console.log('📊 Final Coverage:\n');
    
    const curatedIdsAfter = await prisma.provenance
      .findMany({ select: { place_id: true } })
      .then((r) => r.map((p) => p.place_id));
    
    const remaining = await prisma.places.count({
      where: { id: { in: curatedIdsAfter } },
    });
    
    const withPlaceIds = await prisma.places.count({
      where: {
        id: { in: curatedIdsAfter },
        googlePlaceId: { not: null },
      },
    });
    
    console.log(`Total curated places: ${remaining}`);
    console.log(`With Google Place IDs: ${withPlaceIds} (${Math.round((withPlaceIds / remaining) * 100)}%)`);
    console.log('');
  }
}

const dryRun = !process.argv.includes('--execute');

deleteBadDuplicates(dryRun)
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
