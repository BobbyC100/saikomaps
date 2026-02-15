/**
 * Migration: Locations → Place + MapPlace
 * Run: npx tsx scripts/migrate-locations-to-places.ts
 *
 * For each Location:
 *   1. Find or create Place (by googlePlaceId)
 *   2. Create MapPlace linking Place to List (if not exists)
 * Idempotent: safe to run multiple times.
 */

import { PrismaClient } from '@prisma/client';
import { generatePlaceSlug, ensureUniqueSlug } from '../lib/place-slug';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration: Locations → Place + MapPlace\n');

  const locations = await prisma.location.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  console.log(`Found ${locations.length} locations to migrate.\n`);

  for (const loc of locations) {
    // 1. Find or create Place
    let place = loc.googlePlaceId
      ? await prisma.places.findUnique({
          where: { googlePlaceId: loc.googlePlaceId },
        })
      : null;

    if (!place) {
      const baseSlug = generatePlaceSlug(loc.name, loc.neighborhood ?? undefined);
      const slug = await ensureUniqueSlug(baseSlug, async (s) => {
        const existing = await prisma.places.findUnique({ where: { slug: s } });
        return !!existing;
      });

      place = await prisma.places.create({
        data: {
          slug,
          googlePlaceId: loc.googlePlaceId,
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          phone: loc.phone,
          website: loc.website,
          instagram: loc.instagram,
          hours: loc.hours as object | undefined,
          description: loc.description,
          googlePhotos: loc.googlePhotos as object | undefined,
          googleTypes: loc.googleTypes,
          priceLevel: loc.priceLevel,
          neighborhood: loc.neighborhood,
          category: loc.category,
          placesDataCachedAt: loc.placesDataCachedAt,
        },
      });
      console.log(`  Created Place: ${place.slug} (${place.id})`);
    }

    // 2. Check if MapPlace already exists (idempotent)
    const existingMapPlace = await prisma.mapPlace.findUnique({
      where: {
        mapId_placeId: {
          mapId: loc.listId,
          placeId: place.id,
        },
      },
    });

    if (existingMapPlace) {
      console.log(`  Skipped MapPlace (exists): Location ${loc.id} → MapPlace ${existingMapPlace.id}`);
      continue;
    }

    const mapPlace = await prisma.mapPlace.create({
      data: {
        mapId: loc.listId,
        placeId: place.id,
        descriptor: loc.descriptor,
        userNote: loc.userNote,
        userPhotos: loc.userPhotos,
        orderIndex: loc.orderIndex,
      },
    });

    console.log(`  Migrated Location ${loc.id} → Place ${place.id} + MapPlace ${mapPlace.id}`);
  }

  console.log('\nMigration complete.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
