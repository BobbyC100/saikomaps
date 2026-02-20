/**
 * Backfill places.google_place_id via Google Places Text Search API.
 *
 * Dry-run by default. Writes only with --apply.
 * Only updates empty google_place_id unless --force.
 *
 * Usage:
 *   npm run backfill:google-place-ids:neon -- --la-only [--apply] [--limit N] [--verbose]
 *   npm run backfill:google-place-ids:neon -- --all-missing [--apply] [--limit N]
 *   npm run backfill:google-place-ids:neon -- --slugs a,b,c [--apply]
 *   npm run backfill:google-place-ids:neon -- --ids id1,id2 [--apply]
 *
 * Requires: SAIKO_DB_FROM_WRAPPER=1, GOOGLE_PLACES_API_KEY, GOOGLE_PLACES_ENABLED=true
 */

import { db } from '@/lib/db';
import { findPlaceId } from '@/lib/google-places';

const RATE_LIMIT_MS = 200;

function parseArgs(): {
  apply: boolean;
  force: boolean;
  limit: number | null;
  slugs: string[] | null;
  ids: string[] | null;
  allMissing: boolean;
  laOnly: boolean;
  verbose: boolean;
} {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const force = argv.includes('--force');
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 && argv[limitIdx + 1] ? parseInt(argv[limitIdx + 1], 10) : null;
  const slugsIdx = argv.indexOf('--slugs');
  const slugs =
    slugsIdx >= 0 && argv[slugsIdx + 1]
      ? argv[slugsIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)
      : null;
  const idsIdx = argv.indexOf('--ids');
  const ids =
    idsIdx >= 0 && argv[idsIdx + 1]
      ? argv[idsIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)
      : null;
  const allMissing = argv.includes('--all-missing');
  const laOnly = argv.includes('--la-only');
  const verbose = argv.includes('--verbose');
  return { apply, force, limit, slugs, ids, allMissing, laOnly, verbose };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  if (process.env.SAIKO_DB_FROM_WRAPPER !== '1') {
    console.error('Refusing to run: SAIKO_DB_FROM_WRAPPER must be 1. Use db-neon.sh or db-local.sh.');
    process.exit(1);
  }

  const { apply, force, limit, slugs, ids, allMissing, laOnly, verbose } = parseArgs();

  const modeCount = [slugs?.length, ids?.length, allMissing, laOnly].filter(Boolean).length;
  if (modeCount === 0) {
    console.error('Specify one of: --slugs a,b,c | --ids id1,id2 | --all-missing | --la-only');
    process.exit(1);
  }
  if (modeCount > 1) {
    console.error('Specify only one of: --slugs | --ids | --all-missing | --la-only');
    process.exit(1);
  }

  console.log('Backfill places.google_place_id\n');
  if (!apply) console.log('DRY RUN (no writes). Use --apply to persist.\n');

  type PlaceRow = { id: string; slug: string; name: string; address: string | null; latitude: number | null; longitude: number | null; googlePlaceId: string | null };
  let places: PlaceRow[] = [];

  if (slugs?.length) {
    const rows = await db.places.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, name: true, address: true, latitude: true, longitude: true, googlePlaceId: true },
    });
    places = rows as PlaceRow[];
  } else if (ids?.length) {
    const rows = await db.places.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true, name: true, address: true, latitude: true, longitude: true, googlePlaceId: true },
    });
    places = rows as PlaceRow[];
  } else if (laOnly) {
    const rows = await db.$queryRaw<PlaceRow[]>`
      SELECT id, slug, name, address, latitude, longitude, google_place_id as "googlePlaceId"
      FROM public.v_places_la_bbox
      WHERE google_place_id IS NULL OR btrim(COALESCE(google_place_id,'')) = ''
    `;
    places = limit ? rows.slice(0, limit) : rows;
  } else {
    const rows = await db.places.findMany({
      where: { OR: [{ googlePlaceId: null }, { googlePlaceId: '' }] },
      take: limit ?? undefined,
      select: { id: true, slug: true, name: true, address: true, latitude: true, longitude: true, googlePlaceId: true },
    });
    places = rows as PlaceRow[];
  }

  let wouldUpdate = 0;
  let updated = 0;
  let notFound = 0;

  for (const p of places) {
    const isEmpty = !p.googlePlaceId?.trim();
    if (!force && !isEmpty) continue;

    const lat = p.latitude != null ? Number(p.latitude) : null;
    const lng = p.longitude != null ? Number(p.longitude) : null;
    if (lat == null || lng == null) {
      if (verbose) console.log(`  ${p.slug}: SKIP (no lat/lng)`);
      continue;
    }

    const query = [p.name, p.address].filter(Boolean).join(', ');
    if (!query.trim()) {
      if (verbose) console.log(`  ${p.slug}: SKIP (no name/address)`);
      continue;
    }

    try {
      const placeId = await findPlaceId(query, lat, lng);
      await sleep(RATE_LIMIT_MS);

      if (placeId) {
        if (verbose) console.log(`  ${p.slug}: ${placeId}`);
        wouldUpdate++;
        if (apply) {
          await db.places.update({ where: { id: p.id }, data: { googlePlaceId: placeId } });
          updated++;
        }
      } else {
        console.log(`  ${p.slug}: NOT_FOUND`);
        notFound++;
      }
    } catch (e) {
      console.error(`  ${p.slug}: ERROR ${String(e)}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log('scanned:', places.length);
  console.log(apply ? `updated: ${updated}` : `would_update: ${wouldUpdate}`);
  console.log('not_found:', notFound);
  console.log('\nOK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
