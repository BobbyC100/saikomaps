#!/usr/bin/env node
/**
 * Recover Ghost Entries via Google Places Search
 *
 * Automatically searches for ghost entries (0,0 coords, no address) by name
 * and attempts to recover their Place IDs from Google Places API.
 *
 * Usage:
 *   npm run recover:ghosts              # dry run
 *   npm run recover:ghosts -- --execute # apply changes
 *   npm run recover:ghosts -- --limit 10 # test with first 10
 */

import { PrismaClient } from '@prisma/client';
import { searchPlace } from '@/lib/google-places';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');
const LIMIT = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1] || '10', 10)
  : undefined;
const RATE_LIMIT_MS = 100; // 10 requests per second

interface RecoveryResult {
  place: {
    id: string;
    slug: string;
    name: string;
    neighborhood: string | null;
  };
  placeId: string | null;
  status: 'found' | 'not_found' | 'error';
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recoverGhostEntries() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set. Add it to .env or .env.local');
    process.exit(1);
  }

  // Get curated place IDs
  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  // Get ghost entries (0,0 coords, no address)
  const ghostsQuery = {
    where: {
      id: { in: curatedIds },
      latitude: 0,
      longitude: 0,
      address: null,
      googlePlaceId: null, // Only process places without Place IDs
    },
    select: {
      id: true,
      slug: true,
      name: true,
      neighborhood: true,
    },
    orderBy: { name: 'asc' as const },
    ...(LIMIT ? { take: LIMIT } : {}),
  };

  const ghosts = await prisma.places.findMany(ghostsQuery);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('GHOST ENTRY RECOVERY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Found ${ghosts.length} ghost entries to recover`);
  console.log(`Mode: ${DRY_RUN ? '⚠️  DRY RUN' : '✅ LIVE UPDATE'}`);
  if (LIMIT) console.log(`Limit: First ${LIMIT} places`);
  console.log('');

  const results: RecoveryResult[] = [];
  let found = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < ghosts.length; i++) {
    const ghost = ghosts[i];
    const progress = `[${i + 1}/${ghosts.length}]`;
    
    console.log(`${progress} Searching: ${ghost.name} ${ghost.neighborhood ? `(${ghost.neighborhood})` : ''}...`);

    try {
      // Build search query
      const searchQuery = ghost.neighborhood
        ? `${ghost.name} ${ghost.neighborhood}`
        : `${ghost.name} Los Angeles`;

      // Use existing searchPlace function from lib
      const results = await searchPlace(searchQuery, {
        maxResults: 1,
      });

      const placeId = results[0]?.placeId || null;

      if (placeId) {
        // Check if Place ID already exists (duplicate detection)
        const existingPlace = await prisma.places.findUnique({
          where: { googlePlaceId: placeId },
        });

        if (existingPlace && existingPlace.id !== ghost.id) {
          console.log(`${progress}   ⚠️  Duplicate of: ${existingPlace.name} (${existingPlace.slug})`);
          
          results.push({
            place: ghost,
            placeId,
            status: 'error',
            error: `Duplicate of ${existingPlace.slug}`,
          });
          errors++;
        } else {
          console.log(`${progress}   ✅ Found Place ID: ${placeId}`);

          if (!DRY_RUN) {
            await prisma.places.update({
              where: { id: ghost.id },
              data: {
                googlePlaceId: placeId,
                // Reset placesDataCachedAt so backfill can enrich it
                placesDataCachedAt: null,
              },
            });
          }

          results.push({
            place: ghost,
            placeId,
            status: 'found',
          });
          found++;
        }
      } else {
        console.log(`${progress}   ❌ Not found`);
        results.push({
          place: ghost,
          placeId: null,
          status: 'not_found',
        });
        notFound++;
      }
    } catch (error) {
      console.log(`${progress}   ⚠️  Error: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        place: ghost,
        placeId: null,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      errors++;
    }

    // Rate limiting
    await sleep(RATE_LIMIT_MS);
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 RECOVERY SUMMARY\n');
  console.log(`Total processed: ${ghosts.length}`);
  console.log(`✅ Found: ${found} (${Math.round((found / ghosts.length) * 100)}%)`);
  console.log(`❌ Not found: ${notFound} (${Math.round((notFound / ghosts.length) * 100)}%)`);
  if (errors > 0) {
    console.log(`⚠️  Errors: ${errors}`);
  }

  // Not found list
  const notFoundPlaces = results.filter((r) => r.status === 'not_found');
  if (notFoundPlaces.length > 0 && notFoundPlaces.length <= 20) {
    console.log('\n❌ Could not find Place IDs for:');
    notFoundPlaces.forEach((r) => {
      console.log(`   - ${r.place.name} (${r.place.slug})`);
    });
  } else if (notFoundPlaces.length > 20) {
    console.log(`\n❌ ${notFoundPlaces.length} places could not be found (see export file)`);
  }

  // Export results
  const fs = require('fs');
  const path = require('path');
  const exportPath = path.join(process.cwd(), 'logs', 'ghost-recovery-results.json');
  
  const logsDir = path.dirname(exportPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(
    exportPath,
    JSON.stringify(
      {
        summary: {
          total: ghosts.length,
          found,
          notFound,
          errors,
          successRate: Math.round((found / ghosts.length) * 100),
          dryRun: DRY_RUN,
          timestamp: new Date().toISOString(),
        },
        results,
      },
      null,
      2
    )
  );

  console.log(`\n📄 Results exported to: ${exportPath}`);

  // Next steps
  console.log('\n' + '═'.repeat(80));
  console.log('\n💡 NEXT STEPS:\n');

  if (DRY_RUN) {
    console.log('1. Review the results above');
    console.log('2. If satisfied, run with --execute to apply changes:');
    console.log('   npm run recover:ghosts -- --execute\n');
  } else {
    console.log('✅ Place IDs have been added to the database\n');
    console.log('Run the backfill script to enrich these places with full details:');
    console.log('   npm run backfill:google\n');
    console.log('Then check coverage:');
    console.log('   npm run enrich:audit:curated\n');
  }
}

recoverGhostEntries()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
