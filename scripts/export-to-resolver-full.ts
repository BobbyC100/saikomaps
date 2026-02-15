/**
 * Saiko Maps - Export Places to Resolver (FULL DATA)
 * 
 * Exports existing places table to golden_records with ALL fields.
 * This enables Google Places enrichment to work.
 * 
 * Usage: npx ts-node scripts/export-to-resolver.ts
 * 
 * IMPORTANT: This script UPDATES existing golden_records if they match by slug,
 * rather than creating duplicates.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function exportPlacesToResolver() {
  console.log('📤 EXPORTING PLACES TO GOLDEN RECORDS (FULL DATA)');
  console.log('═'.repeat(60));
  console.log('');

  // Get all places from the original table
  const places = await prisma.places.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      
      // Location
      lat: true,
      lng: true,
      // Adjust field name if different in your schema
      address: true,
      neighborhood: true,
      city: true,
      state: true,
      zip: true,
      
      // Google Places (CRITICAL)
      google_place_id: true,
      
      // Contact
      phone: true,
      website: true,
      instagram: true,
      
      // Hours
      hours: true,           // Adjust field name if different in your schema
      // openingHours: true, // Alternative field name
      
      // Media
      photos: true,          // Adjust if this is a relation or JSON
      // photoReferences: true, // Alternative
      
      // Meta
      category: true,
      cuisine_type: true,
      price_level: true,
      
      // Status
      status: true,
      
      // Timestamps
      created_at: true,
      updated_at: true,
    }
  });

  console.log(`Found ${places.length} places to export\n`);

  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const place of places) {
    try {
      // Check if golden_record exists for this slug
      const existing = await prisma.golden_records.findUnique({
        where: { slug: place.slug }
      });

      const data = {
        name: place.name,
        slug: place.slug,
        
        // Location
        lat: place.lat,
        lng: place.lng,
        address: place.address,
        neighborhood: place.neighborhood,
        city: place.city,
        state: place.state,
        zip: place.zip,
        
        // Google Places ID (CRITICAL for enrichment)
        googlePlaceId: place.googlePlaceId,
        
        // Contact
        phone: place.phone,
        website: place.website,
        instagram: place.instagram,
        
        // Hours - handle both possible field names
        hours: place.hours,
        
        // Photos - handle JSON or relation
        photos: place.photos,
        
        // Meta
        category: place.category,
        cuisine: place.cuisine,
        priceLevel: place.priceLevel,
        
        // Status
        status: place.status || 'ACTIVE',
        businessStatus: place.businessStatus,
        
        // Lifecycle (for new editorial system)
        lifecycle_status: place.status === 'CLOSED' ? 'CLOSED_PERMANENTLY' : 'ACTIVE',
      };

      if (existing) {
        // Update existing record with full data
        await prisma.golden_records.update({
          where: { slug: place.slug },
          data: {
            ...data,
            updatedAt: new Date(),
          }
        });
        updated++;
      } else {
        // Create new record
        await prisma.golden_records.create({
          data: {
            ...data,
            createdAt: place.createdAt || new Date(),
            updatedAt: new Date(),
          }
        });
        created++;
      }
    } catch (error) {
      console.error(`  ⚠️  Error processing ${place.name}: ${error}`);
      skipped++;
    }
  }

  console.log('─'.repeat(40));
  console.log(`✅ Export complete!`);
  console.log(`   Updated: ${updated} existing records`);
  console.log(`   Created: ${created} new records`);
  console.log(`   Skipped: ${skipped} (errors)`);
  console.log('');

  // Verify Google Place IDs
  const withGoogleId = await prisma.golden_records.count({
    where: {
      googlePlaceId: { not: null }
    }
  });

  const total = await prisma.golden_records.count();

  console.log('📊 Google Place ID Coverage:');
  console.log(`   ${withGoogleId} / ${total} places have Google IDs (${Math.round(withGoogleId/total*100)}%)`);
  console.log('');

  if (withGoogleId > 0) {
    console.log('✅ Enrichment script can now run on these places!');
    console.log('   Run: npm run enrich:google');
  } else {
    console.log('⚠️  No Google Place IDs found. Check your places table schema.');
  }
}

async function main() {
  try {
    await exportPlacesToResolver();
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
