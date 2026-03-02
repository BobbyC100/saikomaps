#!/usr/bin/env node
/**
 * Promote orphan entities → golden_records, then sync, then re-check KPI.
 *
 * Orphans = entities without a matching golden_record (by slug).
 * Only considers entities with google_place_id (required for backfill).
 *
 * Usage:
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/promote-orphans-to-golden.ts [--apply] [--limit N]
 *
 * Steps:
 *   1. Fetch orphan entity IDs (with GPID)
 *   2. Backfill golden_records from those entities
 *   3. Sync golden → places
 *   4. Re-check KPI (entities_without_golden count)
 */

import { db } from '@/lib/db';

const BATCH_SIZE = 20;

async function getOrphanIds(limit: number): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT e.id
    FROM entities e
    LEFT JOIN golden_records g ON g.slug = e.slug
    WHERE g.canonical_id IS NULL
      AND e.google_place_id IS NOT NULL
      AND btrim(COALESCE(e.google_place_id, '')) != ''
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}

async function getOrphanCount(): Promise<number> {
  const rows = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM entities e
    LEFT JOIN golden_records g ON g.slug = e.slug
    WHERE g.canonical_id IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function main(): Promise<void> {
  if (process.env.SAIKO_DB_FROM_WRAPPER !== '1') {
    console.error('Refusing to run: SAIKO_DB_FROM_WRAPPER must be 1. Use db-neon.sh or db-local.sh.');
    process.exit(1);
  }

  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 && argv[limitIdx + 1] ? parseInt(argv[limitIdx + 1], 10) : BATCH_SIZE;

  console.log('Promote orphans → golden, sync, re-check KPI\n');
  if (!apply) console.log('DRY RUN (no writes). Use --apply to persist.\n');

  // Step 1: Get orphan IDs
  const ids = await getOrphanIds(limit);
  if (ids.length === 0) {
    const total = await getOrphanCount();
    console.log(`No promotable orphans (entities with GPID but no golden). Total orphans: ${total}`);
    if (total > 0) {
      console.log('Remaining orphans may lack google_place_id — run backfill-golden-gpid-from-places first.');
    }
    return;
  }

  console.log(`Step 1: Found ${ids.length} promotable orphan IDs`);
  console.log(`  IDs: ${ids.join(',')}\n`);

  if (!apply) {
    console.log('Skipping backfill and sync (dry run).');
    const total = await getOrphanCount();
    console.log(`\nKPI: entities_without_golden = ${total}`);
    return;
  }

  // Step 2: Run backfill (inline logic to avoid subprocess)
  const { Prisma } = await import('@prisma/client');
  const { randomUUID } = await import('crypto');

  const rows = await db.entities.findMany({
    where: { id: { in: ids }, googlePlaceId: { not: null } },
    select: { id: true, slug: true, name: true, latitude: true, longitude: true, googlePlaceId: true },
  });

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

  if (toInsert.length > 0) {
    const result = await db.golden_records.createMany({
      data: toInsert,
      skipDuplicates: true,
    });
    console.log(`Step 2: Backfill inserted ${result.count} golden_records\n`);
  } else {
    console.log('Step 2: No rows to insert (all may already exist)\n');
  }

  // Step 3: Sync
  console.log('Step 3: Running sync-golden-to-places...');
  const { execSync } = await import('child_process');
  execSync('node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/sync-golden-to-places.ts', {
    stdio: 'inherit',
    env: { ...process.env, SAIKO_DB_FROM_WRAPPER: '1' },
  });

  // Step 4: Re-check KPI
  const kpi = await getOrphanCount();
  console.log(`\nStep 4: KPI — entities_without_golden = ${kpi}`);
  if (kpi > 0) {
    console.log(`\nRepeat: npm run promote:orphans:neon -- --apply [--limit ${limit}]`);
  } else {
    console.log('\nDone. No more orphans.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
