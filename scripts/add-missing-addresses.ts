#!/usr/bin/env node
/**
 * Add Missing Addresses
 *
 * For places with phone/neighborhood but no address, searches Google
 * and adds the missing address data.
 *
 * Usage:
 *   npm run add:missing-addresses             # dry run
 *   npm run add:missing-addresses -- --execute # apply changes
 *   npm run add:missing-addresses -- --limit 10 # test first 10
 */

import { PrismaClient } from '@prisma/client';
import { searchPlace, getPlaceDetails } from '@/lib/google-places';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');
const LIMIT = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1] || '10', 10)
  : undefined;
const RATE_LIMIT_MS = 150;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function addMissingAddresses() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set');
    process.exit(1);
  }

  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  // Get places with phone/neighborhood but no address
  const places = await prisma.places.findMany({
    where: {
      id: { in: curatedIds },
      address: null,
      latitude: 0,
      longitude: 0,
      OR: [
        { phone: { not: null } },
        { neighborhood: { not: null } },
      ],
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
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('ADD MISSING ADDRESSES');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Found ${places.length} places needing addresses`);
  console.log(`Mode: ${DRY_RUN ? '⚠️  DRY RUN' : '✅ LIVE UPDATE'}`);
  if (LIMIT) console.log(`Limit: First ${LIMIT} places`);
  console.log('');

  let found = 0;
  let duplicate = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const progress = `[${i + 1}/${places.length}]`;
    
    console.log(`${progress} ${place.name} ${place.neighborhood ? `(${place.neighborhood})` : ''}...`);

    try {
      // Build search query
      const searchQuery = place.neighborhood
        ? `${place.name} ${place.neighborhood}`
        : place.phone
          ? `${place.name} ${place.phone}`
          : `${place.name} Los Angeles`;

      // Search for place
      const results = await searchPlace(searchQuery, { maxResults: 1 });
      const placeId = results[0]?.placeId;

      if (!placeId) {
        console.log(`${progress}   ❌ Not found`);
        notFound++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      // Check if Place ID already exists (duplicate)
      const existingPlace = await prisma.places.findUnique({
        where: { googlePlaceId: placeId },
        select: { id: true, slug: true, name: true },
      });

      if (existingPlace && existingPlace.id !== place.id) {
        console.log(`${progress}   ⚠️  Duplicate of: ${existingPlace.name} (${existingPlace.slug})`);
        duplicate++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      // Get full place details
      const details = await getPlaceDetails(placeId);
      
      if (!details) {
        console.log(`${progress}   ❌ Could not get details`);
        notFound++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      console.log(`${progress}   ✅ Found: ${details.formattedAddress}`);
      
      if (!DRY_RUN) {
        await prisma.places.update({
          where: { id: place.id },
          data: {
            googlePlaceId: placeId,
            address: details.formattedAddress,
            latitude: details.location.lat,
            longitude: details.location.lng,
            placesDataCachedAt: null, // Reset so full enrichment can run
          },
        });
      }

      found++;
    } catch (error) {
      console.log(`${progress}   ⚠️  Error: ${error instanceof Error ? error.message : String(error)}`);
      errors++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`Total processed: ${places.length}`);
  console.log(`✅ Found addresses: ${found} (${Math.round((found / places.length) * 100)}%)`);
  console.log(`⚠️  Duplicates: ${duplicate} (${Math.round((duplicate / places.length) * 100)}%)`);
  console.log(`❌ Not found: ${notFound} (${Math.round((notFound / places.length) * 100)}%)`);
  if (errors > 0) {
    console.log(`⚠️  Errors: ${errors}`);
  }

  console.log('\n💡 NEXT STEPS:\n');
  
  if (DRY_RUN) {
    console.log('1. Review results above');
    console.log('2. Run with --execute to apply changes:');
    console.log('   npm run add:missing-addresses -- --execute\n');
  } else {
    console.log(`✅ Added addresses to ${found} places\n`);
    console.log('Run backfill to complete enrichment:');
    console.log('   npm run backfill:google\n');
    console.log('Then audit:');
    console.log('   npm run enrich:audit:curated\n');
  }
}

addMissingAddresses()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
