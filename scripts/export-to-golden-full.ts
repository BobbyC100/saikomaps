#!/usr/bin/env node
/**
 * Export Places to Golden Records (FULL DATA)
 * 
 * Updates golden_records with rich data from places table.
 * This enables Google Places enrichment to work.
 * 
 * Usage: npm run export:full
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function exportPlacesToGoldenRecords() {
  console.log('📤 EXPORTING PLACES TO GOLDEN RECORDS (FULL DATA)');
  console.log('═'.repeat(60));
  console.log('');

  // Get all places from the original table
  const places = await prisma.places.findMany({
    where: {
      status: 'OPEN' // Only export open places
    }
  });

  console.log(`Found ${places.length} open places to export\n`);

  let updated = 0;
  let skipped = 0;

  for (const place of places) {
    try {
      // Find matching golden_record by slug
      const existing = await prisma.golden_records.findUnique({
        where: { slug: place.slug }
      });

      if (!existing) {
        console.log(`⚠️  No golden_record found for slug: ${place.slug}`);
        skipped++;
        continue;
      }

      // Update with full data from places
      await prisma.golden_records.update({
        where: { canonical_id: existing.canonical_id },
        data: {
          google_place_id: place.google_place_id,
          phone: place.phone,
          website: place.website,
          instagram_handle: place.instagram,
          hours_json: place.hours as Prisma.JsonValue,
          category: place.category,
          neighborhood: place.neighborhood,
          address_street: place.address,
          description: place.description,
          vibe_tags: place.vibe_tags,
          price_level: place.price_level,
          updated_at: new Date(),
        }
      });
      
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`Progress: ${updated}/${places.length}...`);
      }
    } catch (error: any) {
      console.error(`✗ Error processing ${place.name}:`, error.message);
      skipped++;
    }
  }

  console.log('');
  console.log('─'.repeat(40));
  console.log(`✅ Export complete!`);
  console.log(`   Updated: ${updated} records`);
  console.log(`   Skipped: ${skipped}`);
  console.log('');

  // Verify Google Place IDs
  const withGoogleId = await prisma.golden_records.count({
    where: {
      google_place_id: { not: null }
    }
  });

  const total = await prisma.golden_records.count();

  console.log('📊 Google Place ID Coverage:');
  console.log(`   ${withGoogleId} / ${total} places have Google IDs (${Math.round(withGoogleId/total*100)}%)`);
  console.log('');

  if (withGoogleId > 0) {
    console.log('✅ Enrichment script can now run!');
    console.log('   Next: npm run enrich:google');
  } else {
    console.log('⚠️  No Google Place IDs found.');
  }
}

async function main() {
  try {
    await exportPlacesToGoldenRecords();
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
