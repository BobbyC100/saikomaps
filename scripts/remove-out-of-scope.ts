#!/usr/bin/env node
/**
 * Remove out-of-scope places (not in LA County)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log(`\n🔍 Finding out-of-scope places (not LA County)...`);
  console.log(`   ${dryRun ? '🚧 DRY RUN MODE' : '❌ DELETION MODE'}\n`);
  
  // Get places with clear non-LA addresses
  const allPlaces = await prisma.places.findMany({
    where: {
      OR: [
        { address: { contains: ', HI ' } },
        { address: { contains: ', CO ' } },
        { address: { contains: 'Boulder, CO' } },
        { address: { contains: 'Denver, CO' } },
        { address: { contains: 'Berkeley, CA 94' } },
        { address: { contains: 'Honolulu, HI' } },
        { address: { contains: 'Ojai, CA 93023' } },
        { address: { contains: 'Haleiwa, HI' } },
        { address: { contains: 'Kailua, HI' } },
        { address: { contains: 'Kaneohe, HI' } },
        { address: { contains: 'Edgewater, CO' } },
        { address: { contains: 'Lafayette, CO' } },
      ],
    },
    select: {
      id: true,
      name: true,
      address: true,
      neighborhood: true,
    },
  });

  const allIds = new Set(allPlaces.map(p => p.id));

  console.log(`Found ${allPlaces.length} out-of-scope places to remove\n`);
  
  if (allPlaces.length === 0) {
    console.log('✅ No out-of-scope places found!');
    return;
  }

  // Group by location
  const byLocation = new Map<string, any[]>();
  for (const place of allPlaces) {
    let location = 'Unknown';
    
    if (place.address?.includes(', HI ') || place.neighborhood?.includes('Honolulu') || 
        place.neighborhood?.includes('Kailua') || place.neighborhood?.includes('Waikiki')) {
      location = 'Hawaii';
    } else if (place.address?.includes(', CO ') || place.address?.includes('Denver') || 
               place.address?.includes('Boulder')) {
      location = 'Colorado';
    } else if (place.address?.includes('Berkeley')) {
      location = 'Berkeley, CA';
    } else if (place.address?.includes('Ojai') || place.neighborhood === 'Ojai') {
      location = 'Ojai (Ventura County)';
    }
    
    if (!byLocation.has(location)) {
      byLocation.set(location, []);
    }
    byLocation.get(location)!.push(place);
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('OUT-OF-SCOPE PLACES BY LOCATION');
  console.log('════════════════════════════════════════════════════════════\n');

  for (const [location, places] of Array.from(byLocation.entries()).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`📍 ${location} (${places.length} places)`);
    for (const place of places.slice(0, 5)) {
      console.log(`   • ${place.name}`);
    }
    if (places.length > 5) {
      console.log(`   ... and ${places.length - 5} more`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('DRY RUN - No changes made');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('To actually remove these places, run:');
    console.log('  npx tsx scripts/remove-out-of-scope.ts');
    console.log('');
    return;
  }

  // Confirm deletion
  console.log('════════════════════════════════════════════════════════════');
  console.log(`⚠️  About to DELETE ${allPlaces.length} places`);
  console.log('════════════════════════════════════════════════════════════\n');

  // First, delete related records in map_places
  console.log('  Step 1: Deleting related map_places records...');
  const mapPlacesDeleted = await prisma.map_places.deleteMany({
    where: {
      place_id: {
        in: Array.from(allIds),
      },
    },
  });
  console.log(`  Deleted ${mapPlacesDeleted.count} map_places records`);

  // Delete related records in person_places
  console.log('  Step 2: Deleting related person_places records...');
  const personPlacesDeleted = await prisma.person_places.deleteMany({
    where: {
      place_id: {
        in: Array.from(allIds),
      },
    },
  });
  console.log(`  Deleted ${personPlacesDeleted.count} person_places records`);

  // Delete related records in viewer_bookmarks
  console.log('  Step 3: Deleting related viewer_bookmarks records...');
  const bookmarksDeleted = await prisma.viewer_bookmarks.deleteMany({
    where: {
      place_id: {
        in: Array.from(allIds),
      },
    },
  });
  console.log(`  Deleted ${bookmarksDeleted.count} viewer_bookmarks records`);

  // Delete in batches
  console.log('  Step 4: Deleting places...');
  const batchSize = 50;
  const idArray = Array.from(allIds);
  let deleted = 0;

  for (let i = 0; i < idArray.length; i += batchSize) {
    const batch = idArray.slice(i, i + batchSize);
    const result = await prisma.places.deleteMany({
      where: {
        id: {
          in: batch,
        },
      },
    });
    deleted += result.count;
    console.log(`    Deleted ${deleted}/${allPlaces.length} places...`);
  }

  console.log(`\n✅ Successfully removed ${deleted} out-of-scope places`);
  console.log('\nNext steps:');
  console.log('  1. Verify frontend queries filter by geography if needed');
  console.log('  2. Add validation to data import to prevent future out-of-scope entries');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
