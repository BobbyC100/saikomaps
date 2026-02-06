import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MergeOperation {
  duplicateSlug: string;
  keepSlug: string;
  reason: string;
}

// Define the merges based on investigation
const MERGE_OPERATIONS: MergeOperation[] = [
  {
    duplicateSlug: 'olivia-restaurant',
    keepSlug: 'restaurant-olivia',
    reason: 'Same restaurant (Olivia Restaurant on Vermont Ave)',
  },
  {
    duplicateSlug: 'tacos-estilo-tijuana',
    keepSlug: 'tacos-estilo-df',
    reason: 'Same restaurant (Tacos Los Poblanos #1 Estilo Tijuana)',
  },
  {
    duplicateSlug: 'helens-wines',
    keepSlug: 'helen-s-wines-fairfax',
    reason: 'Helen\'s Wines Fairfax location',
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  return { execute };
}

async function mergeDuplicatePlaces() {
  const { execute } = parseArgs();

  console.log('🔗 Merging duplicate places...\n');

  if (!execute) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
    console.log('   Run with --execute to apply changes\n');
  }

  console.log('─'.repeat(80));

  let merged = 0;
  let mapsMigrated = 0;
  let bookmarksMigrated = 0;

  for (const op of MERGE_OPERATIONS) {
    console.log(`\n📍 Processing: ${op.duplicateSlug}`);
    console.log(`   Reason: ${op.reason}`);

    // Find both places
    const duplicatePlace = await prisma.place.findUnique({
      where: { slug: op.duplicateSlug },
      include: {
        mapPlaces: {
          include: {
            map: { select: { title: true, slug: true } }
          }
        },
        viewerBookmarks: true,
      },
    });

    const keepPlace = await prisma.place.findUnique({
      where: { slug: op.keepSlug },
      include: {
        mapPlaces: true,
      },
    });

    if (!duplicatePlace) {
      console.log(`   ⚠️  Duplicate place not found: ${op.duplicateSlug}`);
      continue;
    }

    if (!keepPlace) {
      console.log(`   ⚠️  Keep place not found: ${op.keepSlug}`);
      continue;
    }

    console.log(`   ❌ DELETE: "${duplicatePlace.name}" (${duplicatePlace.slug})`);
    console.log(`   ✅ KEEP:   "${keepPlace.name}" (${keepPlace.slug})`);

    // Show what will be migrated
    if (duplicatePlace.mapPlaces.length > 0) {
      console.log(`\n   📋 Map references to migrate: ${duplicatePlace.mapPlaces.length}`);
      duplicatePlace.mapPlaces.forEach(mp => {
        console.log(`      • ${mp.map.title} (${mp.map.slug})`);
      });
    }

    if (duplicatePlace.viewerBookmarks.length > 0) {
      console.log(`\n   🔖 Bookmarks to migrate: ${duplicatePlace.viewerBookmarks.length}`);
    }

    if (!execute) {
      console.log(`\n   ${execute ? '✓' : '→'} Would merge into "${keepPlace.name}"`);
      continue;
    }

    // Execute merge
    try {
      // Migrate MapPlace references
      for (const mapPlace of duplicatePlace.mapPlaces) {
        // Check if keep place already exists in this map
        const existingMapPlace = await prisma.mapPlace.findUnique({
          where: {
            mapId_placeId: {
              mapId: mapPlace.mapId,
              placeId: keepPlace.id,
            }
          }
        });

        if (existingMapPlace) {
          // Keep place already in map, just delete the duplicate reference
          await prisma.mapPlace.delete({
            where: { id: mapPlace.id }
          });
          console.log(`      ✓ Removed duplicate from ${mapPlace.map.title} (keep place already present)`);
        } else {
          // Update reference to point to keep place
          await prisma.mapPlace.update({
            where: { id: mapPlace.id },
            data: { 
              placeId: keepPlace.id,
              // Optionally preserve descriptor if keep place doesn't have one
            },
          });
          console.log(`      ✓ Migrated to ${mapPlace.map.title}`);
          mapsMigrated++;
        }
      }

      // Migrate ViewerBookmarks
      for (const bookmark of duplicatePlace.viewerBookmarks) {
        if (bookmark.viewerUserId) {
          const existingBookmark = await prisma.viewerBookmark.findUnique({
            where: {
              viewerUserId_placeId: {
                viewerUserId: bookmark.viewerUserId,
                placeId: keepPlace.id,
              }
            }
          });

          if (existingBookmark) {
            // User already has bookmark for keep place
            await prisma.viewerBookmark.delete({
              where: { id: bookmark.id }
            });
            console.log(`      ✓ Removed duplicate bookmark`);
          } else {
            // Migrate bookmark
            await prisma.viewerBookmark.update({
              where: { id: bookmark.id },
              data: { placeId: keepPlace.id },
            });
            console.log(`      ✓ Migrated bookmark`);
            bookmarksMigrated++;
          }
        } else {
          await prisma.viewerBookmark.delete({
            where: { id: bookmark.id }
          });
        }
      }

      // Delete the duplicate place
      await prisma.place.delete({
        where: { id: duplicatePlace.id },
      });

      merged++;
      console.log(`\n   ✅ Successfully merged and deleted "${duplicatePlace.name}"`);

    } catch (error) {
      console.error(`\n   ❌ Error merging:`, error);
    }

    console.log('─'.repeat(80));
  }

  console.log('\n📊 Summary:');
  if (execute) {
    console.log(`   ✅ Merged ${merged} duplicate place(s)`);
    console.log(`   📋 Migrated ${mapsMigrated} map reference(s)`);
    console.log(`   🔖 Migrated ${bookmarksMigrated} bookmark(s)`);
  } else {
    console.log(`   Would merge ${MERGE_OPERATIONS.length} duplicate place(s)`);
    console.log(`\n💡 Run with --execute to apply these changes:`);
    console.log(`   npm run merge:duplicates -- --execute`);
  }
}

mergeDuplicatePlaces()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
