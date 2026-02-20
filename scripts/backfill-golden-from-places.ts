/**
 * Backfill golden_records from places (additive only).
 *
 * Use when golden_records is empty but places has rows with google_place_id.
 * Enables v_places_la_bbox_golden to return rows.
 *
 * Dry-run by default. Writes only with --apply.
 * Uses createMany with skipDuplicates (equivalent to ON CONFLICT DO NOTHING on slug).
 *
 * Usage:
 *   npm run backfill:golden-from-places:neon -- --la-only [--apply] [--limit N]
 *   npm run backfill:golden-from-places:neon -- --ids id1,id2 [--apply]
 *
 * Requires: SAIKO_DB_FROM_WRAPPER=1
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

function parseArgs(): {
  apply: boolean;
  limit: number | null;
  ids: string[] | null;
  laOnly: boolean;
} {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 && argv[limitIdx + 1] ? parseInt(argv[limitIdx + 1], 10) : null;
  const idsIdx = argv.indexOf('--ids');
  const ids =
    idsIdx >= 0 && argv[idsIdx + 1]
      ? argv[idsIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)
      : null;
  const laOnly = argv.includes('--la-only');
  return { apply, limit, ids, laOnly };
}

async function main(): Promise<void> {
  if (process.env.SAIKO_DB_FROM_WRAPPER !== '1') {
    console.error('Refusing to run: SAIKO_DB_FROM_WRAPPER must be 1. Use db-neon.sh or db-local.sh.');
    process.exit(1);
  }

  const { apply, limit, ids, laOnly } = parseArgs();

  const modeCount = [ids?.length, laOnly].filter(Boolean).length;
  if (modeCount > 1) {
    console.error('Specify only one of: --ids | --la-only');
    process.exit(1);
  }

  console.log('Backfill golden_records from places\n');
  if (!apply) console.log('DRY RUN (no writes). Use --apply to persist.\n');

  type Row = { id: string; slug: string; name: string; latitude: unknown; longitude: unknown; googlePlaceId: string | null };
  let rows: Row[] = [];

  if (ids?.length) {
    const res = await db.places.findMany({
      where: { id: { in: ids }, googlePlaceId: { not: null } },
      select: { id: true, slug: true, name: true, latitude: true, longitude: true, googlePlaceId: true },
    });
    rows = res as Row[];
  } else if (laOnly) {
    const res = await db.$queryRaw<Row[]>`
      SELECT id, slug, name, latitude, longitude, google_place_id as "googlePlaceId"
      FROM public.v_places_la_bbox
      WHERE google_place_id IS NOT NULL AND btrim(COALESCE(google_place_id,'')) != ''
    `;
    rows = limit ? res.slice(0, limit) : res;
  } else {
    console.error('Specify --la-only or --ids id1,id2');
    process.exit(1);
  }

  const toInsert = rows.map((r) => {
    const lat = r.latitude != null ? Number(r.latitude) : 0;
    const lng = r.longitude != null ? Number(r.longitude) : 0;
    return {
      canonical_id: randomUUID(),
      slug: r.slug,
      name: r.name,
      lat: new Prisma.Decimal(lat),
      lng: new Prisma.Decimal(lng),
      google_place_id: r.googlePlaceId?.trim() || null,
      source_attribution: {} as Prisma.JsonValue,
      cuisines: [] as string[],
      vibe_tags: [] as string[],
      signature_dishes: [] as string[],
      pro_tips: [] as string[],
    };
  });

  console.log(`would_insert: ${toInsert.length}`);
  for (const r of toInsert) {
    console.log(`  ${r.slug} (${r.name}) → google_place_id=${r.google_place_id ?? 'null'}`);
  }

  if (apply && toInsert.length > 0) {
    const result = await db.golden_records.createMany({
      data: toInsert,
      skipDuplicates: true,
    });
    console.log(`\ninserted: ${result.count}`);
  }

  console.log('\nOK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
