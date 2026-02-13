#!/usr/bin/env node
/**
 * Cleanup Orphaned Provenance
 *
 * Deletes provenance records that point to places that no longer exist.
 *
 * Usage:
 *   npm run cleanup:orphaned-provenance           # dry run
 *   npm run cleanup:orphaned-provenance -- --execute  # delete for real
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');

async function cleanupOrphanedProvenance() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('CLEANUP ORPHANED PROVENANCE');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get all provenance records
  const allProvenance = await prisma.provenance.findMany({
    select: {
      id: true,
      place_id: true,
      source_name: true,
    },
  });

  console.log(`Total provenance records: ${allProvenance.length}`);

  // Check which places exist
  const placeIds = [...new Set(allProvenance.map((p) => p.place_id))];
  const existingPlaces = await prisma.places.findMany({
    where: { id: { in: placeIds } },
    select: { id: true },
  });

  const existingPlaceIds = new Set(existingPlaces.map((p) => p.id));

  // Find orphaned provenance (pointing to deleted places)
  const orphanedProvenance = allProvenance.filter(
    (p) => !existingPlaceIds.has(p.place_id)
  );

  console.log(`Existing places: ${existingPlaces.length}`);
  console.log(`Orphaned provenance: ${orphanedProvenance.length}`);
  console.log('');
  console.log(`Mode: ${DRY_RUN ? '⚠️  DRY RUN' : '🔴 LIVE DELETE'}\n`);

  if (orphanedProvenance.length === 0) {
    console.log('✅ No orphaned provenance records found!\n');
    return;
  }

  if (DRY_RUN) {
    console.log('═'.repeat(80));
    console.log('\n📋 PREVIEW - Orphaned provenance to be deleted:\n');
    
    // Group by source
    const bySource = orphanedProvenance.reduce((acc, p) => {
      const source = p.source_name || 'Unknown';
      if (!acc[source]) acc[source] = 0;
      acc[source]++;
      return acc;
    }, {} as Record<string, number>);

    console.log('Breakdown by source:\n');
    Object.entries(bySource)
      .sort(([, a], [, b]) => b - a)
      .forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
      });

    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 NEXT STEPS:\n');
    console.log('1. Review the breakdown above');
    console.log('2. Run with --execute to delete:');
    console.log('   npm run cleanup:orphaned-provenance -- --execute\n');
    
    return;
  }

  // EXECUTE DELETION
  console.log('═'.repeat(80));
  console.log('\n🔴 DELETING ORPHANED PROVENANCE...\n');

  const orphanedIds = orphanedProvenance.map((p) => p.id);
  
  const result = await prisma.provenance.deleteMany({
    where: { id: { in: orphanedIds } },
  });

  console.log(`✅ Deleted ${result.count} orphaned provenance records\n`);

  // Get updated stats
  const remainingProvenance = await prisma.provenance.count();
  console.log(`Remaining provenance records: ${remainingProvenance}`);
  console.log(`Should match existing places: ${existingPlaces.length}\n`);

  console.log('═'.repeat(80));
  console.log('\n✅ CLEANUP COMPLETE\n');
}

cleanupOrphanedProvenance()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
