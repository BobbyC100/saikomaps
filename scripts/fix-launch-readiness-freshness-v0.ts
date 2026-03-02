#!/usr/bin/env node
/**
 * Fix Launch Readiness v0 — Freshness Pass
 *
 * Finds entities failing freshness in v_entity_launch_readiness_v0, refreshes
 * Google-derived cached data (getPlaceDetails), optionally writes readiness status.
 *
 * Uses config/env + config/db only.
 *
 * Usage:
 *   npx tsx scripts/fix-launch-readiness-freshness-v0.ts --limit 10
 *   npx tsx scripts/fix-launch-readiness-freshness-v0.ts --limit 10 --execute --write-status
 *
 * Options:
 *   --limit <n>       Max entities (default 25)
 *   --dry-run         Default true; no updates without --execute
 *   --execute         Required to perform updates
 *   --force           Refresh even if not missing freshness (top N by score)
 *   --write-status    After updates, write readiness to entity_coverage_status
 */

import { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { db } from '@/config/db';
import { getPlaceDetails } from '@/lib/google-places';

const RATE_LIMIT_MS = 250;
const DEFAULT_LIMIT = 25;

// ---------------------------------------------------------------------------
// Helpers (match coverage-apply.ts)
// ---------------------------------------------------------------------------
function formatHoursForStore(
  openingHours?: { openNow?: boolean; weekdayText?: string[] }
): object | null {
  if (!openingHours) return null;
  const hasOpenNow = typeof openingHours.openNow === 'boolean';
  const hasWeekdayText = openingHours.weekdayText?.length;
  if (!hasOpenNow && !hasWeekdayText) return null;
  return {
    ...(hasOpenNow && { openNow: openingHours.openNow }),
    ...(hasWeekdayText && { weekday_text: openingHours.weekdayText }),
  };
}

function formatPhotosForStore(
  photos: Array<{ photoReference: string; width?: number; height?: number }> | undefined,
  maxPhotos: number
): unknown[] | null {
  if (!photos?.length) return null;
  const capped = photos.slice(0, Math.min(maxPhotos, 10));
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
}

async function main() {
  const { limit, dryRun, execute, force, writeStatus } = parseArgs();

  const { host, database, user } = parseDatabaseUrl(env.DATABASE_URL);
  console.log('--- Fix Launch Readiness: Freshness v0 ---');
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

  // 1) Query candidates from view
  const candidates = force
    ? await prisma.$queryRaw<CandidateRow[]>`
        SELECT entity_id, name, score, missing
        FROM public.v_entity_launch_readiness_v0
        ORDER BY score DESC
        LIMIT ${limit}
      `
    : await prisma.$queryRaw<CandidateRow[]>`
        SELECT entity_id, name, score, missing
        FROM public.v_entity_launch_readiness_v0
        WHERE 'freshness' = any(missing)
        ORDER BY score DESC
        LIMIT ${limit}
      `;

  if (candidates.length === 0) {
    console.log('No candidates found.');
    await prisma.$disconnect();
    return;
  }

  const entityIds = candidates.map((c) => c.entity_id);
  const entities = await prisma.entities.findMany({
    where: { id: { in: entityIds } },
    select: { id: true, googlePlaceId: true, placesDataCachedAt: true },
  });
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  let refreshed = 0;
  let skipped = 0;
  const refreshedIds: string[] = [];

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const c of candidates) {
    const entity = entityMap.get(c.entity_id);
    const gpid = entity?.googlePlaceId?.trim();
    const cachedAt = entity?.placesDataCachedAt;

    if (!gpid || gpid.startsWith('cid:')) {
      if (dryRun) {
        console.log(`  ${c.entity_id} | ${c.name} | cached_at=${cachedAt ?? 'null'} | action=SKIP (no gpid)`);
      }
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  ${c.entity_id} | ${c.name} | cached_at=${cachedAt ?? 'null'} | action=REFRESH`);
      refreshed++;
      continue;
    }

    try {
      const details = await getPlaceDetails(gpid);
      await sleep(RATE_LIMIT_MS);

      const updates: {
        hours?: object;
        googlePhotos?: unknown[];
        businessStatus?: string;
        placesDataCachedAt: Date;
      } = {
        placesDataCachedAt: new Date(),
      };

      if (details) {
        if (details.businessStatus) updates.businessStatus = details.businessStatus;
        const hours = formatHoursForStore(details.openingHours);
        if (hours) updates.hours = hours;
        const photos = formatPhotosForStore(details.photos, 10);
        if (photos?.length) updates.googlePhotos = photos;
      }

      await prisma.entities.update({
        where: { id: c.entity_id },
        data: updates,
      });

      refreshed++;
      refreshedIds.push(c.entity_id);
      console.log(`  ✓ ${c.name} (${c.entity_id}) refreshed`);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      skipped++;
      console.warn(`  ✗ ${c.name} (${c.entity_id}): ${err}`);
    }
  }

  console.log('');
  console.log('--- Summary ---');
  console.log('total considered:', candidates.length);
  console.log('refreshed:', refreshed);
  console.log('skipped:', skipped);

  // 5) Write readiness status for affected entities
  if (writeStatus && execute && refreshedIds.length > 0) {
    console.log('');
    console.log('Writing readiness status for refreshed entities...');

    const readinessRows = await prisma.$queryRaw<
      { entity_id: string; score: number; is_launch_ready: boolean; missing: string[] }[]
    >(
      Prisma.sql`
        SELECT entity_id, score, is_launch_ready, missing
        FROM public.v_entity_launch_readiness_v0
        WHERE entity_id IN (${Prisma.join(refreshedIds)})
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
