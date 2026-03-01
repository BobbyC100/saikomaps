#!/usr/bin/env node
/**
 * Sync Golden Records to Places Table (GPID-first)
 *
 * Resolves GPID per golden: use existing, or Nearby (200m) then Text "${name} Los Angeles".
 * Only accepts MATCH (strong nearby or text single + sim >= 85). Skips row with SKIP_NO_GPID otherwise.
 * Upserts by google_place_id; never creates without GPID. Never overwrites existing google_place_id on update.
 *
 * Usage (Neon): ./scripts/db-neon.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/sync-golden-to-places.ts [--dry-run]
 *       or:     npm run sync:places   (add --dry-run to skip DB writes)
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { categoryToPrimaryVertical } from '@/lib/primaryVertical';
import { computePlaceConfidence, normalizeSourceId } from '@/lib/confidence';
import { assertDbTargetAllowed } from '@/lib/db-guard';
import { resolveGpid } from '@/lib/gpid-resolve';

const prisma = new PrismaClient();
const RATE_LIMIT_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2);
  return { dryRun: args.includes('--dry-run') };
}

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
  assertDbTargetAllowed();
  const { dryRun } = parseArgs();
  if (dryRun) console.log('🔄 Syncing golden_records → places (DRY RUN — no writes)\n');
  else console.log('🔄 Syncing golden_records → places\n');

  const goldenRecords = await prisma.golden_records.findMany({
    where: { lifecycle_status: 'ACTIVE' },
    select: {
      canonical_id: true,
      slug: true,
      name: true,
      address_street: true,
      neighborhood: true,
      category: true,
      phone: true,
      website: true,
      instagram_handle: true,
      hours_json: true,
      description: true,
      google_place_id: true,
      vibe_tags: true,
      lat: true,
      lng: true,
      entity_links: {
        where: { is_active: true },
        select: {
          raw_record: {
            select: { lat: true, lng: true, raw_json: true, source_name: true },
          },
        },
      },
    },
  });

  const sourcesRows = await prisma.sources.findMany({ select: { id: true, trust_tier: true } });
  const trustTiersBySource: Record<string, number> = {};
  for (const s of sourcesRows) trustTiersBySource[s.id] = s.trust_tier;

  console.log(`Found ${goldenRecords.length} active golden records\n`);

  const existingPlaces = await prisma.entities.findMany({
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

  let processed = 0;
  let matchedGpid = 0;
  let upserted = 0;
  let skippedNoGpid = 0;
  let ambiguous = 0;
  let errors = 0;
  let conflictsGpidVsSlug = 0;
  const unknownSourceCounts: Record<string, number> = {};

  for (const golden of goldenRecords) {
    processed++;
    const rawCoords = golden.entity_links
      ?.map((el) => el.raw_record)
      .filter(Boolean) as { lat: Decimal | null; lng: Decimal | null }[] | null;
    const coords = resolveLatLng(golden, rawCoords, coordsByGpid);
    const latNum = coords ? Number(coords.lat) : null;
    const lngNum = coords ? Number(coords.lng) : null;

    const resolveResult = await resolveGpid({
      name: golden.name,
      gpid: golden.google_place_id?.trim() || null,
      lat: latNum,
      lng: lngNum,
    });
    await sleep(RATE_LIMIT_MS);

    if (resolveResult.status !== 'MATCH') {
      if (resolveResult.status === 'AMBIGUOUS') ambiguous++;
      else if (resolveResult.status === 'ERROR') errors++;
      else skippedNoGpid++;
      if (skippedNoGpid + ambiguous + errors <= 15) {
        console.warn(`  SKIP_NO_GPID ${golden.slug}: ${resolveResult.reason}`);
      }
      continue;
    }

    const resolvedGpid = resolveResult.gpid!;
    matchedGpid++;

    const byGpid = resolvedGpid ? placesByGpid.get(resolvedGpid) : undefined;
    const bySlug = placesBySlug.get(golden.slug);

    let existingPlace: (typeof existingPlaces)[0] | undefined;

    if (byGpid) {
      existingPlace = byGpid;
    } else if (bySlug) {
      const existingGpid = (bySlug.googlePlaceId ?? '').toString().trim();
      const resolvedTrimmed = (resolvedGpid ?? '').trim();
      if (existingGpid && resolvedTrimmed && existingGpid !== resolvedTrimmed) {
        conflictsGpidVsSlug++;
        console.warn(
          `CONFLICT_GPID_VS_SLUG | slug=${golden.slug} | golden=${golden.name} | resolved=${resolvedTrimmed} | place=${existingGpid} | place_id=${bySlug.id}`
        );
        continue;
      }
      existingPlace = bySlug;
    } else {
      existingPlace = undefined;
    }
    const existingCoords =
      existingPlace != null ? validCoords(existingPlace.latitude, existingPlace.longitude) : null;

    try {
      const rawRecords = (golden.entity_links ?? [])
        .map((el) => el.raw_record)
        .filter(Boolean) as { raw_json: unknown; source_name: string }[];
      for (const r of rawRecords) {
        const canonical = normalizeSourceId(r.source_name);
        if (trustTiersBySource[canonical] === undefined) {
          unknownSourceCounts[r.source_name] = (unknownSourceCounts[r.source_name] ?? 0) + 1;
        }
      }
      const { confidence, overall_confidence } = computePlaceConfidence(
        {
          name: golden.name,
          address_street: golden.address_street,
          phone: golden.phone,
          website: golden.website,
          hours_json: golden.hours_json,
          description: golden.description,
          lat: golden.lat,
          lng: golden.lng,
        },
        rawRecords,
        trustTiersBySource
      );
      const now = new Date();

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
        googlePlaceId: resolvedGpid,
        vibeTags: golden.vibe_tags,
        confidence: (Object.keys(confidence).length ? confidence : {}) as Prisma.InputJsonValue,
        overall_confidence: overall_confidence >= 0 ? overall_confidence : 0.5,
        confidence_updated_at: now,
      };

      if (existingPlace) {
        const latLng = coords ?? existingCoords;
        const data = latLng
          ? { ...baseData, latitude: latLng.lat, longitude: latLng.lng }
          : { ...baseData };
        delete (data as Record<string, unknown>).googlePlaceId;
        const updatePayload = byGpid && !bySlug ? data : { ...data, slug: golden.slug };
        if (!dryRun) {
          await prisma.entities.update({
            where: { id: existingPlace.id },
            data: updatePayload,
          });
        }
        upserted++;
        const newSlug = byGpid && !bySlug ? existingPlace.slug : golden.slug;
        const newLat = latLng?.lat ?? existingPlace.latitude;
        const newLng = latLng?.lng ?? existingPlace.longitude;
        placesByGpid.set(resolvedGpid, { id: existingPlace.id, slug: newSlug, latitude: newLat, longitude: newLng, googlePlaceId: resolvedGpid });
        placesBySlug.set(golden.slug, { id: existingPlace.id, slug: golden.slug, latitude: newLat, longitude: newLng, googlePlaceId: resolvedGpid });
      } else {
        if (!resolvedGpid) {
          throw new Error('Cannot create place without google_place_id (GPID-first). Skip row or resolve GPID first.');
        }
        const latLng = coords ?? null;
        if (!dryRun) {
          await prisma.entities.create({
            data: {
              id: golden.canonical_id,
              slug: golden.slug,
              ...baseData,
              latitude: latLng?.lat ?? undefined,
              longitude: latLng?.lng ?? undefined,
            },
          });
        }
        upserted++;
        const latForMap = latLng?.lat ?? null;
        const lngForMap = latLng?.lng ?? null;
        placesBySlug.set(golden.slug, { id: golden.canonical_id, slug: golden.slug, latitude: latForMap, longitude: lngForMap, googlePlaceId: resolvedGpid });
        placesByGpid.set(resolvedGpid, { id: golden.canonical_id, slug: golden.slug, latitude: latForMap, longitude: lngForMap, googlePlaceId: resolvedGpid });
      }

      if (upserted % 100 === 0) {
        console.log(`Progress: ${upserted}/${goldenRecords.length}...`);
      }
    } catch (error: unknown) {
      errors++;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`✗ Failed to sync ${golden.name}:`, msg);
    }
  }

  if (Object.keys(unknownSourceCounts).length > 0) {
    console.log('\n[Confidence] Unknown source names (add to RAW_SOURCE_TO_CANONICAL if needed):', unknownSourceCounts);
  }

  let csvHeaderDeletedCount = 0;
  if (!dryRun) {
    const csvHeaderDeleted = await prisma.entities.deleteMany({
      where: {
        OR: [
          { slug: 'name', name: { in: ['name', 'Name'] } },
          { name: 'name', slug: 'name' },
          { name: 'Name', slug: 'name' },
        ],
      },
    });
    csvHeaderDeletedCount = csvHeaderDeleted.count;
    if (csvHeaderDeletedCount > 0) {
      console.log(`   Removed ${csvHeaderDeletedCount} CSV header-row place(s).`);
    }
  }

  const totalPlaces = dryRun ? existingPlaces.length + upserted : existingPlaces.length + upserted - csvHeaderDeletedCount;
  console.log(`\n--- Summary ---`);
  console.log(`   processed:       ${processed}`);
  console.log(`   matched_gpid:   ${matchedGpid}`);
  console.log(`   upserted:       ${upserted}`);
  console.log(`   skipped_no_gpid: ${skippedNoGpid}`);
  console.log(`   conflicts_gpid_vs_slug: ${conflictsGpidVsSlug}`);
  console.log(`   ambiguous:      ${ambiguous}`);
  console.log(`   errors:         ${errors}`);
  console.log(`   Total in places: ${totalPlaces}`);
  if (dryRun) {
    console.log(`   (Dry run — omit --dry-run to write.)`);
  }
}

async function main() {
  try {
    await syncGoldenToPlaces();
  } catch (error: unknown) {
    console.error('Error during sync:', error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('does not exist') || (error as { code?: string })?.code === 'P2021' || (error as { code?: string })?.code === 'P2022') {
      console.error('\nTip: Confirm DB target with npm run db:whoami. If schema is behind, run: npm run db:generate');
    }
    if ((error as { code?: string })?.code === 'P2002') {
      console.error('\nTip: Unique constraint (e.g. google_place_id): another place already has this id. Run sync again; idempotent logic will update instead of create.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
