#!/usr/bin/env node
/**
 * Spot Check Missing Place IDs
 *
 * Analyzes curated places that still don't have Google Place IDs after
 * backfill and recovery attempts, providing a sample for manual review.
 *
 * Usage:
 *   npm run spot-check:missing
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function spotCheckMissingPlaces() {
  // Get curated place IDs
  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  // Get curated places without Google Place IDs
  const missingPlaces = await prisma.places.findMany({
    where: {
      id: { in: curatedIds },
      googlePlaceId: null,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      neighborhood: true,
      category: true,
      createdAt: true,
      placesDataCachedAt: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('CURATED PLACES MISSING GOOGLE PLACE IDs');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Total places missing Place IDs: ${missingPlaces.length}\n`);

  if (missingPlaces.length === 0) {
    console.log('✅ All curated places have Google Place IDs!\n');
    return;
  }

  // Randomly sample 10 (or all if less than 10)
  const sampleSize = Math.min(10, missingPlaces.length);
  const shuffled = [...missingPlaces].sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, sampleSize);

  console.log(`SPOT CHECK: ${sampleSize} Random Places Without Place IDs\n`);
  console.log('═'.repeat(80));
  
  sample.forEach((place, index) => {
    console.log(`\n${index + 1}. ${place.name} (${place.slug})`);
    console.log(`   Address: ${place.address || 'NULL'}`);
    console.log(`   Coordinates: (${place.latitude || 0}, ${place.longitude || 0})`);
    console.log(`   Neighborhood: ${place.neighborhood || 'NULL'}`);
    console.log(`   Category: ${place.category || 'Unknown'}`);
    console.log(`   Backfill attempted: ${place.placesDataCachedAt ? 'Yes' : 'No'}`);
    console.log(`   🔍 Google Search: https://www.google.com/search?q=${encodeURIComponent(place.name + ' Los Angeles')}`);
    console.log(`   ID: ${place.id}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 ANALYSIS BY CATEGORY:\n');
  
  // Analyze patterns
  const withAddress = missingPlaces.filter((p) => p.address);
  const withValidCoords = missingPlaces.filter((p) => p.latitude !== 0 && p.longitude !== 0);
  const withNeighborhood = missingPlaces.filter((p) => p.neighborhood);
  const attempted = missingPlaces.filter((p) => p.placesDataCachedAt);
  const neverAttempted = missingPlaces.filter((p) => !p.placesDataCachedAt);
  
  // Try to identify places outside LA
  const possiblyOutsideLA = missingPlaces.filter((p) => {
    const addr = p.address?.toLowerCase() || '';
    const hood = p.neighborhood?.toLowerCase() || '';
    return (
      addr.includes('new york') ||
      addr.includes('hawaii') ||
      addr.includes('paris') ||
      addr.includes('san francisco') ||
      addr.includes('chicago') ||
      addr.includes('seattle') ||
      hood.includes('hawaii') ||
      hood.includes('kailua') ||
      hood.includes('palm beach') ||
      hood.includes('paris') ||
      (addr && !addr.includes('ca') && !addr.includes('california') && !addr.includes('los angeles'))
    );
  });

  console.log(`With address: ${withAddress.length} (${Math.round((withAddress.length / missingPlaces.length) * 100)}%)`);
  console.log(`With valid coordinates: ${withValidCoords.length} (${Math.round((withValidCoords.length / missingPlaces.length) * 100)}%)`);
  console.log(`With neighborhood: ${withNeighborhood.length} (${Math.round((withNeighborhood.length / missingPlaces.length) * 100)}%)`);
  console.log(`Backfill attempted: ${attempted.length} (${Math.round((attempted.length / missingPlaces.length) * 100)}%)`);
  console.log(`Never attempted: ${neverAttempted.length} (${Math.round((neverAttempted.length / missingPlaces.length) * 100)}%)`);
  console.log(`Possibly outside LA: ${possiblyOutsideLA.length} (${Math.round((possiblyOutsideLA.length / missingPlaces.length) * 100)}%)`);

  console.log('\n' + '═'.repeat(80));
  console.log('\n💡 RECOMMENDATIONS:\n');
  
  if (possiblyOutsideLA.length > 0) {
    console.log(`1. Review ${possiblyOutsideLA.length} places possibly outside LA County`);
    console.log('   - Consider removing if not relevant to your use case\n');
  }
  
  if (neverAttempted.length > 0) {
    console.log(`2. ${neverAttempted.length} places never attempted backfill`);
    console.log('   - These likely lack addresses or have (0,0) coordinates\n');
  }
  
  if (attempted.length > 0) {
    console.log(`3. ${attempted.length} places failed backfill attempts`);
    console.log('   - Google could not find them (closed, name mismatch, etc.)\n');
  }

  console.log('═'.repeat(80));
  console.log('\nMANUAL REVIEW TEMPLATE:\n');
  console.log('Copy this to a text file and fill in as you research:\n');
  
  sample.forEach((place, index) => {
    console.log(`${index + 1}. ${place.name} (${place.slug})`);
    console.log(`   [ ] Outside LA County? (if yes, DELETE)`);
    console.log(`   [ ] Permanently closed? (if yes, DELETE)`);
    console.log(`   [ ] Name mismatch? (needs manual correction)`);
    console.log(`   [ ] Action: KEEP / DELETE / FIX NAME\n`);
  });

  // Export detailed analysis
  const exportData = {
    summary: {
      total: missingPlaces.length,
      withAddress: withAddress.length,
      withValidCoords: withValidCoords.length,
      withNeighborhood: withNeighborhood.length,
      attempted: attempted.length,
      neverAttempted: neverAttempted.length,
      possiblyOutsideLA: possiblyOutsideLA.length,
      sampleSize: sample.length,
      generatedAt: new Date().toISOString(),
    },
    sample: sample.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      address: p.address,
      neighborhood: p.neighborhood,
      coordinates: { lat: p.latitude, lng: p.longitude },
      backfillAttempted: !!p.placesDataCachedAt,
      googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(p.name + ' Los Angeles')}`,
    })),
    possiblyOutsideLA: possiblyOutsideLA.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      address: p.address,
      neighborhood: p.neighborhood,
    })),
    allMissing: missingPlaces.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      address: p.address,
      neighborhood: p.neighborhood,
      coordinates: { lat: p.latitude, lng: p.longitude },
      backfillAttempted: !!p.placesDataCachedAt,
    })),
  };

  const exportPath = path.join(process.cwd(), 'logs', 'missing-place-ids.json');
  
  // Ensure logs directory exists
  const logsDir = path.dirname(exportPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  
  console.log('═'.repeat(80));
  console.log(`\n📄 Full analysis exported to: ${exportPath}\n`);
}

spotCheckMissingPlaces()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
