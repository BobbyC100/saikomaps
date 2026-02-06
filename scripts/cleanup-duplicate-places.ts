import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  googlePlaceId: string;
  keepPlace: {
    id: string;
    name: string;
    slug: string;
    mapCount: number;
  };
  removeIds: string[];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const force = args.includes('--force');
  return { execute, force };
}

async function cleanupDuplicatePlaces() {
  const { execute, force } = parseArgs();
  
  console.log('🧹 Cleaning up duplicate places...\n');
  
  if (!execute) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
    console.log('   Run with --execute to apply changes\n');
  }

  // Find duplicate google_place_ids
  const duplicates = await prisma.$queryRaw<Array<{
    google_place_id: string;
    count: bigint;
  }>>`
    SELECT google_place_id, COUNT(*) as count
    FROM places
    WHERE google_place_id IS NOT NULL
    GROUP BY google_place_id
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate group(s)\n`);
  console.log('─'.repeat(80));

  const operations: DuplicateGroup[] = [];

  for (const dup of duplicates) {
    const places = await prisma.place.findMany({
      where: { googlePlaceId: dup.google_place_id },
      include: {
        mapPlaces: {
          include: {
            map: { select: { title: true } }
          }
        },
        viewerBookmarks: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Score and recommend which to keep
    const scored = places.map(p => ({
      place: p,
      score: calculateScore(p),
    }));

    scored.sort((a, b) => b.score - a.score);
    const keepPlace = scored[0].place;
    const removePlaces = scored.slice(1).map(s => s.place);

    console.log(`\n📍 ${keepPlace.name} (Google Place ID: ${dup.google_place_id})`);
    console.log(`   ✅ KEEP: "${keepPlace.name}" (${keepPlace.slug})`);
    console.log(`      Used in ${keepPlace.mapPlaces.length} map(s), ${keepPlace.viewerBookmarks.length} bookmark(s)`);
    
    if (removePlaces.length > 0) {
      console.log(`   ❌ REMOVE:`);
      removePlaces.forEach(p => {
        console.log(`      • "${p.name}" (${p.slug})`);
        console.log(`        ${p.mapPlaces.length} map(s), ${p.viewerBookmarks.length} bookmark(s)`);
        
        if (p.mapPlaces.length > 0 && !force) {
          console.log(`        ⚠️  SKIP: Place is used in maps (use --force to override)`);
        }
      });
    }

    operations.push({
      googlePlaceId: dup.google_place_id,
      keepPlace: {
        id: keepPlace.id,
        name: keepPlace.name,
        slug: keepPlace.slug,
        mapCount: keepPlace.mapPlaces.length,
      },
      removeIds: removePlaces
        .filter(p => force || p.mapPlaces.length === 0)
        .map(p => p.id),
    });
  }

  console.log('\n' + '─'.repeat(80));

  if (!execute) {
    console.log('\n📊 Summary (DRY RUN):');
    console.log(`   Would delete ${operations.reduce((sum, op) => sum + op.removeIds.length, 0)} duplicate place(s)`);
    console.log(`\n💡 Run with --execute to apply these changes`);
    if (!force) {
      console.log(`   Add --force to also remove duplicates that are used in maps`);
    }
    return;
  }

  // Execute cleanup
  console.log('\n🔧 Executing cleanup...\n');

  let deleted = 0;
  let migrated = 0;

  for (const op of operations) {
    if (op.removeIds.length === 0) continue;

    for (const removeId of op.removeIds) {
      try {
        // Get the place to be removed
        const placeToRemove = await prisma.place.findUnique({
          where: { id: removeId },
          include: {
            mapPlaces: true,
            viewerBookmarks: true,
          },
        });

        if (!placeToRemove) continue;

        // Migrate MapPlace references
        if (placeToRemove.mapPlaces.length > 0) {
          console.log(`   Migrating ${placeToRemove.mapPlaces.length} map reference(s) from ${placeToRemove.slug}...`);
          
          for (const mapPlace of placeToRemove.mapPlaces) {
            // Check if the keep place is already in this map
            const existingMapPlace = await prisma.mapPlace.findUnique({
              where: {
                mapId_placeId: {
                  mapId: mapPlace.mapId,
                  placeId: op.keepPlace.id,
                }
              }
            });

            if (existingMapPlace) {
              // Keep place already exists in this map, just delete the old reference
              await prisma.mapPlace.delete({
                where: { id: mapPlace.id }
              });
              console.log(`      ✓ Removed duplicate from map (keep place already present)`);
            } else {
              // Update reference to point to keep place
              await prisma.mapPlace.update({
                where: { id: mapPlace.id },
                data: { placeId: op.keepPlace.id },
              });
              console.log(`      ✓ Migrated to ${op.keepPlace.slug}`);
              migrated++;
            }
          }
        }

        // Migrate ViewerBookmark references
        if (placeToRemove.viewerBookmarks.length > 0) {
          console.log(`   Migrating ${placeToRemove.viewerBookmarks.length} bookmark(s)...`);
          
          for (const bookmark of placeToRemove.viewerBookmarks) {
            // Check if user already has bookmark for keep place
            if (bookmark.viewerUserId) {
              const existingBookmark = await prisma.viewerBookmark.findUnique({
                where: {
                  viewerUserId_placeId: {
                    viewerUserId: bookmark.viewerUserId,
                    placeId: op.keepPlace.id,
                  }
                }
              });

              if (existingBookmark) {
                // User already has bookmark for keep place, delete old one
                await prisma.viewerBookmark.delete({
                  where: { id: bookmark.id }
                });
                console.log(`      ✓ Removed duplicate bookmark`);
              } else {
                // Update bookmark to point to keep place
                await prisma.viewerBookmark.update({
                  where: { id: bookmark.id },
                  data: { placeId: op.keepPlace.id },
                });
                console.log(`      ✓ Migrated bookmark`);
              }
            } else {
              // No user ID, just delete
              await prisma.viewerBookmark.delete({
                where: { id: bookmark.id }
              });
            }
          }
        }

        // Delete the duplicate place
        await prisma.place.delete({
          where: { id: removeId },
        });

        deleted++;
        console.log(`   ✅ Deleted duplicate: ${placeToRemove.name} (${placeToRemove.slug})`);

      } catch (error) {
        console.error(`   ❌ Error removing place ${removeId}:`, error);
      }
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n✅ Cleanup complete!');
  console.log(`   Deleted: ${deleted} duplicate place(s)`);
  console.log(`   Migrated: ${migrated} map reference(s)`);
}

function calculateScore(place: any): number {
  let score = 0;
  
  // Maps usage (highest priority)
  score += place.mapPlaces.length * 100;
  
  // Bookmarks
  score += place.viewerBookmarks.length * 10;
  
  // Enrichment
  if (place.googlePhotos && Array.isArray(place.googlePhotos) && place.googlePhotos.length > 0) {
    score += 5;
  }
  if (place.neighborhood) score += 5;
  if (place.cuisineType) score += 5;
  if (place.tagline) score += 5;
  
  // Age (older is better, slight preference)
  const daysOld = Math.min(
    Math.floor((Date.now() - place.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    365
  );
  score += daysOld / 365;

  return score;
}

cleanupDuplicatePlaces()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
