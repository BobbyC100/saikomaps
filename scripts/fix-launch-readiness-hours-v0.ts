#!/usr/bin/env node
/**
 * Fix Launch Readiness v0 — Hours Pass
 *
 * Ensures entities have an ACTIVE place_appearance with schedule_text populated
 * by fetching hours from Google Place Details and upserting into entity_appearances.
 *
 * Optimization: Prefer entities refreshed within last 24h (placesDataCachedAt) to reuse
 * freshest Google payload first; then by score desc.
 *
 * Uses config/env + config/db only.
 *
 * Usage:
 *   npx tsx scripts/fix-launch-readiness-hours-v0.ts --limit 10
 *   npx tsx scripts/fix-launch-readiness-hours-v0.ts --limit 10 --execute --write-status
 *
 * Options:
 *   --limit <n>       Max entities (default 25)
 *   --dry-run         Default true; no updates without --execute
 *   --execute         Required to perform updates
 *   --force           Rewrite hours even if present
 *   --write-status    After updates, write readiness to entity_coverage_status
 */

import { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { db } from '@/config/db';
import { getPlaceDetails } from '@/lib/google-places';

const RATE_LIMIT_MS = 250;
const DEFAULT_LIMIT = 25;

type Outcome =
  | 'UPDATED_EXISTING_APPEARANCE'
  | 'CREATED_APPEARANCE'
  | 'SKIP_ALREADY_HAS_HOURS'
  | 'SKIP_NO_GPID'
  | 'SKIP_NO_HOURS'
  | 'ERROR';

// ---------------------------------------------------------------------------
// Format weekday_text to schedule_text (v0 locked format)
// Mon: 8am–3pm, Tue: Closed, Fri: 8am–2pm, 5pm–10pm
// ---------------------------------------------------------------------------
function formatWeekdayTextToScheduleText(weekdayText: string[] | undefined): string | null {
  if (!weekdayText?.length) return null;

  const dayMap: Record<string, string> = {
    Sunday: 'Sun',
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
  };

  const lines = weekdayText.map((line) => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) return line;
    const day = dayMap[match[1]] ?? match[1].slice(0, 3);
    let timePart = match[2].trim();
    if (/closed/i.test(timePart)) return `${day}: Closed`;
    // Normalize: 8:00 AM -> 8am, 3:00 PM -> 3pm
    timePart = timePart.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, (_, h, m, ap) => {
      const suffix = (ap ?? '').toLowerCase();
      if (m === '00') return `${parseInt(h, 10)}${suffix}`;
      return `${h}:${m}${suffix}`;
    });
    return `${day}: ${timePart}`;
  });

  const result = lines.join('\n').trim();
  return result || null;
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
}

