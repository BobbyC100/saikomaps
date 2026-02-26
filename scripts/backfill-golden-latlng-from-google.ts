/**
 * Backfill golden_records lat/lng from Google Places API
 *
 * Target: golden_records where (lat=0 or null OR lng=0 or null) AND google_place_id IS NOT NULL
 * Fetches Place Details, extracts geometry.location, writes back to golden_records.
 *
 * Neon-safe: run via db-neon.sh. Rate-limited, batched.
 *
 * Usage:
 *   npm run backfill:golden-latlng:neon [-- --limit 50] [--sync] [--dry-run]
 *   npm run backfill:golden-latlng:local [-- --limit 25] [--sync]
 *
 * Requires: GOOGLE_PLACES_API_KEY, GOOGLE_PLACES_ENABLED=true, DATABASE_URL
 */

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getPlaceDetails } from '@/lib/google-places';

const RATE_LIMIT_MS = 200;
const DEFAULT_LIMIT = 50;

function parseArgs(): { limit: number; dryRun: boolean; sync: boolean } {
  const argv = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  const limitArg = argv.find((a) => a.startsWith('--limit'));
  if (limitArg) {
    const val = limitArg.includes('=') ? limitArg.split('=')[1] : argv[argv.indexOf(limitArg) + 1];
    limit = parseInt(val ?? '', 10) || DEFAULT_LIMIT;
  }
  return {
    limit,
    dryRun: argv.includes('--dry-run'),
    sync: argv.includes('--sync'),
  };
}

function isValidCoord(v: unknown): boolean {
  if (v == null) return false;
  const n = Number(v);
  return !Number.isNaN(n) && n !== 0;
}

async function main() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set.');
    process.exit(1);
  }
  if (process.env.GOOGLE_PLACES_ENABLED !== 'true') {
    console.error('❌ GOOGLE_PLACES_ENABLED must be true. Set in .env or .env.local');
    process.exit(1);
  }

  const { limit, dryRun, sync } = parseArgs();

  console.log('Backfill golden_records lat/lng from Google Places API\n');
  if (dryRun) console.log('DRY RUN (no writes)\n');

  const toUpdate = await db.$queryRaw<
    { canonical_id: string; slug: string; google_place_id: string | null }[]
  >`
    SELECT g.canonical_id, g.slug,
      COALESCE(NULLIF(btrim(g.google_place_id), ''), NULLIF(btrim(p.google_place_id), '')) AS google_place_id
    FROM golden_records g
    LEFT JOIN places p ON p.slug = g.slug AND p.google_place_id IS NOT NULL AND btrim(p.google_place_id) != ''
    WHERE (g.lat IS NULL OR g.lng IS NULL OR g.lat::float = 0 OR g.lng::float = 0)
      AND (
        (g.google_place_id IS NOT NULL AND btrim(COALESCE(g.google_place_id, '')) != '')
        OR (p.google_place_id IS NOT NULL AND btrim(p.google_place_id) != '')
      )
    ORDER BY g.canonical_id
    LIMIT ${limit}
  `;

  const gpids = toUpdate
    .map((r) => r.google_place_id?.trim())
    .filter(Boolean) as string[];

  const uniqueGpids = [...new Set(gpids)];

  console.log(`Eligible: ${toUpdate.length} rows (${uniqueGpids.length} unique google_place_ids)`);
  console.log(`Limit: ${limit}\n`);

  let updated = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};

  for (const row of toUpdate) {
    const gpid = row.google_place_id?.trim();
    if (!gpid) {
      skipped++;
      skipReasons['no_google_place_id'] = (skipReasons['no_google_place_id'] ?? 0) + 1;
      continue;
    }

    try {
      const details = await getPlaceDetails(gpid);
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));

      if (!details?.location) {
        skipped++;
        skipReasons['not_found_or_no_location'] = (skipReasons['not_found_or_no_location'] ?? 0) + 1;
        if (skipped <= 5) {
          console.warn(`  Skip ${row.slug}: NOT_FOUND or no geometry`);
        }
        continue;
      }

      const { lat, lng } = details.location;
      if (!isValidCoord(lat) || !isValidCoord(lng)) {
        skipped++;
        skipReasons['invalid_coords'] = (skipReasons['invalid_coords'] ?? 0) + 1;
        continue;
      }

      if (!dryRun) {
        await db.golden_records.update({
          where: { canonical_id: row.canonical_id },
          data: {
            lat: new Prisma.Decimal(lat),
            lng: new Prisma.Decimal(lng),
          },
        });
      }
      updated++;
      if (updated <= 10) {
        console.log(`  ✓ ${row.slug} → ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (e) {
      skipped++;
      const msg = e instanceof Error ? e.message : String(e);
      skipReasons[msg.slice(0, 50)] = (skipReasons[msg.slice(0, 50)] ?? 0) + 1;
      if (skipped <= 5) {
        console.warn(`  ✗ ${row.slug}: ${msg}`);
      }
    }
  }

  console.log(`\n--- Backfill complete ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  if (Object.keys(skipReasons).length) {
    console.log(`Skip reasons: ${JSON.stringify(skipReasons)}`);
  }

  const [goldenWithCoordsRes, placesWithCoords, laBboxCount] = await Promise.all([
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM golden_records
      WHERE lat IS NOT NULL AND lng IS NOT NULL
        AND lat::float != 0 AND lng::float != 0
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM places
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND latitude::float != 0 AND longitude::float != 0
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM v_places_la_bbox
    `,
  ]);

  console.log(`\n--- Post-run counts ---`);
  console.log(`golden_records with valid coords: ${Number(goldenWithCoordsRes[0]?.count ?? 0)}`);
  console.log(`places with valid coords: ${Number(placesWithCoords[0]?.count ?? 0)} (run sync:places to refresh)`);
  console.log(`v_places_la_bbox: ${Number(laBboxCount[0]?.count ?? 0)}`);

  if (updated > 0 && !dryRun && sync) {
    console.log(`\nRunning sync:places to propagate coords...`);
    const { execSync } = await import('child_process');
    execSync('npm run sync:places', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });
    const [placesAfter, laAfter] = await Promise.all([
      db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM places
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          AND latitude::float != 0 AND longitude::float != 0
      `,
      db.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM v_places_la_bbox`,
    ]);
    console.log(`\n--- After sync:places ---`);
    console.log(`places with valid coords: ${Number(placesAfter[0]?.count ?? 0)}`);
    console.log(`v_places_la_bbox: ${Number(laAfter[0]?.count ?? 0)}`);
  } else if (updated > 0 && !dryRun) {
    console.log(`\nRun sync:places to propagate coords: npm run sync:places (or --sync flag)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
