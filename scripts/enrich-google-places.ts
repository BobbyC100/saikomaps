#!/usr/bin/env node
/**
 * Google Places Data Enrichment
 * 
 * Backfills missing data from Google Places API:
 * - Phone numbers
 * - Hours
 * - Photos
 * - Categories
 * - Address details
 * - Coordinates (lat/lng)
 * 
 * Usage: npm run enrich:google [--dry-run] [--limit=100]
 * 
 * Requires: GOOGLE_MAPS_API_KEY in .env or .env.local
 */

// Load environment variables from .env and .env.local
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

interface GooglePlaceDetails {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text?: string[];
    periods?: any[];
  };
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  types?: string[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

async function fetchPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not found in environment');
  }
  
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,photos,types,geometry&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.result;
    } else {
      console.error(`Google Places API error for ${placeId}:`, data.status);
      return null;
    }
  } catch (error) {
    console.error(`Failed to fetch place ${placeId}:`, error);
    return null;
  }
}

async function enrichPlaces() {
  console.log('🔍 Google Places Data Enrichment\n');
  
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error('❌ GOOGLE_MAPS_API_KEY not found in .env');
    console.error('Get an API key: https://console.cloud.google.com/apis/credentials');
    process.exit(1);
  }
  
  if (isDryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made\n');
  }
  
  // Find places needing enrichment (LA County only)
  const placesToEnrich = await prisma.golden_records.findMany({
    where: {
      google_place_id: { not: null },
      county: 'Los Angeles', // Focus on LA County only
      OR: [
        { enriched_at: null }, // Not yet enriched
        { lat: 0 }, // Has 0,0 coords (needs re-enrichment)
        { lng: 0 },
        { phone: null }, // Missing data
      ],
    },
    take: limit,
    select: {
      canonical_id: true,
      name: true,
      google_place_id: true,
      phone: true,
      neighborhood: true,
      county: true,
      lat: true,
      lng: true,
    }
  });
  
  console.log(`Found ${placesToEnrich.length} places needing enrichment (limit: ${limit})\n`);
  
  if (placesToEnrich.length === 0) {
    console.log('✅ All places with Google Place IDs are fully enriched!');
    return;
  }
  
  let enriched = 0;
  let failed = 0;
  
  for (const place of placesToEnrich) {
    try {
      console.log(`Enriching: ${place.name} (${place.neighborhood || 'no neighborhood'})`);
      
      const details = await fetchPlaceDetails(place.google_place_id!);
      
      const updates: any = {
        enriched_at: new Date(), // Always mark as attempted
      };
      
      if (!details) {
        // API failed, but still mark as enriched to avoid retry
        if (!isDryRun) {
          await prisma.golden_records.update({
            where: { canonical_id: place.canonical_id },
            data: updates
          });
        }
        failed++;
        continue;
      }
      
      // Coordinates - FIX for 0,0 bug
      if (details.geometry?.location) {
        const currentLat = Number(place.lat);
        const currentLng = Number(place.lng);
        if (currentLat === 0 || currentLng === 0 || !place.lat || !place.lng) {
          updates.lat = details.geometry.location.lat;
          updates.lng = details.geometry.location.lng;
          console.log(`  ✓ Coords: ${details.geometry.location.lat}, ${details.geometry.location.lng}`);
        }
      }
      
      // Phone
      if (!place.phone && details.formatted_phone_number) {
        updates.phone = details.formatted_phone_number;
        console.log(`  ✓ Phone: ${details.formatted_phone_number}`);
      }
      
      // Hours
      if (details.opening_hours) {
        updates.hours_json = details.opening_hours;
        console.log(`  ✓ Hours: ${details.opening_hours.weekday_text?.length || 0} periods`);
      }
      
      // Update with enriched data
      if (!isDryRun) {
        await prisma.golden_records.update({
          where: { canonical_id: place.canonical_id },
          data: updates
        });
      }
      
      enriched++;
      
      // Rate limiting - Google allows 50 req/sec, we'll do 20/sec to be safe
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error: any) {
      console.error(`✗ Failed to enrich ${place.name}:`, error.message);
      
      // Still mark as enriched even on error
      if (!isDryRun) {
        try {
          await prisma.golden_records.update({
            where: { canonical_id: place.canonical_id },
            data: { enriched_at: new Date() }
          });
        } catch (e) {
          console.error(`  Could not mark as enriched: ${e}`);
        }
      }
      
      failed++;
    }
  }
  
  console.log(`\n✅ Enrichment complete!`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Failed: ${failed}`);
  
  if (!isDryRun && enriched > 0) {
    console.log(`\n🔄 Run sync:places to push updates to public site:`);
    console.log(`   npm run sync:places`);
  }
}

async function main() {
  try {
    await enrichPlaces();
  } catch (error) {
    console.error('Error during enrichment:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
