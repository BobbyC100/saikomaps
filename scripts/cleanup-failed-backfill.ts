#!/usr/bin/env node
/**
 * Cleanup Failed Backfill Attempts
 *
 * Removes places that:
 * 1. Have placesDataCachedAt set (marked as attempted)
 * 2. Still have no googlePlaceId (backfill failed)
 * 3. Are duplicates of existing places that DO have googlePlaceId
 *
 * These are "cross-set duplicates" - places in the backfill queue that duplicate
 * places that are already enriched with Google data.
 *
 * Usage:
 *   npm run cleanup:failed-backfill             # dry run
 *   npm run cleanup:failed-backfill -- --execute   # delete
 *   npm run cleanup:failed-backfill -- --force     # delete even if used in maps
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXECUTE = process.argv.includes('--execute');
const FORCE = process.argv.includes('--force');

// Inline similarity functions
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAddress(addr: string | null | undefined): string {
  if (!addr) return '';
  return addr
    .toLowerCase()
    .replace(/[,#.\s]+/g, ' ')
    .replace(/\b(ave|avenue|blvd|street|st|rd|dr|way|ln|pl|ct)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenSort(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function levenshtein(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let last = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let nc = costs[j - 1];
        if (s1[i - 1] !== s2[j - 1]) nc = Math.min(nc, last, costs[j]) + 1;
        costs[j - 1] = last;
        last = nc;
      }
    }
    if (i > 0) costs[s2.length] = last;
  }
  return costs[s2.length];
}

function similarityPercent(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;
  const t1 = tokenSort(str1);
  const t2 = tokenSort(str2);
  const maxLen = Math.max(t1.length, t2.length);
  if (maxLen === 0) return 100;
  const dist = levenshtein(t1, t2);
  return Math.round((1 - dist / maxLen) * 100);
}

async function main() {
  console.log('\n🧹 Cleanup Failed Backfill Attempts\n');
  console.log('(Removes failed backfill attempts that are duplicates of enriched places)\n');

  if (!EXECUTE) {
    console.log('⚠️  DRY RUN MODE — No changes will be made');
    console.log('   Run with --execute to apply\n');
  }

  // Get places that failed backfill (have placesDataCachedAt but no googlePlaceId)
  const failedPlaces = await prisma.places.findMany({
    where: {
      placesDataCachedAt: { not: null },
      googlePlaceId: null,
    },
    include: {
      map_places: {
        include: {
          lists: { select: { title: true, slug: true } },
        },
      },
      viewer_bookmarks: true,
    },
  });

  console.log(`Found ${failedPlaces.length} failed backfill attempts\n`);

  if (failedPlaces.length === 0) {
    console.log('✅ No failed backfill attempts to clean up.\n');
    return;
  }

  // Get all places with Google Place IDs
  const enrichedPlaces = await prisma.places.findMany({
    where: {
      googlePlaceId: { not: null },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      neighborhood: true,
      googlePlaceId: true,
    },
  });

  console.log(`Comparing against ${enrichedPlaces.length} enriched places...\n`);
  console.log('═'.repeat(80));

  let toDelete = 0;
  let toSkip = 0;
  let deleted = 0;

  for (const failedPlace of failedPlaces) {
    // Find matching enriched place
    let bestMatch: (typeof enrichedPlaces)[0] | null = null;
    let bestScore = 0;

    for (const enrichedPlace of enrichedPlaces) {
      const nameSim = similarityPercent(
        normalizeName(failedPlace.name),
        normalizeName(enrichedPlace.name)
      );

      let addrSim = 100;
      if (failedPlace.address && enrichedPlace.address) {
        addrSim = similarityPercent(
          normalizeAddress(failedPlace.address),
          normalizeAddress(enrichedPlace.address)
        );
      } else if (failedPlace.address || enrichedPlace.address) {
        // One has address, one doesn't - allow match if name is very strong
        addrSim = nameSim >= 95 ? 100 : 50;
      }

      // Match if name is very similar and address matches (or both missing/name very strong)
      if (nameSim >= 85 && addrSim >= 75) {
        const score = nameSim + addrSim;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = enrichedPlace;
        }
      }
    }

    if (bestMatch) {
      console.log(`\n❌ "${failedPlace.name}" (${failedPlace.slug})`);
      console.log(`   → Duplicate of: "${bestMatch.name}" (${bestMatch.slug})`);
      console.log(`   → Similarity: ${Math.round(bestScore / 2)}%`);
      console.log(`   → Maps: ${failedPlace.map_places.length} | Bookmarks: ${failedPlace.viewer_bookmarks.length}`);

      // Check if used in maps
      if (failedPlace.map_places.length > 0 && !FORCE) {
        console.log(`   ⚠️  SKIP: Used in ${failedPlace.map_places.length} map(s) (use --force to override)`);
        toSkip++;
        continue;
      }

      toDelete++;

      if (EXECUTE) {
        try {
          // Migrate map_places
          if (failedPlace.map_places.length > 0) {
            console.log(`   Migrating ${failedPlace.map_places.length} map reference(s)...`);
            for (const mp of failedPlace.map_places) {
              const existing = await prisma.map_places.findUnique({
                where: {
                  mapId_placeId: { mapId: mp.mapId, placeId: bestMatch.id },
                },
              });

              if (existing) {
                await prisma.map_places.delete({ where: { id: mp.id } });
              } else {
                await prisma.map_places.update({
                  where: { id: mp.id },
                  data: { placeId: bestMatch.id },
                });
              }
            }
          }

          // Migrate bookmarks
          if (failedPlace.viewer_bookmarks.length > 0) {
            console.log(`   Migrating ${failedPlace.viewer_bookmarks.length} bookmark(s)...`);
            for (const bm of failedPlace.viewer_bookmarks) {
              if (!bm.viewerUserId) {
                await prisma.viewer_bookmarks.delete({ where: { id: bm.id } });
                continue;
              }
              const existing = await prisma.viewer_bookmarks.findUnique({
                where: {
                  viewerUserId_placeId: {
                    viewerUserId: bm.viewerUserId,
                    placeId: bestMatch.id,
                  },
                },
              });
              if (existing) {
                await prisma.viewer_bookmarks.delete({ where: { id: bm.id } });
              } else {
                await prisma.viewer_bookmarks.update({
                  where: { id: bm.id },
                  data: { placeId: bestMatch.id },
                });
              }
            }
          }

          // Delete provenance
          await prisma.provenance.deleteMany({ where: { place_id: failedPlace.id } });

          // Delete place
          await prisma.places.delete({ where: { id: failedPlace.id } });
          deleted++;
          console.log(`   ✅ Deleted`);
        } catch (error) {
          console.error(`   ❌ Error:`, error);
        }
      }
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 Summary:');
  
  if (EXECUTE) {
    console.log(`   ✅ Deleted: ${deleted} duplicate place(s)`);
    if (toSkip > 0) {
      console.log(`   ⏭️  Skipped: ${toSkip} place(s) (used in maps, use --force)`);
    }
    const notMatched = failedPlaces.length - deleted - toSkip;
    if (notMatched > 0) {
      console.log(`   ℹ️  No match: ${notMatched} place(s) (not duplicates)`);
    }
  } else {
    console.log(`   Would delete: ${toDelete} duplicate place(s)`);
    if (toSkip > 0) {
      console.log(`   Would skip: ${toSkip} place(s) (used in maps, add --force)`);
    }
    const notMatched = failedPlaces.length - toDelete - toSkip;
    if (notMatched > 0) {
      console.log(`   No match: ${notMatched} place(s) (not duplicates of enriched places)`);
    }
  }

  console.log('\n💡 Next step:');
  if (!EXECUTE) {
    console.log(`   npm run cleanup:failed-backfill -- --execute`);
  } else {
    console.log(`   npm run enrich:audit:curated`);
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
