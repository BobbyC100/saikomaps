#!/usr/bin/env node
/**
 * Backfill County Data
 *
 * Fetches county information from Google Places API for all places with Place IDs.
 * Writes progress to backfill-county-progress.json and failures to backfill-county-failures.ndjson
 *
 * Usage:
 *   npm run backfill:county                    # dry run, 100ms delay
 *   npm run backfill:county -- --execute       # live run, 100ms delay
 *   npm run backfill:county -- --delay-ms 250  # slower rate limiting
 */

import { PrismaClient } from '@prisma/client';
import { getPlaceDetails } from '@/lib/google-places';
import { writeFileSync, appendFileSync } from 'fs';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');
const DELAY_MS = process.argv.includes('--delay-ms')
  ? parseInt(process.argv[process.argv.indexOf('--delay-ms') + 1] || '100', 10)
  : 100;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProgressReport {
  timestamp: string;
  total: number;
  processed: number;
  updated: number;
  unchanged: number;
  errors: number;
  estimatedSecondsRemaining: number;
}

async function backfillCounty() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('BACKFILL COUNTY DATA');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set');
    process.exit(1);
  }

  // Get places with Place IDs but missing county
  const places = await prisma.places.findMany({
    where: {
      googlePlaceId: { not: null },
      county: null,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      googlePlaceId: true,
      city: true,
      state: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${places.length} places needing county data`);
  console.log(`Mode: ${DRY_RUN ? '⚠️  DRY RUN' : '✅ LIVE UPDATE'}`);
  console.log(`Rate limit: ${DELAY_MS}ms between requests`);
  console.log(`Estimated time: ~${Math.ceil((places.length * DELAY_MS) / 1000 / 60)} minutes`);
  console.log(`Estimated cost: $${(places.length * 0.017).toFixed(2)}\n`);

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  // Clear progress file
  const progressFile = 'backfill-county-progress.json';
  const failuresFile = 'backfill-county-failures.ndjson';
  if (!DRY_RUN) {
    writeFileSync(progressFile, '');
    writeFileSync(failuresFile, '');
  }

  const startTime = Date.now();

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const progress = `[${i + 1}/${places.length}]`;

    try {
      // Fetch place details from Google
      const details = await getPlaceDetails(place.googlePlaceId!);

      if (!details) {
        console.log(`${progress} ${place.name} - ⚠️  Not found`);
        if (!DRY_RUN) {
          appendFileSync(
            failuresFile,
            JSON.stringify({ place: place.name, reason: 'not_found' }) + '\n'
          );
        }
        errors++;
        await sleep(DELAY_MS);
        continue;
      }

      if (!details.county) {
        console.log(`${progress} ${place.name} - ⚠️  No county data`);
        unchanged++;
        await sleep(DELAY_MS);
        continue;
      }

      console.log(`${progress} ${place.name} - ✅ ${details.county}`);

      if (!DRY_RUN) {
        await prisma.places.update({
          where: { id: place.id },
          data: { county: details.county },
        });
      }

      updated++;

      // Write progress every 10 places
      if (!DRY_RUN && (updated % 10 === 0 || i === places.length - 1)) {
        const elapsed = Date.now() - startTime;
        const avgTimePerPlace = elapsed / (i + 1);
        const remaining = places.length - (i + 1);
        const estimatedSecondsRemaining = Math.ceil((remaining * avgTimePerPlace) / 1000);

        const progressReport: ProgressReport = {
          timestamp: new Date().toISOString(),
          total: places.length,
          processed: i + 1,
          updated,
          unchanged,
          errors,
          estimatedSecondsRemaining,
        };

        writeFileSync(progressFile, JSON.stringify(progressReport, null, 2));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`${progress} ${place.name} - ⚠️  Error: ${errorMsg}`);
      
      if (!DRY_RUN) {
        appendFileSync(
          failuresFile,
          JSON.stringify({ place: place.name, error: errorMsg }) + '\n'
        );
      }
      errors++;
    }

    await sleep(DELAY_MS);
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`Total processed: ${places.length}`);
  console.log(`✅ Updated: ${updated} (${Math.round((updated / places.length) * 100)}%)`);
  console.log(`✓ Unchanged: ${unchanged} (${Math.round((unchanged / places.length) * 100)}%)`);
  if (errors > 0) {
    console.log(`⚠️  Errors: ${errors}`);
  }

  if (DRY_RUN) {
    console.log('\n💡 NEXT STEPS:\n');
    console.log('1. Review the results above');
    console.log('2. Run with --execute to apply changes:');
    console.log('   npm run backfill:county -- --execute\n');
  } else {
    console.log('\n✅ BACKFILL COMPLETE\n');
    console.log(`Updated ${updated} places with county data\n`);
    console.log('Progress saved to: backfill-county-progress.json');
    if (errors > 0) {
      console.log('Failures saved to: backfill-county-failures.ndjson');
    }
    console.log('\nNext step: Run scope/region migration:');
    console.log('   npm run migrate:scope\n');
  }
}

backfillCounty()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
