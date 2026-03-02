// Identity-level script: operates on entities (root primitive).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  googlePlaceId: string;
  keepEntity: {
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

async function cleanupDuplicateEntities() {
  const { execute, force } = parseArgs();
  
  console.log('🧹 Cleaning up duplicate entities...\n');
  
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
    FROM entities
    WHERE google_place_id IS NOT NULL
    GROUP BY google_place_id
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate entity group(s)\n`);
  console.log('─'.repeat(80));

  const operations: DuplicateGroup[] = [];

  for (const dup of duplicates) {
    const entities = await prisma.entities.findMany({
      where: { googlePlaceId: dup.google_place_id },
      include: {
        map_places: {
          include: {
            lists: { select: { title: true } }
          }
        },
        viewer_bookmarks: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Score and recommend which to keep
    const scored = entities.map(e => ({
      entity: e,
      score: calculateScore(e),
    }));

    scored.sort((a, b) => b.score - a.score);
    const keepEntity = scored[0].entity;
    const removeEntities = scored.slice(1).map(s => s.entity);

    console.log(`\n📍 ${keepEntity.name} (Google Place ID: ${dup.google_place_id})`);
    console.log(`   ✅ KEEP: "${keepEntity.name}" (${keepEntity.slug})`);
    console.log(`      Used in ${keepEntity.map_places.length} map(s), ${keepEntity.viewer_bookmarks.length} bookmark(s)`);
    
    if (removeEntities.length > 0) {
      console.log(`   ❌ REMOVE:`);
      removeEntities.forEach(e => {
        console.log(`      • "${e.name}" (${e.slug})`);
        console.log(`        ${e.map_places.length} map(s), ${e.viewer_bookmarks.length} bookmark(s)`);
        
        if (e.map_places.length > 0 && !force) {
          console.log(`        ⚠️  SKIP: Entity is used in maps (use --force to override)`);
        }
      });
    }

    operations.push({
      googlePlaceId: dup.google_place_id,
      keepEntity: {
        id: keepEntity.id,
        name: keepEntity.name,
        slug: keepEntity.slug,
        mapCount: keepEntity.map_places.length,
      },
      removeIds: removeEntities
        .filter(e => force || e.map_places.length === 0)
        .map(e => e.id),
    });
  }

  console.log('\n' + '─'.repeat(80));

  if (!execute) {
    console.log('\n📊 Summary (DRY RUN):');
    console.log(`   Would delete ${operations.reduce((sum, op) => sum + op.removeIds.length, 0)} duplicate entity(ies)`);
    console.log(`\n💡 Run with --execute to apply these changes`);
    if (!force) {
      console.log(`   Add --force to also remove duplicate entities that are used in maps`);
    }
    return;
  }

  // Execute cleanup
  console.log('\n🔧 Executing cleanup...\n');

  let deleted = 0;
  let migrated = 0;

  for (const op of operations) {
    if (op.removeIds.length === 0) continue;

    for (const entityId of op.removeIds) {
      try {
        // Get the entity to be removed
        const entityToRemove = await prisma.entities.findUnique({
          where: { id: entityId },
          include: {
            map_places: true,
            viewer_bookmarks: true,
          },
        });

        if (!entityToRemove) continue;

        // Migrate MapPlace references
        if (entityToRemove.map_places.length > 0) {
          console.log(`   Migrating ${entityToRemove.map_places.length} map reference(s) from ${entityToRemove.slug}...`);
          
          for (const mapPlace of entityToRemove.map_places) {
            // Check if the keep entity is already in this map
            const existingMapPlace = await prisma.map_places.findUnique({
              where: {
                mapId_entityId: {
                  mapId: mapPlace.mapId,
                  entityId: op.keepEntity.id,
                }
              }
            });

            if (existingMapPlace) {
              // Keep entity already exists in this map, just delete the old reference
              await prisma.map_places.delete({
                where: { id: mapPlace.id }
              });
              console.log(`      ✓ Removed duplicate from map (keep entity already present)`);
            } else {
              // Update reference to point to keep entity
              await prisma.map_places.update({
                where: { id: mapPlace.id },
                data: { entityId: op.keepEntity.id },
              });
              console.log(`      ✓ Migrated to ${op.keepEntity.slug}`);
              migrated++;
            }
          }
        }

        // Migrate ViewerBookmark references
        if (entityToRemove.viewer_bookmarks.length > 0) {
          console.log(`   Migrating ${entityToRemove.viewer_bookmarks.length} bookmark(s)...`);
          
          for (const bookmark of entityToRemove.viewer_bookmarks) {
            // Check if user already has bookmark for keep entity
            if (bookmark.viewerUserId) {
              const existingBookmark = await prisma.viewer_bookmarks.findUnique({
                where: {
                  viewerUserId_entityId: {
                    viewerUserId: bookmark.viewerUserId,
                    entityId: op.keepEntity.id,
                  }
                }
              });

              if (existingBookmark) {
                // User already has bookmark for keep entity, delete old one
                await prisma.viewer_bookmarks.delete({
                  where: { id: bookmark.id }
                });
                console.log(`      ✓ Removed duplicate bookmark`);
              } else {
                // Update bookmark to point to keep entity
                await prisma.viewer_bookmarks.update({
                  where: { id: bookmark.id },
                  data: { entityId: op.keepEntity.id },
                });
                console.log(`      ✓ Migrated bookmark`);
              }
            } else {
              // No user ID, just delete
              await prisma.viewer_bookmarks.delete({
                where: { id: bookmark.id }
              });
            }
          }
        }

        // Delete the duplicate entity
        await prisma.entities.delete({
          where: { id: entityId },
        });

        deleted++;
        console.log(`   ✅ Deleted duplicate entity: ${entityToRemove.name} (${entityToRemove.slug})`);

      } catch (error) {
        console.error(`   ❌ Error removing entity ${entityId}:`, error);
      }
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n✅ Cleanup complete!');
  console.log(`   Deleted: ${deleted} duplicate entity(ies)`);
  console.log(`   Migrated: ${migrated} map reference(s)`);
}

function calculateScore(entity: any): number {
  let score = 0;
  
  // Maps usage (highest priority)
  score += entity.map_places.length * 100;
  
  // Bookmarks
  score += entity.viewer_bookmarks.length * 10;
  
  // Enrichment
  if (entity.googlePhotos && Array.isArray(entity.googlePhotos) && entity.googlePhotos.length > 0) {
    score += 5;
  }
  if (entity.neighborhood) score += 5;
  if (entity.cuisineType) score += 5;
  if (entity.tagline) score += 5;
  
  // Age (older is better, slight preference)
  const daysOld = Math.min(
    Math.floor((Date.now() - entity.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    365
  );
  score += daysOld / 365;

  return score;
}

cleanupDuplicateEntities()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
