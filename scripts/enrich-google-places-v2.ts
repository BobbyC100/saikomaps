/**
 * Saiko Maps - Google Places Enrichment
 * 
 * Enriches golden_records that have Google Place IDs but missing data.
 * 
 * Usage: npx ts-node scripts/enrich-google-places.ts
 * 
 * Requires: GOOGLE_PLACES_API_KEY in .env
 * Cost: ~$0.017 per Place Details request
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Rate limiting: 50 requests per second max, we'll do 10/sec to be safe
const DELAY_MS = 100;
const BATCH_SIZE = 50;

interface GooglePlaceDetails {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text?: string[];
    periods?: any[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  types?: string[];
  price_level?: number;
  business_status?: string;
  url?: string; // Google Maps URL
}

async function fetchPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY not found in environment');
  }

  const fields = [
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'opening_hours',
    'photos',
    'types',
    'price_level',
    'business_status',
    'url',
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return data.result;
    } else if (data.status === 'NOT_FOUND') {
      console.log(`    Place not found: ${placeId}`);
      return null;
    } else {
      console.error(`    API error: ${data.status} - ${data.error_message || ''}`);
      return null;
    }
  } catch (error) {
    console.error(`    Fetch error: ${error}`);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichGoldenRecords() {
  console.log('🔄 GOOGLE PLACES ENRICHMENT');
  console.log('═'.repeat(60));
  console.log('');

  // Find places with Google IDs but missing key data
  const placesToEnrich = await prisma.goldenRecord.findMany({
    where: {
      googlePlaceId: { not: null },
      OR: [
        { phone: null },
        { hours: null },
        { photos: null },
        { address: null },
      ]
    },
    select: {
      id: true,
      name: true,
      googlePlaceId: true,
      phone: true,
      hours: true,
      photos: true,
      address: true,
    }
  });

  console.log(`Found ${placesToEnrich.length} places to enrich\n`);

  if (placesToEnrich.length === 0) {
    console.log('✅ All places with Google IDs are already enriched!');
    return;
  }

  // Estimate cost
  const estimatedCost = placesToEnrich.length * 0.017;
  console.log(`Estimated API cost: $${estimatedCost.toFixed(2)}`);
  console.log('');

  let enriched = 0;
  let failed = 0;
  let notFound = 0;

  for (let i = 0; i < placesToEnrich.length; i++) {
    const place = placesToEnrich[i];
    
    // Progress indicator
    if (i % 50 === 0) {
      console.log(`Processing ${i + 1} / ${placesToEnrich.length}...`);
    }

    const details = await fetchPlaceDetails(place.googlePlaceId!);

    if (!details) {
      notFound++;
      continue;
    }

    try {
      // Build update data (only update missing fields)
      const updateData: any = {};

      if (!place.phone && details.formatted_phone_number) {
        updateData.phone = details.formatted_phone_number;
      }

      if (!place.address && details.formatted_address) {
        updateData.address = details.formatted_address;
      }

      if (!place.hours && details.opening_hours?.weekday_text) {
        updateData.hours = details.opening_hours.weekday_text;
      }

      if (!place.photos && details.photos && details.photos.length > 0) {
        // Store photo references (you'll need to convert these to URLs later)
        updateData.photos = details.photos.slice(0, 10).map(p => ({
          reference: p.photo_reference,
          width: p.width,
          height: p.height,
        }));
      }

      // Always update these if available
      if (details.types) {
        updateData.googleTypes = details.types;
      }

      if (details.price_level !== undefined) {
        updateData.priceLevel = details.price_level;
      }

      if (details.business_status) {
        updateData.businessStatus = details.business_status;
        
        // Update lifecycle status if closed
        if (details.business_status === 'CLOSED_PERMANENTLY') {
          updateData.lifecycleStatus = 'CLOSED_PERMANENTLY';
          updateData.archiveReason = 'CLOSED';
          updateData.archivedAt = new Date();
          updateData.archivedBy = 'google_sync';
        }
      }

      if (details.website) {
        updateData.website = details.website;
      }

      // Only update if we have new data
      if (Object.keys(updateData).length > 0) {
        await prisma.goldenRecord.update({
          where: { id: place.id },
          data: {
            ...updateData,
            updatedAt: new Date(),
          }
        });
        enriched++;
      }

    } catch (error) {
      console.error(`  Error updating ${place.name}: ${error}`);
      failed++;
    }

    // Rate limiting
    await sleep(DELAY_MS);
  }

  console.log('');
  console.log('─'.repeat(40));
  console.log(`✅ Enrichment complete!`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Failed: ${failed}`);
  console.log('');

  // Show new stats
  const stats = await getDataStats();
  console.log('📊 Updated Data Coverage:');
  console.log(`   With phone:    ${stats.withPhone} / ${stats.total} (${Math.round(stats.withPhone/stats.total*100)}%)`);
  console.log(`   With hours:    ${stats.withHours} / ${stats.total} (${Math.round(stats.withHours/stats.total*100)}%)`);
  console.log(`   With photos:   ${stats.withPhotos} / ${stats.total} (${Math.round(stats.withPhotos/stats.total*100)}%)`);
  console.log(`   With address:  ${stats.withAddress} / ${stats.total} (${Math.round(stats.withAddress/stats.total*100)}%)`);
}

async function getDataStats() {
  const total = await prisma.goldenRecord.count();
  
  const withPhone = await prisma.goldenRecord.count({
    where: { phone: { not: null } }
  });
  
  const withHours = await prisma.goldenRecord.count({
    where: { hours: { not: null } }
  });
  
  const withPhotos = await prisma.goldenRecord.count({
    where: { photos: { not: null } }
  });
  
  const withAddress = await prisma.goldenRecord.count({
    where: { address: { not: null } }
  });

  return { total, withPhone, withHours, withPhotos, withAddress };
}

async function main() {
  try {
    await enrichGoldenRecords();
  } catch (error) {
    console.error('Enrichment failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
