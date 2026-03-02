#!/usr/bin/env node
/**
 * Fix Launch Readiness v0 — Photos Pass
 *
 * Ensures entities.googlePhotos has ≥ 1 item by fetching from Google Place Details
 * and updating the entity. Canonical = entities.googlePhotos (entity_photo_eval not required for v0).
 *
 * Optimization: Prefer entities refreshed within last 24h (placesDataCachedAt) to reuse
 * freshest Google payload first; then by score desc.
 *
 * Uses config/env + config/db only.
 *
 * Usage:
 *   npx tsx scripts/fix-launch-readiness-photos-v0.ts --limit 10
 *   npx tsx scripts/fix-launch-readiness-photos-v0.ts --limit 10 --execute --write-status
 *
 * Options:
 *   --limit <n>       Max entities (default 25)
 *   --dry-run         Default true; no updates without --execute
 *   --execute         Required to perform updates
 *   --force           Refresh photos even if already present
 *   --write-status    After updates, write readiness to entity_coverage_status
 */

import { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { db } from '@/config/db';
import { getPlaceDetails } from '@/lib/google-places';

const RATE_LIMIT_MS = 250;
const DEFAULT_LIMIT = 25;
const MAX_PHOTOS_PER_PLACE = 10;

type Outcome =
  | 'UPDATED_PHOTOS'
  | 'SKIP_ALREADY_HAS_PHOTOS'
  | 'SKIP_NO_GPID'
  | 'SKIP_NO_PHOTOS'
  | 'ERROR';

// ---------------------------------------------------------------------------
// Photo format (same as coverage-apply / fix-launch-readiness-freshness)
// ---------------------------------------------------------------------------
function formatPhotosForStore(
  photos: Array<{ photoReference: string; width?: number; height?: number }> | undefined,
  maxPhotos: number
): unknown[] | null {
  if (!photos?.length) return null;
  const capped = photos.slice(0, Math.min(maxPhotos, MAX_PHOTOS_PER_PLACE));
  return capped.map((p) => ({
    photo_reference: p.photoReference,
    photoReference: p.photoReference,
    width: p.width,
    height: p.height,
  }));
}

function parseDatabaseUrl(url: string | undefined): { host: string; database: string; user: string } {
  if (!url || typeof url !== 'string') return { host: '', database: '', user: '' };
  try {
    const raw = url.trim().replace(/^["']|["']$/g, '');
    const userMatch = raw.match(/^postgres(?:ql)?:\/\/([^:]+)(?::)/);
    const hostMatch = raw.match(/@([^/:@]+)(?::\d+)?(?:\/([^?]*))?/);
    const host = hostMatch?.[1]?.trim() ?? '';
    const database = (hostMatch?.[2] ?? '').split('?')[0].trim() || '';
    const user = userMatch?.[1] ?? '';
    return { host, database, user };
  } catch {
    return { host: '', database: '', user: '' };
  }
}

function parseArgs(): {
  limit: number;
  dryRun: boolean;
  execute: boolean;
  force: boolean;
  writeStatus: boolean;
} {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((a) => a.startsWith('--limit=')) ?? argv.find((a) => a === '--limit');
  const limit = limitArg
    ? parseInt(
        limitArg.includes('=') ? limitArg.split('=')[1] ?? '' : argv[argv.indexOf('--limit') + 1] ?? '',
        10
      ) || DEFAULT_LIMIT
    : DEFAULT_LIMIT;
  const dryRun = !argv.includes('--execute');
  const execute = argv.includes('--execute');
  const force = argv.includes('--force');
  const writeStatus = argv.includes('--write-status');

  return { limit, dryRun, execute, force, writeStatus };
}

interface CandidateRow {
  entity_id: string;
  name: string;
  score: number;
  missing: string[];
  places_data_cached_at: Date | null;
  google_place_id: string | null;
  google_photos_n: number | null;
}

async function main() {
  const { limit, dryRun, execute, force, writeStatus } = parseArgs();

  const { host, database, user } = parseDatabaseUrl(env.DATABASE_URL);
  console.log('--- Fix Launch Readiness: Photos v0 ---');
  console.log('DB_ENV:', env.DB_ENV);
  console.log('host:', host || '(unparseable)');
  console.log('database:', database || '(unparseable)');
  console.log('user:', user || '(unparseable)');
  console.log('timestamp:', new Date().toISOString());
  console.log('');

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY is not set. Add to .env.local');
    process.exit(1);
  }

  const prisma = db.admin;

  // Step 1 — Fetch candidates from view (join entities for places_data_cached_at, google_photos)
  // Ordering: 1) refreshed within 24h (most recent first), 2) then by score desc
  const candidates = force
    ? await prisma.$queryRaw<CandidateRow[]>(
        Prisma.sql`
          SELECT v.entity_id, v.name, v.score, v.missing, e.places_data_cached_at, e.google_place_id,
                 jsonb_array_length(e.google_photos) AS google_photos_n
          FROM public.v_entity_launch_readiness_v0 v
          JOIN public.entities e ON e.id = v.entity_id
          ORDER BY
            CASE WHEN e.places_data_cached_at >= (now() - interval '24 hours') THEN 0 ELSE 1 END,
            e.places_data_cached_at DESC NULLS LAST,
            v.score DESC
          LIMIT ${limit}
        `
      )
    : await prisma.$queryRaw<CandidateRow[]>(
        Prisma.sql`
          SELECT v.entity_id, v.name, v.score, v.missing, e.places_data_cached_at, e.google_place_id,
                 jsonb_array_length(e.google_photos) AS google_photos_n
          FROM public.v_entity_launch_readiness_v0 v
          JOIN public.entities e ON e.id = v.entity_id
          WHERE 'photos' = any(v.missing)
          ORDER BY
            CASE WHEN e.places_data_cached_at >= (now() - interval '24 hours') THEN 0 ELSE 1 END,
            e.places_data_cached_at DESC NULLS LAST,
            v.score DESC
          LIMIT ${limit}
        `
      );

  if (candidates.length === 0) {
    console.log('No candidates found.');
    await prisma.$disconnect();
    return;
  }

  const outcomes: Record<Outcome, number> = {
    UPDATED_PHOTOS: 0,
    SKIP_ALREADY_HAS_PHOTOS: 0,
    SKIP_NO_GPID: 0,
    SKIP_NO_PHOTOS: 0,
    ERROR: 0,
  };
  const affectedIds: string[] = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const c of candidates) {
    const gpid = c.google_place_id?.trim();
    const existingCount = c.google_photos_n ?? 0;

    if (!gpid || gpid.startsWith('cid:')) {
      console.log(`  ${c.entity_id} | ${c.name} | photos=${existingCount} | SKIP_NO_GPID`);
      outcomes.SKIP_NO_GPID++;
      continue;
    }

    try {
      const details = await getPlaceDetails(gpid);
      await sleep(RATE_LIMIT_MS);

      const photos = formatPhotosForStore(details?.photos, MAX_PHOTOS_PER_PLACE);
      if (!photos?.length) {
        console.log(`  ${c.entity_id} | ${c.name} | photos=${existingCount} | SKIP_NO_PHOTOS`);
        outcomes.SKIP_NO_PHOTOS++;
        continue;
      }

      const shouldUpdate = force || existingCount === 0;

      if (!shouldUpdate) {
        console.log(`  ${c.entity_id} | ${c.name} | photos=${existingCount} | SKIP_ALREADY_HAS_PHOTOS`);
        outcomes.SKIP_ALREADY_HAS_PHOTOS++;
        continue;
      }

      if (dryRun) {
        console.log(`  ${c.entity_id} | ${c.name} | photos=${existingCount} | UPDATED_PHOTOS (dry)`);
        outcomes.UPDATED_PHOTOS++;
        affectedIds.push(c.entity_id);
        continue;
      }

      await prisma.entities.update({
        where: { id: c.entity_id },
        data: {
          googlePhotos: photos as object,
          placesDataCachedAt: new Date(),
        },
      });

      console.log(`  ${c.entity_id} | ${c.name} | photos=${existingCount}→${photos.length} | UPDATED_PHOTOS`);
      outcomes.UPDATED_PHOTOS++;
      affectedIds.push(c.entity_id);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      console.warn(`  ${c.entity_id} | ${c.name} | photos=${existingCount} | ERROR: ${err}`);
      outcomes.ERROR++;
    }
  }

  console.log('');
  console.log('--- Summary ---');
  console.log('total considered:', candidates.length);
  console.log('updated:', outcomes.UPDATED_PHOTOS);
  for (const [k, v] of Object.entries(outcomes)) {
    if (k !== 'UPDATED_PHOTOS' && v > 0) console.log(`  ${k}: ${v}`);
  }

  // Optional readiness writeback
  if (writeStatus && execute && affectedIds.length > 0) {
    console.log('');
    console.log('Writing readiness status for affected entities...');

    const readinessRows = await prisma.$queryRaw<
      { entity_id: string; score: number; is_launch_ready: boolean; missing: string[] }[]
    >(
      Prisma.sql`
        SELECT entity_id, score, is_launch_ready, missing
        FROM public.v_entity_launch_readiness_v0
        WHERE entity_id IN (${Prisma.join(affectedIds)})
      `
    );

    let updated = 0;
    let created = 0;
    for (const r of readinessRows) {
      const status = r.is_launch_ready ? 'LAUNCH_READY' : 'NEEDS_WORK';
      const missing = (r.missing ?? []) as string[];
      const missingJson = missing.length > 0 ? missing : null;

      const existing = await prisma.entity_coverage_status.findFirst({
        where: { entityId: r.entity_id },
      });

      const data = {
        launchReadinessScore: r.score,
        launchReadinessStatus: status,
        launchReadinessComputedAt: new Date(),
        launchReadinessMissing: missingJson as object | null,
      };

      if (existing) {
        await prisma.entity_coverage_status.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await prisma.entity_coverage_status.create({
          data: {
            entityId: r.entity_id,
            dedupe_key: `launch_readiness:${r.entity_id}`,
            ...data,
          },
        });
        created++;
      }
    }
    console.log(`  updated: ${updated}, created: ${created}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
