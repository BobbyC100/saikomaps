#!/usr/bin/env node
/**
 * Backfill Google Place IDs from places → golden_records
 * 
 * Matches by name similarity and copies Google Place IDs.
 * This enables enrichment to work.
 * 
 * Usage: npm run backfill:google-ids
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple name normalization for matching
function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function backfillGoogleIds() {
  console.log('🔗 BACKFILLING GOOGLE PLACE IDs');
  console.log('═'.repeat(60));
  console.log('');

  // Get places with Google IDs
  const placesWithIds = await prisma.places.findMany({
    where: {
      google_place_id: { not: null }
    },
    select: {
      name: true,
      google_place_id: true,
      neighborhood: true,
      slug: true,
    }
  });

  console.log(`Found ${placesWithIds.length} places with Google IDs\n`);

  // Get all golden_records
  const goldenRecords = await prisma.golden_records.findMany({
    select: {
      canonical_id: true,
      name: true,
      slug: true,
      neighborhood: true,
      google_place_id: true,
    }
  });

  console.log(`Found ${goldenRecords.length} golden records\n`);

  // Build lookup by normalized name
  const placesByName = new Map<string, typeof placesWithIds[0]>();
  placesWithIds.forEach(p => {
    const key = normalizeName(p.name);
    placesByName.set(key, p);
  });

  let updated = 0;
  let skipped = 0;

  for (const golden of goldenRecords) {
    // Skip if already has Google ID
    if (golden.google_place_id) {
      continue;
    }

    // Try to match by normalized name
    const normalizedName = normalizeName(golden.name);
    const match = placesByName.get(normalizedName);

    if (match) {
      // Found a match! Copy the Google Place ID
      await prisma.golden_records.update({
        where: { canonical_id: golden.canonical_id },
        data: { google_place_id: match.google_place_id }
      });
      
      updated++;
      console.log(`✓ ${golden.name} → ${match.google_place_id}`);
    } else {
      skipped++;
    }
  }

  console.log('');
  console.log('─'.repeat(40));
  console.log(`✅ Backfill complete!`);
  console.log(`   Updated: ${updated} records`);
  console.log(`   Skipped: ${skipped} (no match found)`);
  console.log('');

  // Verify
  const withGoogleId = await prisma.golden_records.count({
    where: { google_place_id: { not: null } }
  });

  const total = await prisma.golden_records.count();

  console.log('📊 Google Place ID Coverage:');
  console.log(`   ${withGoogleId} / ${total} places (${Math.round(withGoogleId/total*100)}%)`);
  console.log('');

  if (withGoogleId > 0) {
    console.log('🎉 Ready for enrichment!');
    console.log('   Next: npm run enrich:google -- --limit=50');
  }
}

async function main() {
  try {
    await backfillGoogleIds();
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
