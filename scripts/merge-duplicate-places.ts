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
    const duplicatePlace = await prisma.entities.findUnique({
      where: { slug: op.duplicateSlug },
      include: {
        map_places: {
          include: {
            lists: { select: { title: true, slug: true } }
          }
        },
        viewer_bookmarks: true,
      },
    });

    const keepPlace = await prisma.entities.findUnique({
      where: { slug: op.keepSlug },
      include: {
        map_places: true,
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
    if (duplicatePlace.map_places.length > 0) {
      console.log(`\n   📋 Map references to migrate: ${duplicatePlace.map_places.length}`);
      duplicatePlace.map_places.forEach(mp => {
        console.log(`      • ${mp.lists.title} (${mp.lists.slug})`);
      });
    }

    if (duplicatePlace.viewer_bookmarks.length > 0) {
      console.log(`\n   🔖 Bookmarks to migrate: ${duplicatePlace.viewer_bookmarks.length}`);
    }

    if (!execute) {
      console.log(`\n   ${execute ? '✓' : '→'} Would merge into "${keepPlace.name}"`);
      continue;
    }

    // Execute merge
    try {
      // Migrate MapPlace references
      for (const mapPlace of duplicatePlace.map_places) {
        // Check if keep place already exists in this map
        const existingMapPlace = await prisma.map_places.findUnique({
          where: {
            mapId_entityId: {
              mapId: mapPlace.mapId,
              entityId: keepPlace.id,
            }
          }
        });

        if (existingMapPlace) {
          // Keep place already in map, just delete the duplicate reference
          await prisma.map_places.delete({
            where: { id: mapPlace.id }
          });
          console.log(`      ✓ Removed duplicate from ${mapPlace.lists.title} (keep place already present)`);
        } else {
          // Update reference to point to keep place
          await prisma.map_places.update({
            where: { id: mapPlace.id },
            data: { 
              entityId: keepPlace.id,
              // Optionally preserve descriptor if keep place doesn't have one
            },
          });
          console.log(`      ✓ Migrated to ${mapPlace.lists.title}`);
          mapsMigrated++;
        }
      }

      // Migrate ViewerBookmarks
      for (const bookmark of duplicatePlace.viewer_bookmarks) {
        if (bookmark.viewerUserId) {
          const existingBookmark = await prisma.viewer_bookmarks.findUnique({
            where: {
              viewerUserId_entityId: {
                viewerUserId: bookmark.viewerUserId,
                entityId: keepPlace.id,
              }
            }
          });

          if (existingBookmark) {
            // User already has bookmark for keep place
            await prisma.viewer_bookmarks.delete({
              where: { id: bookmark.id }
            });
            console.log(`      ✓ Removed duplicate bookmark`);
          } else {
            // Migrate bookmark
            await prisma.viewer_bookmarks.update({
              where: { id: bookmark.id },
              data: { entityId: keepPlace.id },
            });
            console.log(`      ✓ Migrated bookmark`);
            bookmarksMigrated++;
          }
        } else {
          await prisma.viewer_bookmarks.delete({
            where: { id: bookmark.id }
          });
        }
      }

      // Delete the duplicate place
      await prisma.entities.delete({
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
