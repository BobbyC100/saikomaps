#!/usr/bin/env node
/**
 * Show Duplicate Details
 *
 * Shows the actual data for places that share the same Google Place ID
 * to verify if they're truly duplicates or false positives.
 *
 * Usage:
 *   npm run show:duplicate-details
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showDuplicateDetails() {
  // Get 5 specific "duplicates" from the spot check with full details
  const testPlaceIds = [
    'ChIJn-ihusWXwoARE6yGp6tPoIM', // Anajak Thai
    'ChIJa4urPCK5woARvzt6lVTBuDU', // Bianca
    'ChIJf0__-Gq7woARl7vXlMXyKWc', // Kismet Rotisserie
    'EisxODUwIEFjYWRlbXkgUmQsIExvcyBBbmdlbGVzLCBDQSA5MDAxMiwgVVNBIjESLwoUChIJ7f2w2OTGwoARbQuZneCHIXcQug4qFAoSCSn2YFnlxsKAEflWfACFCVhC', // 1850 Academy (full ID)
    'ChIJMRRbJPvFwoARFIb4YmkxfrY', // El Tepeyac
  ];

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('DUPLICATE DETAILS VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const placeId of testPlaceIds) {
    const places = await prisma.places.findMany({
      where: { googlePlaceId: placeId },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
        googlePlaceId: true,
        googlePhotos: true,
        phone: true,
        website: true,
      },
    });

    if (places.length > 0) {
      console.log('\n' + '═'.repeat(80));
      console.log(`Google Place ID: ${placeId.substring(0, 50)}...`);
      console.log(`Found ${places.length} database entries with this Place ID:\n`);
      
      places.forEach((place, i) => {
        console.log(`${i + 1}. Name: ${place.name}`);
        console.log(`   Slug: ${place.slug}`);
        console.log(`   Address: ${place.address || 'NULL'}`);
        console.log(`   Coordinates: (${place.latitude || 0}, ${place.longitude || 0})`);
        console.log(`   Neighborhood: ${place.neighborhood || 'NULL'}`);
        console.log(`   Phone: ${place.phone || 'NULL'}`);
        console.log(`   Website: ${place.website ? 'YES' : 'NO'}`);
        console.log(`   Photos: ${place.googlePhotos && Array.isArray(place.googlePhotos) ? place.googlePhotos.length : 0}`);
        console.log('');
      });

      if (places.length > 1) {
        console.log('❓ QUESTION: Are these truly duplicates?');
        console.log('   - Same address? Check above');
        console.log('   - Same coordinates? Check above');
        console.log('   - One has data, one is empty? → TRUE duplicate');
        console.log('   - Both have different data? → FALSE duplicate (Google error)');
      }
    } else {
      console.log(`\n⚠️  No places found with Place ID: ${placeId.substring(0, 50)}...`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n💡 SUMMARY:\n');
  console.log('If most pairs show:');
  console.log('  - One entry with full data (address, coords, phone, photos)');
  console.log('  - One entry with NULL/empty data');
  console.log('  → These ARE true duplicates, safe to delete\n');
  console.log('If pairs show:');
  console.log('  - Different addresses or coordinates');
  console.log('  - Both have different data');
  console.log('  → These are FALSE duplicates, DO NOT delete\n');
}

showDuplicateDetails()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
