#!/usr/bin/env node
/**
 * Identify and remove phantom duplicate records (no address, no Google Place ID)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('\n🔍 PHANTOM RECORD CLEANUP\n');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`Mode: ${dryRun ? '🚧 DRY RUN' : '❌ DELETION MODE'}\n`);

  // Find all Tier 3 places
  const allPlaces = await prisma.entities.findMany({
    where: {
      status: 'OPEN',
      latitude: { not: null },
      longitude: { not: null },
      latitude: { not: 0 },
      longitude: { not: 0 },
    },
    select: {
      id: true,
      name: true,
      address: true,
      neighborhood: true,
      google_place_id: true,
      category: true,
      editorial_sources: true,
      latitude: true,
      longitude: true,
    },
  });

  // Filter to Tier 3 only
  const tier3 = allPlaces.filter(place => {
    if (!place.editorial_sources) return true;
    if (Array.isArray(place.editorial_sources) && place.editorial_sources.length === 0) return true;
    return false;
  });

  console.log(`Total Tier 3 places: ${tier3.length}\n`);

  // Identify phantom records (no address AND no Google Place ID)
  const phantoms = tier3.filter(place => {
    const noAddress = !place.address || place.address.trim() === '';
    const noGoogleId = !place.google_place_id || place.google_place_id.trim() === '';
    return noAddress && noGoogleId;
  });

  console.log(`Found ${phantoms.length} phantom records\n`);
  console.log('Phantom characteristics:');
  console.log(`  - No address: ${phantoms.length}`);
  console.log(`  - No Google Place ID: ${phantoms.length}`);
  console.log(`  - Have name: ${phantoms.filter(p => p.name).length}`);
  console.log(`  - Have coordinates: ${phantoms.length} (all)`);

  // Group phantoms by name to show duplicates
  const phantomsByName = new Map<string, typeof phantoms>();
  for (const phantom of phantoms) {
    const name = phantom.name?.trim().toLowerCase() || 'unnamed';
    if (!phantomsByName.has(name)) {
      phantomsByName.set(name, []);
    }
    phantomsByName.get(name)!.push(phantom);
  }

  console.log(`\n  Unique names: ${phantomsByName.size}`);

  // Find their "real" counterparts (same name, but WITH address/Google ID)
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('PHANTOM vs REAL RECORD COMPARISON (Sample)');
  console.log('════════════════════════════════════════════════════════════\n');

  const realPlaces = tier3.filter(p => p.address && p.google_place_id);
  const realByName = new Map<string, typeof realPlaces>();
  for (const real of realPlaces) {
    const name = real.name?.trim().toLowerCase() || '';
    if (!realByName.has(name)) {
      realByName.set(name, []);
    }
    realByName.get(name)!.push(real);
  }

  let confirmedDuplicates = 0;
  const sampleSize = Math.min(10, phantomsByName.size);
  let shown = 0;

  for (const [name, phantomRecords] of phantomsByName.entries()) {
    if (shown >= sampleSize) break;
    
    const realRecords = realByName.get(name) || [];
    if (realRecords.length > 0) {
      confirmedDuplicates += phantomRecords.length;
      shown++;
      
      console.log(`"${phantomRecords[0].name}" - Duplicate found!`);
      console.log(`  ✅ REAL: ${realRecords[0].address}`);
      console.log(`     Google ID: ${realRecords[0].google_place_id}`);
      console.log(`  ❌ PHANTOM: No address, no Google ID`);
      console.log(`     (${phantomRecords.length} phantom copies)\n`);
    }
  }

  console.log(`Total confirmed duplicates: ${confirmedDuplicates}`);
  console.log(`Orphan phantoms (no real match): ${phantoms.length - confirmedDuplicates}`);

  if (dryRun) {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('DRY RUN COMPLETE - No changes made');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('These phantom records would be deleted:');
    console.log(`  Total: ${phantoms.length} records`);
    console.log(`  Confirmed duplicates: ${confirmedDuplicates}`);
    console.log(`  Orphan phantoms: ${phantoms.length - confirmedDuplicates}`);
    console.log('\nTo delete these records, run:');
    console.log('  npx tsx scripts/clean-phantom-records.ts');
    return;
  }

  // Delete phantom records
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`⚠️  DELETING ${phantoms.length} PHANTOM RECORDS`);
  console.log('════════════════════════════════════════════════════════════\n');

  const phantomIds = phantoms.map(p => p.id);
  
  // Delete related records first
  const mapPlacesDeleted = await prisma.map_places.deleteMany({
    where: { entityId: { in: phantomIds } },
  });
  console.log(`  Deleted ${mapPlacesDeleted.count} map_places records`);

  const personPlacesDeleted = await prisma.person_places.deleteMany({
    where: { entityId: { in: phantomIds } },
  });
  console.log(`  Deleted ${personPlacesDeleted.count} person_places records`);

  const bookmarksDeleted = await prisma.viewer_bookmarks.deleteMany({
    where: { entityId: { in: phantomIds } },
  });
  console.log(`  Deleted ${bookmarksDeleted.count} viewer_bookmarks records`);

  // Delete phantom places
  const deletedPlaces = await prisma.entities.deleteMany({
    where: { id: { in: phantomIds } },
  });

  console.log(`\n✅ Successfully deleted ${deletedPlaces.count} phantom records`);

  // Final stats
  const remainingTier3 = tier3.length - phantoms.length;
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('AFTER CLEANUP');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`  Tier 3 places before: ${tier3.length}`);
  console.log(`  Phantom records deleted: ${phantoms.length}`);
  console.log(`  Tier 3 places remaining: ${remainingTier3}`);
  console.log(`\n  Clean Tier 3 places ready: ~${remainingTier3}`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
