#!/usr/bin/env node
/**
 * Investigate orphan phantom records - are they legitimate places?
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 ORPHAN PHANTOM INVESTIGATION\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get all Tier 3 places
  const allPlaces = await prisma.places.findMany({
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
      website: true,
      google_types: true,
    },
  });

  // Filter to Tier 3
  const tier3 = allPlaces.filter(place => {
    if (!place.editorial_sources) return true;
    if (Array.isArray(place.editorial_sources) && place.editorial_sources.length === 0) return true;
    return false;
  });

  // Identify phantoms
  const phantoms = tier3.filter(place => {
    const noAddress = !place.address || place.address.trim() === '';
    const noGoogleId = !place.google_place_id || place.google_place_id.trim() === '';
    return noAddress && noGoogleId;
  });

  // Find real places for comparison
  const realPlaces = tier3.filter(p => p.address && p.google_place_id);
  const realByName = new Map<string, typeof realPlaces>();
  for (const real of realPlaces) {
    const name = real.name?.trim().toLowerCase() || '';
    if (name) {
      if (!realByName.has(name)) {
        realByName.set(name, []);
      }
      realByName.get(name)!.push(real);
    }
  }

  // Separate orphans from duplicates
  const orphans = phantoms.filter(phantom => {
    const name = phantom.name?.trim().toLowerCase() || '';
    return !realByName.has(name);
  });

  const duplicates = phantoms.filter(phantom => {
    const name = phantom.name?.trim().toLowerCase() || '';
    return realByName.has(name);
  });

  console.log(`Total phantoms: ${phantoms.length}`);
  console.log(`  Duplicates (have real match): ${duplicates.length}`);
  console.log(`  Orphans (no real match): ${orphans.length}\n`);

  // Analyze orphan characteristics
  console.log('════════════════════════════════════════════════════════════');
  console.log('ORPHAN PHANTOM CHARACTERISTICS');
  console.log('════════════════════════════════════════════════════════════\n');

  const orphansWithWebsite = orphans.filter(p => p.website).length;
  const orphansWithTypes = orphans.filter(p => p.google_types && p.google_types.length > 0).length;
  const orphansWithCategory = orphans.filter(p => p.category).length;

  console.log(`Have website: ${orphansWithWebsite} (${((orphansWithWebsite / orphans.length) * 100).toFixed(1)}%)`);
  console.log(`Have Google types: ${orphansWithTypes} (${((orphansWithTypes / orphans.length) * 100).toFixed(1)}%)`);
  console.log(`Have category: ${orphansWithCategory} (${((orphansWithCategory / orphans.length) * 100).toFixed(1)}%)`);

  // Sample orphans to inspect
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('RANDOM SAMPLE OF ORPHAN PHANTOMS (20 records)');
  console.log('════════════════════════════════════════════════════════════\n');

  const sample = orphans.sort(() => Math.random() - 0.5).slice(0, 20);

  for (let i = 0; i < sample.length; i++) {
    const orphan = sample[i];
    console.log(`${i + 1}. "${orphan.name}"`);
    console.log(`   Coords: ${orphan.latitude}, ${orphan.longitude}`);
    console.log(`   Category: ${orphan.category || 'N/A'}`);
    console.log(`   Website: ${orphan.website || 'N/A'}`);
    console.log(`   Google Types: ${orphan.google_types?.join(', ') || 'N/A'}`);
    console.log('');
  }

  // Check if coordinates are valid (in LA area)
  const LABounds = {
    north: 34.8,
    south: 33.7,
    east: -117.6,
    west: -118.7,
  };

  const orphansInLA = orphans.filter(p => {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    return lat >= LABounds.south && lat <= LABounds.north &&
           lng >= LABounds.west && lng <= LABounds.east;
  });

  const orphansOutsideLA = orphans.length - orphansInLA.length;

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('GEOGRAPHIC ANALYSIS');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log(`Orphans in LA County bounds: ${orphansInLA.length} (${((orphansInLA.length / orphans.length) * 100).toFixed(1)}%)`);
  console.log(`Orphans outside LA County: ${orphansOutsideLA} (${((orphansOutsideLA / orphans.length) * 100).toFixed(1)}%)`);

  // Sample out-of-county orphans
  const outOfCounty = orphans.filter(p => {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    return !(lat >= LABounds.south && lat <= LABounds.north &&
           lng >= LABounds.west && lng <= LABounds.east);
  }).slice(0, 10);

  if (outOfCounty.length > 0) {
    console.log('\nSample of out-of-county orphans:');
    for (const place of outOfCounty) {
      console.log(`  • ${place.name} (${place.latitude}, ${place.longitude})`);
    }
  }

  // Recommendations
  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log('RECOMMENDATIONS');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('📊 Data quality assessment:\n');
  
  if (orphansWithWebsite === 0 && orphansWithTypes === 0) {
    console.log('  🚨 CRITICAL: Orphans have NO metadata (no website, no types)');
    console.log('     → These appear to be corrupt/incomplete records');
    console.log('     → SAFE TO DELETE');
  } else {
    console.log(`  ⚠️  WARNING: Some orphans have metadata:`);
    console.log(`     - ${orphansWithWebsite} have websites`);
    console.log(`     - ${orphansWithTypes} have Google types`);
    console.log(`     → These might be recoverable`);
    console.log(`     → Consider Google Places API reverse lookup by coordinates`);
  }

  console.log('\n📍 Geographic assessment:\n');
  
  if (orphansOutsideLA > 0) {
    console.log(`  ⚠️  WARNING: ${orphansOutsideLA} orphans are outside LA County`);
    console.log('     → These should be deleted (out of scope)');
  }

  console.log('\n💡 Recommended actions:\n');
  console.log('  1. DELETE duplicates (safe): 10 records');
  console.log(`  2. DELETE out-of-county orphans: ${orphansOutsideLA} records`);
  
  if (orphansWithWebsite === 0 && orphansWithTypes === 0) {
    console.log(`  3. DELETE corrupt orphans (no metadata): ${orphansInLA.length} records`);
    console.log(`\n  📊 Total safe to delete: ${10 + orphansOutsideLA + orphansInLA.length} records`);
  } else {
    console.log(`  3. INVESTIGATE in-county orphans with metadata: ${orphansWithWebsite} records`);
    console.log(`  4. CONSIDER deleting in-county orphans with no metadata: ${orphansInLA.length - orphansWithWebsite} records`);
    console.log(`\n  📊 Minimum safe to delete: ${10 + orphansOutsideLA} records`);
    console.log(`  📊 Maximum could delete: ${phantoms.length} records (if all are corrupt)`);
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
