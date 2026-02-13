#!/usr/bin/env node
/**
 * Recover Unrecoverable Places with Deduplication
 *
 * Attempts to find Google Place IDs for the 107 "unrecoverable" places
 * (no address, 0,0 coords) and handles duplicates appropriately.
 *
 * Usage:
 *   npm run recover:unrecoverable              # dry run
 *   npm run recover:unrecoverable -- --execute # apply changes
 *   npm run recover:unrecoverable -- --delete-duplicates # delete found duplicates
 */

import { PrismaClient } from '@prisma/client';
import { searchPlace } from '@/lib/google-places';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');
const DELETE_DUPLICATES = process.argv.includes('--delete-duplicates');
const RATE_LIMIT_MS = 100;

interface RecoveryResult {
  place: {
    id: string;
    slug: string;
    name: string;
    neighborhood: string | null;
  };
  placeId: string | null;
  status: 'found_new' | 'found_duplicate' | 'not_found' | 'error';
  duplicateOf?: {
    id: string;
    slug: string;
    name: string;
  };
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recoverUnrecoverableWithDedup() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set. Add it to .env or .env.local');
    process.exit(1);
  }

  // Get curated place IDs
  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  // Get unrecoverable places
  const unrecoverable = await prisma.places.findMany({
    where: {
      id: { in: curatedIds },
      googlePlaceId: null,
      address: null,
      latitude: 0,
      longitude: 0,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      neighborhood: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('RECOVER UNRECOVERABLE PLACES WITH DEDUPLICATION');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Found ${unrecoverable.length} unrecoverable places to process`);
  console.log(`Mode: ${DRY_RUN ? '⚠️  DRY RUN' : '✅ LIVE UPDATE'}`);
  console.log(`Duplicate action: ${DELETE_DUPLICATES ? 'DELETE' : 'SKIP'}`);
  console.log('');

  const results: RecoveryResult[] = [];
  let foundNew = 0;
  let foundDuplicate = 0;
  let notFound = 0;
  let errors = 0;
  let deleted = 0;

  for (let i = 0; i < unrecoverable.length; i++) {
    const place = unrecoverable[i];
    const progress = `[${i + 1}/${unrecoverable.length}]`;
    
    console.log(`${progress} Searching: ${place.name} ${place.neighborhood ? `(${place.neighborhood})` : ''}...`);

    try {
      // Build search query
      const searchQuery = place.neighborhood
        ? `${place.name} ${place.neighborhood}`
        : `${place.name} Los Angeles`;

      // Search for Place ID
      const searchResults = await searchPlace(searchQuery, {
        maxResults: 1,
      });

      const placeId = searchResults[0]?.placeId || null;

      if (placeId) {
        // Check if Place ID already exists (duplicate detection)
        const existingPlace = await prisma.places.findUnique({
          where: { googlePlaceId: placeId },
          select: {
            id: true,
            slug: true,
            name: true,
          },
        });

        if (existingPlace && existingPlace.id !== place.id) {
          console.log(`${progress}   ⚠️  Duplicate of: ${existingPlace.name} (${existingPlace.slug})`);

          if (DELETE_DUPLICATES && !DRY_RUN) {
            // Delete the duplicate place
            await prisma.provenance.deleteMany({ where: { place_id: place.id } });
            await prisma.places.delete({ where: { id: place.id } });
            console.log(`${progress}   ✅ Deleted duplicate`);
            deleted++;
          }

          results.push({
            place,
            placeId,
            status: 'found_duplicate',
            duplicateOf: existingPlace,
          });
          foundDuplicate++;
        } else {
          console.log(`${progress}   ✅ Found Place ID: ${placeId}`);

          if (!DRY_RUN) {
            await prisma.places.update({
              where: { id: place.id },
              data: {
                googlePlaceId: placeId,
                placesDataCachedAt: null, // Reset so backfill can enrich
              },
            });
          }

          results.push({
            place,
            placeId,
            status: 'found_new',
          });
          foundNew++;
        }
      } else {
        console.log(`${progress}   ❌ Not found`);
        results.push({
          place,
          placeId: null,
          status: 'not_found',
        });
        notFound++;
      }
    } catch (error) {
      console.log(`${progress}   ⚠️  Error: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        place,
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
  console.log(`Total processed: ${unrecoverable.length}`);
  console.log(`✅ Found (new): ${foundNew} (${Math.round((foundNew / unrecoverable.length) * 100)}%)`);
  console.log(`⚠️  Found (duplicate): ${foundDuplicate} (${Math.round((foundDuplicate / unrecoverable.length) * 100)}%)`);
  console.log(`❌ Not found: ${notFound} (${Math.round((notFound / unrecoverable.length) * 100)}%)`);
  if (errors > 0) {
    console.log(`⚠️  Errors: ${errors}`);
  }
  if (DELETE_DUPLICATES && !DRY_RUN) {
    console.log(`🗑️  Deleted duplicates: ${deleted}`);
  }

  // List duplicates
  const duplicates = results.filter((r) => r.status === 'found_duplicate');
  if (duplicates.length > 0 && duplicates.length <= 20) {
    console.log('\n⚠️  Duplicate places found:');
    duplicates.forEach((r) => {
      console.log(`   - ${r.place.name} → duplicate of ${r.duplicateOf?.name}`);
    });
  } else if (duplicates.length > 20) {
    console.log(`\n⚠️  ${duplicates.length} duplicates found (see export file)`);
  }

  // Export results
  const exportPath = path.join(process.cwd(), 'logs', 'unrecoverable-recovery-results.json');
  
  const logsDir = path.dirname(exportPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(
    exportPath,
    JSON.stringify(
      {
        summary: {
          total: unrecoverable.length,
          foundNew,
          foundDuplicate,
          notFound,
          errors,
          deleted: DELETE_DUPLICATES && !DRY_RUN ? deleted : 0,
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
    if (foundDuplicate > 0) {
      console.log(`2. Found ${foundDuplicate} duplicates - to delete them, run:`);
      console.log('   npm run recover:unrecoverable -- --execute --delete-duplicates\n');
    }
    if (foundNew > 0) {
      console.log(`3. Found ${foundNew} new places - to add Place IDs, run:`);
      console.log('   npm run recover:unrecoverable -- --execute\n');
    }
  } else {
    if (foundNew > 0) {
      console.log('✅ Place IDs have been added to new places\n');
      console.log('Run backfill to enrich these places:');
      console.log('   npm run backfill:google\n');
    }
    if (DELETE_DUPLICATES && deleted > 0) {
      console.log(`✅ Deleted ${deleted} duplicate places\n`);
    }
    console.log('Check final coverage:');
    console.log('   npm run enrich:audit:curated\n');
  }
}

recoverUnrecoverableWithDedup()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
