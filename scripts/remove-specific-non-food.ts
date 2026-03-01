#!/usr/bin/env node
/**
 * Remove specific non-food places
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('\n🗑️  REMOVE SPECIFIC NON-FOOD PLACES\n');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`Mode: ${dryRun ? '🚧 DRY RUN' : '❌ DELETION MODE'}\n`);

  // Places to remove
  const placesToRemove = [
    'DRIVER',
    'Donlevy, Estess & Lohiya Oral & Maxillofacial Surgery Group in Los Angeles',
    'Rory Fashion',
    'Michaels',
  ];

  console.log('Places to remove:');
  for (const name of placesToRemove) {
    console.log(`  • ${name}`);
  }
  console.log('');

  // Find these places
  const places = await prisma.entities.findMany({
    where: {
      name: {
        in: placesToRemove,
      },
      status: 'OPEN',
    },
    select: {
      id: true,
      name: true,
      address: true,
      category: true,
      google_types: true,
    },
  });

  console.log(`Found ${places.length} places to remove\n`);
  console.log('─'.repeat(60));
  
  for (const place of places) {
    console.log(`\n${place.name}`);
    console.log(`  Address: ${place.address || 'N/A'}`);
    console.log(`  Category: ${place.category || 'N/A'}`);
    console.log(`  Types: ${place.google_types?.join(', ') || 'N/A'}`);
  }

  if (places.length === 0) {
    console.log('\n⚠️  No places found to remove!');
    return;
  }

  if (dryRun) {
    console.log('\n\n════════════════════════════════════════════════════════════');
    console.log('DRY RUN - No changes made');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log(`Would remove ${places.length} places`);
    console.log('\nTo delete, run:');
    console.log('  npx tsx scripts/remove-specific-non-food.ts');
    return;
  }

  // Delete them
  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log(`⚠️  DELETING ${places.length} PLACES`);
  console.log('════════════════════════════════════════════════════════════\n');

  const placeIds = places.map(p => p.id);

  // Delete related records
  const mapPlacesDeleted = await prisma.map_places.deleteMany({
    where: { entityId: { in: placeIds } },
  });
  console.log(`  Deleted ${mapPlacesDeleted.count} map_places records`);

  const personPlacesDeleted = await prisma.person_places.deleteMany({
    where: { entityId: { in: placeIds } },
  });
  console.log(`  Deleted ${personPlacesDeleted.count} person_places records`);

  const bookmarksDeleted = await prisma.viewer_bookmarks.deleteMany({
    where: { entityId: { in: placeIds } },
  });
  console.log(`  Deleted ${bookmarksDeleted.count} viewer_bookmarks records`);

  // Delete places
  const deletedPlaces = await prisma.entities.deleteMany({
    where: { id: { in: placeIds } },
  });

  console.log(`\n✅ Successfully deleted ${deletedPlaces.count} non-food places`);

  // Get final count
  const finalCount = await prisma.entities.count({
    where: {
      status: 'OPEN',
      latitude: { not: null },
      longitude: { not: null },
      latitude: { not: 0 },
      longitude: { not: 0 },
    },
  });

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('FINAL COUNT');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`🚀 Launch-ready places: ${finalCount}`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
