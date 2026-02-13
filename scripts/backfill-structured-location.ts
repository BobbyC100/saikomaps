#!/usr/bin/env node
/**
 * Backfill Structured Location Data
 *
 * For places with Google Place IDs but missing ZIP/city/state/country,
 * fetches Place Details from Google and populates the structured location fields.
 *
 * Usage:
 *   npm run backfill:location               # dry run
 *   npm run backfill:location -- --execute  # apply changes
 *   npm run backfill:location -- --limit 10 # test first 10
 */

import { PrismaClient } from '@prisma/client';
import { getPlaceDetails } from '@/lib/google-places';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');
const LIMIT = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1] || '10', 10)
  : undefined;
const RATE_LIMIT_MS = 150; // 150ms between requests

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillStructuredLocation() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('BACKFILL STRUCTURED LOCATION DATA');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set');
    process.exit(1);
  }

  // Get places with Place IDs but missing structured location data
  const places = await prisma.places.findMany({
    where: {
      googlePlaceId: { not: null },
      OR: [
        { zip: null },
        { city: null },
        { state: null },
        { country: null },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      googlePlaceId: true,
      zip: true,
      city: true,
      state: true,
      country: true,
    },
    orderBy: { name: 'asc' },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  console.log(`Found ${places.length} places needing location data`);
  console.log(`Mode: ${DRY_RUN ? '⚠️  DRY RUN' : '✅ LIVE UPDATE'}`);
  if (LIMIT) console.log(`Limit: First ${LIMIT} places`);
  console.log('');

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  const updates: Array<{
    name: string;
    zip?: string;
    city?: string;
    state?: string;
    country?: string;
  }> = [];

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const progress = `[${i + 1}/${places.length}]`;

    console.log(`${progress} ${place.name}...`);

    try {
      // Fetch place details from Google
      const details = await getPlaceDetails(place.googlePlaceId!);

      if (!details) {
        console.log(`${progress}   ⚠️  Place not found on Google`);
        errors++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      // Check if any new data available
      const hasNewData =
        (details.zip && details.zip !== place.zip) ||
        (details.city && details.city !== place.city) ||
        (details.state && details.state !== place.state) ||
        (details.country && details.country !== place.country);

      if (!hasNewData) {
        console.log(`${progress}   ✓ Already has complete data`);
        unchanged++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      // Display what we found
      const found: string[] = [];
      if (details.zip && !place.zip) found.push(`ZIP: ${details.zip}`);
      if (details.city && !place.city) found.push(`City: ${details.city}`);
      if (details.state && !place.state) found.push(`State: ${details.state}`);
      if (details.country && !place.country) found.push(`Country: ${details.country}`);

      console.log(`${progress}   ✅ ${found.join(', ')}`);

      updates.push({
        name: place.name,
        zip: details.zip,
        city: details.city,
        state: details.state,
        country: details.country,
      });

      if (!DRY_RUN) {
        await prisma.places.update({
          where: { id: place.id },
          data: {
            zip: details.zip || place.zip,
            city: details.city || place.city,
            state: details.state || place.state,
            country: details.country || place.country,
          },
        });
      }

      updated++;
    } catch (error) {
      console.log(
        `${progress}   ⚠️  Error: ${error instanceof Error ? error.message : String(error)}`
      );
      errors++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`Total processed: ${places.length}`);
  console.log(`✅ Updated: ${updated} (${Math.round((updated / places.length) * 100)}%)`);
  console.log(`✓ Already complete: ${unchanged} (${Math.round((unchanged / places.length) * 100)}%)`);
  if (errors > 0) {
    console.log(`⚠️  Errors: ${errors}`);
  }

  if (DRY_RUN) {
    console.log('\n💡 NEXT STEPS:\n');
    console.log('1. Review the results above');
    console.log('2. Run with --execute to apply changes:');
    console.log('   npm run backfill:location -- --execute\n');
    console.log('Estimated cost: $' + (updated * 0.017).toFixed(2));
    console.log(`Estimated time: ${Math.ceil((updated * RATE_LIMIT_MS) / 1000 / 60)} minutes\n`);
  } else {
    console.log('\n✅ BACKFILL COMPLETE\n');
    console.log(`Updated ${updated} places with structured location data\n`);
    console.log('Next step: Run scope tagging:');
    console.log('   npm run tag:scopes -- --dry-run\n');
  }

  // Export updates for review
  if (updates.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('location-updates.json', JSON.stringify(updates, null, 2));
    console.log('Updates exported to location-updates.json\n');
  }
}

backfillStructuredLocation()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
