#!/usr/bin/env node
/**
 * Delete Incomplete Duplicates
 *
 * Deletes 107 curated places that are either:
 * - Duplicates of existing enriched records (89 places)
 * - Outside LA County (10 places)
 * - Not found on Google (2 places)
 * - Cannot be verified (1 place)
 *
 * All have: address = null, latitude = 0, longitude = 0
 *
 * Usage:
 *   npm run delete:incomplete-duplicates           # dry run
 *   npm run delete:incomplete-duplicates -- --execute  # delete for real
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');

async function deleteIncompleteDuplicates() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('DELETE INCOMPLETE DUPLICATES');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get current stats
  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  const totalCuratedBefore = curatedIds.length;

  const withPlaceIdsBefore = await prisma.places.count({
    where: {
      id: { in: curatedIds },
      googlePlaceId: { not: null },
    },
  });

  console.log('📊 BEFORE DELETION:\n');
  console.log(`Total curated places: ${totalCuratedBefore}`);
  console.log(`With Google Place IDs: ${withPlaceIdsBefore} (${Math.round((withPlaceIdsBefore / totalCuratedBefore) * 100)}%)`);
  console.log('');

  // Find all places to delete (incomplete duplicates)
  const placesToDelete = await prisma.places.findMany({
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
      neighborhood: true,
      phone: true,
      website: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${placesToDelete.length} incomplete duplicates to delete\n`);
  console.log(`Mode: ${DRY_RUN ? '⚠️  DRY RUN' : '🔴 LIVE DELETE'}\n`);

  // Categorize for reporting
  const withData = placesToDelete.filter(p => p.phone || p.website || p.neighborhood);
  const noData = placesToDelete.filter(p => !p.phone && !p.website && !p.neighborhood);

  console.log('BREAKDOWN:\n');
  console.log(`📞 With phone/website/neighborhood: ${withData.length}`);
  console.log(`   (Duplicates of existing enriched records)`);
  console.log('');
  console.log(`🚫 With NO data at all: ${noData.length}`);
  console.log(`   (Outside LA County, duplicates, or not found)`);
  console.log('');

  if (DRY_RUN) {
    console.log('═'.repeat(80));
    console.log('\n📋 PREVIEW - Places to be deleted:\n');
    
    console.log('WITH DATA (89 duplicates):\n');
    withData.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.slug})`);
      if (p.neighborhood) console.log(`   📍 ${p.neighborhood}`);
      if (p.phone) console.log(`   ☎️  ${p.phone}`);
    });
    if (withData.length > 10) {
      console.log(`   ... and ${withData.length - 10} more\n`);
    }

    console.log('\nNO DATA (17 places - outside LA/duplicates/not found):\n');
    noData.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.slug})`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 NEXT STEPS:\n');
    console.log('1. Review the list above');
    console.log('2. Run with --execute to delete:');
    console.log('   npm run delete:incomplete-duplicates -- --execute\n');
    
    return;
  }

  // EXECUTE DELETION
  console.log('═'.repeat(80));
  console.log('\n🔴 DELETING PLACES...\n');

  let deleted = 0;
  let errors = 0;

  for (const place of placesToDelete) {
    try {
      // Delete provenance first (foreign key constraint)
      await prisma.provenance.deleteMany({
        where: { place_id: place.id },
      });

      // Delete the place
      await prisma.places.delete({
        where: { id: place.id },
      });

      deleted++;
      
      if (deleted % 10 === 0 || deleted === placesToDelete.length) {
        process.stdout.write(`\rDeleted: ${deleted}/${placesToDelete.length}`);
      }
    } catch (error) {
      console.error(`\n⚠️  Error deleting ${place.name}:`, error instanceof Error ? error.message : String(error));
      errors++;
    }
  }

  console.log('\n\n' + '═'.repeat(80));
  console.log('\n✅ DELETION COMPLETE\n');
  console.log(`Deleted: ${deleted} places`);
  if (errors > 0) {
    console.log(`⚠️  Errors: ${errors}`);
  }

  // Get updated stats
  const curatedIdsAfter = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  const totalCuratedAfter = curatedIdsAfter.length;

  const withPlaceIdsAfter = await prisma.places.count({
    where: {
      id: { in: curatedIdsAfter },
      googlePlaceId: { not: null },
    },
  });

  console.log('\n📊 AFTER DELETION:\n');
  console.log(`Total curated places: ${totalCuratedAfter} (was ${totalCuratedBefore})`);
  console.log(`With Google Place IDs: ${withPlaceIdsAfter} (${Math.round((withPlaceIdsAfter / totalCuratedAfter) * 100)}%)`);
  console.log('');
  console.log(`✅ Cleaned: ${totalCuratedBefore - totalCuratedAfter} duplicate/invalid places`);
  console.log('');

  console.log('═'.repeat(80));
  console.log('\n💡 NEXT STEPS:\n');
  console.log('1. Run enrichment audit:');
  console.log('   npm run enrich:audit:curated\n');
  console.log('2. Check remaining coverage:');
  console.log('   npm run enrich:sample\n');
}

deleteIncompleteDuplicates()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
