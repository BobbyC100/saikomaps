#!/usr/bin/env node
/**
 * Sync Golden Records to Places Table
 *
 * Copies all golden_records to the places table so the public site
 * can display all 1,456 places (not just the original 673).
 *
 * Resolves lat/lng from: (1) golden_records, (2) linked raw_records via entity_links,
 * (3) existing places by google_place_id. Skips creates with no valid coords.
 * Never writes 0/0 — preserves existing coords on update when unresolved.
 *
 * Usage: npm run sync:places
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { categoryToPrimaryVertical } from '@/lib/primaryVertical';

const prisma = new PrismaClient();

/** Returns { lat, lng } if valid (non-null, not 0), else null */
function validCoords(
  lat: Decimal | number | null | undefined,
  lng: Decimal | number | null | undefined
): { lat: Decimal; lng: Decimal } | null {
  const la = lat != null ? Number(lat) : NaN;
  const lo = lng != null ? Number(lng) : NaN;
  if (Number.isNaN(la) || Number.isNaN(lo) || la === 0 || lo === 0) return null;
  return { lat: new Decimal(la), lng: new Decimal(lo) };
}

/** Resolve lat/lng: golden → linked raw_records → coordsByGpid map. Returns null if none valid. */
function resolveLatLng(
  golden: { lat: Decimal; lng: Decimal; google_place_id: string | null },
  rawCoords: { lat: Decimal | null; lng: Decimal | null }[] | null,
  coordsByGpid: Map<string, { lat: Decimal; lng: Decimal }>
): { lat: Decimal; lng: Decimal } | null {
  const fromGolden = validCoords(golden.lat, golden.lng);
  if (fromGolden) return fromGolden;

  if (rawCoords?.length) {
    for (const r of rawCoords) {
      const c = validCoords(r.lat, r.lng);
      if (c) return c;
    }
  }

  const gpid = golden.google_place_id?.trim();
  if (gpid) {
    const c = coordsByGpid.get(gpid);
    if (c) return c;
  }

  return null;
}

async function syncGoldenToPlaces() {
  console.log('🔄 Syncing golden_records → places\n');

  const goldenRecords = await prisma.golden_records.findMany({
    where: { lifecycle_status: 'ACTIVE' },
    include: {
      entity_links: {
        include: {
          raw_record: {
            select: { lat: true, lng: true },
          },
        },
      },
    },
  });

  console.log(`Found ${goldenRecords.length} active golden records\n`);

  const existingPlaces = await prisma.places.findMany({
    select: { id: true, slug: true, latitude: true, longitude: true, googlePlaceId: true },
  });

  const placesBySlug = new Map(existingPlaces.map((p) => [p.slug, p]));
  const placesByGpid = new Map<string, (typeof existingPlaces)[0]>();
  for (const p of existingPlaces) {
    const gpid = p.googlePlaceId?.trim();
    if (gpid && !placesByGpid.has(gpid)) placesByGpid.set(gpid, p);
  }

  const coordsByGpid = new Map<string, { lat: Decimal; lng: Decimal }>();
  for (const p of existingPlaces) {
    const c = validCoords(p.latitude, p.longitude);
    const gpid = p.googlePlaceId?.trim();
    if (c && gpid && !coordsByGpid.has(gpid)) coordsByGpid.set(gpid, c);
  }

  const locations = await prisma.locations.findMany({
    where: { googlePlaceId: { not: null } },
    select: { googlePlaceId: true, latitude: true, longitude: true },
  });
  for (const loc of locations) {
    const c = validCoords(loc.latitude, loc.longitude);
    const gpid = loc.googlePlaceId?.trim();
    if (c && gpid && !coordsByGpid.has(gpid)) coordsByGpid.set(gpid, c);
  }

  console.log(`Existing places: ${existingPlaces.length} (${coordsByGpid.size} with valid coords by google_place_id)\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};

  for (const golden of goldenRecords) {
    const rawCoords = golden.entity_links
      ?.map((el) => el.raw_record)
      .filter(Boolean) as { lat: Decimal | null; lng: Decimal | null }[] | null;
    const coords = resolveLatLng(golden, rawCoords, coordsByGpid);
    const existingBySlug = placesBySlug.get(golden.slug);
    const gpid = golden.google_place_id?.trim();
    const existingByGpid = gpid ? placesByGpid.get(gpid) : undefined;
    // Prefer existing place by google_place_id so we never create a duplicate (unique constraint).
    const existingPlace = existingByGpid ?? existingBySlug;
    const existingCoords =
      existingPlace != null ? validCoords(existingPlace.latitude, existingPlace.longitude) : null;

    try {
      const baseData = {
        name: golden.name,
        address: golden.address_street,
        neighborhood: golden.neighborhood,
        category: golden.category,
        primary_vertical: categoryToPrimaryVertical(golden.category) ?? 'EAT',
        phone: golden.phone,
        website: golden.website,
        instagram: golden.instagram_handle,
        hours: golden.hours_json as Prisma.JsonValue,
        description: golden.description,
        googlePlaceId: golden.google_place_id,
        vibeTags: golden.vibe_tags,
      };

      if (existingPlace) {
        const latLng = coords ?? existingCoords;
        // Map golden.lat → places.latitude, golden.lng → places.longitude (do not overwrite with 0/0)
        const data = latLng
          ? { ...baseData, latitude: latLng.lat, longitude: latLng.lng }
          : baseData;
        const updatePayload =
          existingByGpid && !existingBySlug ? data : { ...data, slug: golden.slug };
        await prisma.places.update({
          where: { id: existingPlace.id },
          data: updatePayload,
        });
        updated++;
        if (existingByGpid && existingBySlug && existingByGpid.id !== existingBySlug.id) {
          console.warn(
            `  Note: golden "${golden.name}" matched both by slug and by google_place_id (updated by gpid place id=${existingPlace.id})`
          );
        }
      } else {
        if (!coords) {
          const reason = 'no_valid_lat_lng';
          skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
          if (skipped < 10) {
            console.warn(
              `  Skip ${golden.slug}: ${reason} (golden 0/0, no linked raw coords, no existing place by google_place_id)`
            );
          }
          skipped++;
          continue;
        }
        await prisma.places.create({
          data: {
            id: golden.canonical_id,
            slug: golden.slug,
            ...baseData,
            latitude: coords.lat,
            longitude: coords.lng,
          },
        });
        created++;
        placesBySlug.set(golden.slug, { id: golden.canonical_id, slug: golden.slug, latitude: coords.lat, longitude: coords.lng, googlePlaceId: golden.google_place_id });
        if (gpid) placesByGpid.set(gpid, { id: golden.canonical_id, slug: golden.slug, latitude: coords.lat, longitude: coords.lng, googlePlaceId: golden.google_place_id });
      }

      if ((created + updated) % 100 === 0) {
        console.log(`Progress: ${created + updated}/${goldenRecords.length}...`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to sync ${golden.name}:`, error.message);
      skipped++;
    }
  }

  const totalPlaces = existingPlaces.length + created;
  console.log(`\n✅ Sync complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  if (Object.keys(skipReasons).length) {
    console.log(`   Skip reasons: ${JSON.stringify(skipReasons)}`);
  }
  console.log(`   Total in places: ${totalPlaces}`);
}

async function main() {
  try {
    await syncGoldenToPlaces();
  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