async function main() {
  const { limit, dryRun, execute, force, writeStatus } = parseArgs();

  const { host, database, user } = parseDatabaseUrl(env.DATABASE_URL);
  console.log('--- Fix Launch Readiness: Hours v0 ---');
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

  // Step 1 — Fetch candidates from view (join entities for places_data_cached_at)
  // Ordering: 1) refreshed within 24h (most recent first), 2) then by score desc
  const candidates = force
    ? await prisma.$queryRaw<CandidateRow[]>(
        Prisma.sql`
          SELECT v.entity_id, v.name, v.score, v.missing, e.places_data_cached_at, e.google_place_id
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
          SELECT v.entity_id, v.name, v.score, v.missing, e.places_data_cached_at, e.google_place_id
          FROM public.v_entity_launch_readiness_v0 v
          JOIN public.entities e ON e.id = v.entity_id
          WHERE 'hours' = any(v.missing)
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

  const entityIds = candidates.map((c) => c.entity_id);
  const entities = await prisma.entities.findMany({
    where: { id: { in: entityIds } },
    select: {
      id: true,
      googlePlaceId: true,
      latitude: true,
      longitude: true,
      address: true,
    },
  });
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  const outcomes: Record<Outcome, number> = {
    UPDATED_EXISTING_APPEARANCE: 0,
    CREATED_APPEARANCE: 0,
    SKIP_ALREADY_HAS_HOURS: 0,
    SKIP_NO_GPID: 0,
    SKIP_NO_HOURS: 0,
    ERROR: 0,
  };
  const affectedIds: string[] = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const c of candidates) {
    const gpid = (c.google_place_id ?? entityMap.get(c.entity_id)?.googlePlaceId)?.trim();

    if (!gpid || gpid.startsWith('cid:')) {
      console.log(`  ${c.entity_id} | ${c.name} | SKIP_NO_GPID`);
      outcomes.SKIP_NO_GPID++;
      continue;
    }

    try {
      const details = await getPlaceDetails(gpid);
      await sleep(RATE_LIMIT_MS);

      const scheduleText = formatWeekdayTextToScheduleText(details?.openingHours?.weekdayText);
      if (!scheduleText) {
        console.log(`  ${c.entity_id} | ${c.name} | SKIP_NO_HOURS`);
        outcomes.SKIP_NO_HOURS++;
        continue;
      }

      // Step 3 — Find existing ACTIVE appearance
      const existingAsSubject = await prisma.entity_appearances.findFirst({
        where: { subjectEntityId: c.entity_id, status: 'ACTIVE' },
      });
      const existingAsHost = existingAsSubject
        ? null
        : await prisma.entity_appearances.findFirst({
            where: { hostEntityId: c.entity_id, status: 'ACTIVE' },
          });
      const existing = existingAsSubject ?? existingAsHost;

      const shouldUpdate = force || !existing?.scheduleText?.trim();

      if (existing && !shouldUpdate) {
        console.log(`  ${c.entity_id} | ${c.name} | SKIP_ALREADY_HAS_HOURS`);
        outcomes.SKIP_ALREADY_HAS_HOURS++;
        continue;
      }

      if (dryRun) {
        if (existing) {
          console.log(`  ${c.entity_id} | ${c.name} | UPDATED_EXISTING_APPEARANCE (dry)`);
        } else {
          console.log(`  ${c.entity_id} | ${c.name} | CREATED_APPEARANCE (dry)`);
        }
        outcomes[existing ? 'UPDATED_EXISTING_APPEARANCE' : 'CREATED_APPEARANCE']++;
        affectedIds.push(c.entity_id);
        continue;
      }

      const sources = {
        hours_source: 'google',
        fetched_at: new Date().toISOString(),
        google_place_id: gpid,
      };

      if (existing) {
        await prisma.entity_appearances.update({
          where: { id: existing.id },
          data: { scheduleText, sources: sources as object, updatedAt: new Date() },
        });
        console.log(`  ${c.entity_id} | ${c.name} | UPDATED_EXISTING_APPEARANCE`);
        outcomes.UPDATED_EXISTING_APPEARANCE++;
      } else {
        // entity_appearances_location_check: need host_entity_id OR (lat AND lng AND address_text)
        const ent = entityMap.get(c.entity_id);
        const hasLocation =
          ent?.latitude != null &&
          ent?.longitude != null &&
          ent?.address != null &&
          ent.address.trim() !== '';

        if (!hasLocation) {
          console.log(`  ${c.entity_id} | ${c.name} | ERROR (entity missing lat/lng/address for entity_appearances_location_check)`);
          outcomes.ERROR++;
          continue;
        }

        await prisma.entity_appearances.create({
          data: {
            subjectEntityId: c.entity_id,
            scheduleText,
            status: 'ACTIVE',
            sources: sources as object,
            latitude: ent.latitude!,
            longitude: ent.longitude!,
            addressText: ent.address!,
          },
        });
        console.log(`  ${c.entity_id} | ${c.name} | CREATED_APPEARANCE`);
        outcomes.CREATED_APPEARANCE++;
      }
      affectedIds.push(c.entity_id);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      console.warn(`  ${c.entity_id} | ${c.name} | ERROR: ${err}`);
      outcomes.ERROR++;
    }
  }

  console.log('');
  console.log('--- Summary ---');
  for (const [k, v] of Object.entries(outcomes)) {
    if (v > 0) console.log(`  ${k}: ${v}`);
  }

  // Step 4 — Optional readiness writeback
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
