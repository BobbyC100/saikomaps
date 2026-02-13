#!/usr/bin/env node
/**
 * Cleanup Backfill Duplicates
 *
 * Identifies and removes duplicate places that would collide on google_place_id
 * during backfill, BEFORE running the backfill.
 *
 * Uses the same scoring system as cleanup-duplicate-places:
 * - Keeps the place with most maps, bookmarks, and enrichment
 * - Deletes lower-scored duplicates
 *
 * Usage:
 *   npm run cleanup:backfill-duplicates             # dry run (shows what would be deleted)
 *   npm run cleanup:backfill-duplicates -- --execute   # actually delete
 *   npm run cleanup:backfill-duplicates -- --force     # also delete if used in maps
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXECUTE = process.argv.includes('--execute');
const FORCE = process.argv.includes('--force');
const CURATED_ONLY = !process.argv.includes('--all');

// Inline similarity functions to avoid jsdom dependency issues
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

function normalizeForSearch(name: string, address: string | null, neighborhood: string | null): string {
  const parts = [name];
  if (address) parts.push(address);
  if (neighborhood) parts.push(neighborhood);
  return parts.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
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

function calculateScore(place: any): number {
  let score = 0;

  // Maps usage (highest priority)
  score += (place.map_places?.length || 0) * 100;

  // Bookmarks
  score += (place.viewer_bookmarks?.length || 0) * 10;

  // Enrichment
  if (place.googlePhotos && Array.isArray(place.googlePhotos) && place.googlePhotos.length > 0) {
    score += 5;
  }
  if (place.neighborhood) score += 5;
  if (place.cuisineType) score += 5;
  if (place.tagline) score += 5;
  if (place.address) score += 3;

  // Age (older is better, slight preference)
  const daysOld = Math.min(
    Math.floor((Date.now() - place.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    365
  );
  score += daysOld / 365;

  return score;
}

async function main() {
  console.log('\n🧹 Cleanup Backfill Duplicates\n');
  console.log('(Removes duplicates BEFORE backfill to prevent google_place_id collisions)\n');

  if (!EXECUTE) {
    console.log('⚠️  DRY RUN MODE — No changes will be made');
    console.log('   Run with --execute to apply\n');
  }

  // Get curated place IDs
  const curatedIds = new Set(
    (await prisma.provenance.findMany({ select: { place_id: true } })).map((p) => p.place_id)
  );

  // Get places needing backfill
  const places = await prisma.places.findMany({
    where: {
      placesDataCachedAt: null,
      ...(CURATED_ONLY && curatedIds.size > 0 ? { id: { in: Array.from(curatedIds) } } : {}),
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

  console.log(`Analyzing ${places.length} curated places...\n`);

  // Find duplicate groups (same as find-backfill-duplicates logic)
  type PlaceRow = (typeof places)[0];
  const groups: PlaceRow[][] = [];
  const used = new Set<string>();

  for (let i = 0; i < places.length; i++) {
    if (used.has(places[i].id)) continue;

    const p1 = places[i];
    const searchKey1 = normalizeForSearch(p1.name, p1.address, p1.neighborhood);
    const group: PlaceRow[] = [p1];
    used.add(p1.id);

    for (let j = i + 1; j < places.length; j++) {
      if (used.has(places[j].id)) continue;

      const p2 = places[j];
      const searchKey2 = normalizeForSearch(p2.name, p2.address, p2.neighborhood);

      const searchSimilarity = similarityPercent(searchKey1, searchKey2);
      const nameSim = similarityPercent(normalizeName(p1.name), normalizeName(p2.name));
      let addrSim = 100;
      if (p1.address && p2.address) {
        addrSim = similarityPercent(normalizeAddress(p1.address), normalizeAddress(p2.address));
      } else if (p1.address || p2.address) {
        addrSim = 0;
      }

      if (searchSimilarity >= 85 || (nameSim >= 90 && addrSim >= 80)) {
        group.push(p2);
        used.add(p2.id);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  console.log('═'.repeat(80));
  console.log(`\nFound ${groups.length} duplicate groups (${groups.reduce((s, g) => s + g.length - 1, 0)} places to remove)\n`);

  if (groups.length === 0) {
    console.log('✅ No duplicates found. Safe to run backfill.\n');
    return;
  }

  let totalDeleted = 0;
  let totalSkipped = 0;
  let mapsMigrated = 0;
  let bookmarksMigrated = 0;

  for (let idx = 0; idx < groups.length; idx++) {
    const group = groups[idx];
    
    console.log(`\n${idx + 1}. Group (${group.length} places):`);

    // Score each place
    const scored = group.map((p) => ({
      place: p,
      score: calculateScore(p),
    }));

    scored.sort((a, b) => b.score - a.score);
    const keepPlace = scored[0].place;
    const removePlaces = scored.slice(1).map((s) => s.place);

    console.log(`   ✅ KEEP: "${keepPlace.name}" (${keepPlace.slug})`);
    console.log(`      Score: ${scored[0].score.toFixed(1)} | ${keepPlace.map_places.length} maps | neighborhood: ${keepPlace.neighborhood || 'none'}`);

    for (const removePlace of removePlaces) {
      const removeScore = scored.find((s) => s.place.id === removePlace.id)?.score || 0;
      console.log(`   ❌ REMOVE: "${removePlace.name}" (${removePlace.slug})`);
      console.log(`      Score: ${removeScore.toFixed(1)} | ${removePlace.map_places.length} maps | neighborhood: ${removePlace.neighborhood || 'none'}`);

      // Check if place is used in maps
      if (removePlace.map_places.length > 0 && !FORCE) {
        console.log(`      ⚠️  SKIP: Place is used in ${removePlace.map_places.length} map(s) (use --force to override)`);
        totalSkipped++;
        continue;
      }

      if (!EXECUTE) {
        console.log(`      → Would delete (dry run)`);
        continue;
      }

      // Execute deletion
      try {
        // Migrate map_places to keepPlace
        if (removePlace.map_places.length > 0) {
          console.log(`      Migrating ${removePlace.map_places.length} map reference(s)...`);
          for (const mp of removePlace.map_places) {
            const existing = await prisma.map_places.findUnique({
              where: {
                mapId_placeId: { mapId: mp.mapId, placeId: keepPlace.id },
              },
            });

            if (existing) {
              await prisma.map_places.delete({ where: { id: mp.id } });
              console.log(`         ✓ Removed duplicate from map (keep place already present)`);
            } else {
              await prisma.map_places.update({
                where: { id: mp.id },
                data: { placeId: keepPlace.id },
              });
              console.log(`         ✓ Migrated to ${mp.lists?.title || 'map'}`);
              mapsMigrated++;
            }
          }
        }

        // Migrate bookmarks
        if (removePlace.viewer_bookmarks.length > 0) {
          console.log(`      Migrating ${removePlace.viewer_bookmarks.length} bookmark(s)...`);
          for (const bm of removePlace.viewer_bookmarks) {
            if (!bm.viewerUserId) {
              await prisma.viewer_bookmarks.delete({ where: { id: bm.id } });
              continue;
            }
            const existing = await prisma.viewer_bookmarks.findUnique({
              where: {
                viewerUserId_placeId: {
                  viewerUserId: bm.viewerUserId,
                  placeId: keepPlace.id,
                },
              },
            });
            if (existing) {
              await prisma.viewer_bookmarks.delete({ where: { id: bm.id } });
            } else {
              await prisma.viewer_bookmarks.update({
                where: { id: bm.id },
                data: { placeId: keepPlace.id },
              });
              bookmarksMigrated++;
            }
          }
        }

        // Delete provenance for the duplicate (if exists)
        await prisma.provenance.deleteMany({ where: { place_id: removePlace.id } });

        // Delete the duplicate place
        await prisma.places.delete({ where: { id: removePlace.id } });
        totalDeleted++;
        console.log(`      ✅ Deleted`);
      } catch (error) {
        console.error(`      ❌ Error deleting:`, error);
      }
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 Summary:');
  if (EXECUTE) {
    console.log(`   ✅ Deleted: ${totalDeleted} duplicate place(s)`);
    if (mapsMigrated > 0) console.log(`   📋 Migrated: ${mapsMigrated} map reference(s)`);
    if (bookmarksMigrated > 0) console.log(`   🔖 Migrated: ${bookmarksMigrated} bookmark(s)`);
    if (totalSkipped > 0) console.log(`   ⏭️  Skipped: ${totalSkipped} place(s) (used in maps, use --force)`);
  } else {
    const wouldDelete = groups.reduce((sum, g) => {
      const removable = g.slice(1).filter(p => FORCE || p.map_places.length === 0);
      return sum + removable.length;
    }, 0);
    console.log(`   Would delete: ${wouldDelete} duplicate place(s)`);
    if (!FORCE) {
      const inMaps = groups.reduce((sum, g) => {
        const inMapPlaces = g.slice(1).filter(p => p.map_places.length > 0);
        return sum + inMapPlaces.length;
      }, 0);
      if (inMaps > 0) {
        console.log(`   Would skip: ${inMaps} place(s) used in maps (add --force to delete)`);
      }
    }
  }

  console.log('\n💡 Next step:');
  if (!EXECUTE) {
    console.log(`   npm run cleanup:backfill-duplicates -- --execute`);
  } else {
    console.log(`   npm run backfill:google -- --la-county`);
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
