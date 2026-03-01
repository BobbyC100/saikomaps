/**
 * Coverage Run v1 — READ-ONLY audit + deterministic candidate selection
 *
 * Usage:
 *   REQUIRE_DB_HOST=localhost REQUIRE_DB_NAME=saiko_maps npm run coverage:run:local
 *   REQUIRE_DB_HOST=ep-spring-sun... REQUIRE_DB_NAME=neondb npm run coverage:run:neon
 *
 * --la-only   Filter to LA bbox (default: true)
 * --limit=N   Max places to consider (default: 200)
 *
 * Env:
 *   REQUIRE_DB_HOST    If set, fail unless DATABASE_URL host matches
 *   REQUIRE_DB_NAME    If set, fail unless DATABASE_URL dbname matches
 *   COVERAGE_TTL_DAYS  Days after success to skip re-coverage (default: 90)
 *   RETRY_BACKOFF_HOURS Hours after FAIL to skip retry (default: 24)
 *
 * Output:
 *   data/coverage/coverage_run__YYYYMMDD_HHMMSS.json
 *   Terminal summary with DB identity, PRL counts, missing groups, top 20 candidates, duplicates
 */

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const COVERAGE_MISSING_GROUPS = [
  'NEED_HOURS',
  'NEED_GOOGLE_ATTRS',
  'NEED_GOOGLE_PHOTOS',
  'NEED_DESCRIPTION',
  'NEED_TAG_SIGNALS',
] as const;

export type MissingGroup = (typeof COVERAGE_MISSING_GROUPS)[number];

export interface CoverageCandidate {
  place_id: string;
  slug: string;
  name: string;
  google_place_id: string | null;
  dedupe_key: string;
  missing_groups: MissingGroup[];
  reason: string;
}

export interface DuplicateGroup {
  key: 'google_place_id' | 'slug';
  value: string;
  place_ids: string[];
  slugs: string[];
}

export interface CoverageRunReport {
  run_id: string;
  created_at: string; // ISO
  db_identity: {
    host: string;
    dbname: string;
    database_url_host: string;
    database_url_dbname: string;
  };
  params: {
    limit: number;
    la_only: boolean;
    ttl_days: number;
    retry_backoff_hours: number;
  };
  counts: {
    total_places: number;
    by_prl: Record<string, number>;
    by_missing_group: Record<string, number>;
    candidates_count: number;
    excluded_by_ttl: number;
    excluded_by_backoff: number;
    excluded_by_running: number;
    excluded_by_complete: number;
  };
  candidates: CoverageCandidate[];
  duplicate_groups: DuplicateGroup[];
  top_20_candidates: CoverageCandidate[];
}

// ---------------------------------------------------------------------------
// DB identity + source-of-truth enforcement
// ---------------------------------------------------------------------------

function parseDatabaseUrl(): { host: string; dbname: string } {
  const u = process.env.DATABASE_URL ?? '';
  // postgresql://user:pass@host:port/dbname?sslmode=...
  const hostMatch = u.match(/@([^/]+)\//);
  const dbMatch = u.match(/@[^/]+\/([^?]+)/);
  const host = hostMatch ? hostMatch[1] : '?';
  const dbname = dbMatch ? dbMatch[1] : '?';
  return { host, dbname };
}

function hostMatches(parsed: string, required: string): boolean {
  if (parsed === required) return true;
  return parsed.startsWith(required + ':');
}

function assertDbIdentity(): { host: string; dbname: string } {
  const { host, dbname } = parseDatabaseUrl();
  const requireHost = process.env.REQUIRE_DB_HOST;
  const requireName = process.env.REQUIRE_DB_NAME;

  if (requireHost && !hostMatches(host, requireHost)) {
    console.error(
      `[COVERAGE RUN] Source-of-truth mismatch: REQUIRE_DB_HOST=${requireHost} but DATABASE_URL host is "${host}"`
    );
    console.error(`  DATABASE_URL host: ${host}`);
    console.error(`  Failing to prevent operating on wrong database.`);
    process.exit(1);
  }
  if (requireName && dbname !== requireName) {
    console.error(
      `[COVERAGE RUN] Source-of-truth mismatch: REQUIRE_DB_NAME=${requireName} but DATABASE_URL dbname is "${dbname}"`
    );
    console.error(`  DATABASE_URL dbname: ${dbname}`);
    console.error(`  Failing to prevent operating on wrong database.`);
    process.exit(1);
  }

  return { host, dbname };
}

// ---------------------------------------------------------------------------
// LA bbox (same as prl-materialize)
// ---------------------------------------------------------------------------

const LA_BBOX = {
  latMin: 33.7,
  latMax: 34.2,
  lngMin: -118.7,
  lngMax: -118.1,
};

// ---------------------------------------------------------------------------
// Missing group logic (aligned with PRL materializer fields)
// ---------------------------------------------------------------------------

function nonTrivialText(s: string | null | undefined, minLen = 40): boolean {
  if (!s) return false;
  return s.trim().length >= minLen;
}

function computeMissingGroups(place: {
  hours: unknown;
  googlePlacesAttributes: unknown;
  googlePhotos: unknown;
  description: string | null;
  pullQuote: string | null;
  vibeTags: string[];
  has_energy?: boolean;
  has_pts?: boolean;
  curatorNote?: string | null;
}): MissingGroup[] {
  const missing: MissingGroup[] = [];

  if (!place.hours) missing.push('NEED_HOURS');

  const attrs = place.googlePlacesAttributes as Record<string, unknown> | null;
  const hasAttrs =
    attrs &&
    typeof attrs === 'object' &&
    (Object.keys(attrs).length > 0 || attrs.types != null);

  if (!hasAttrs) missing.push('NEED_GOOGLE_ATTRS');

  const photosArr = place.googlePhotos as unknown[] | null;
  const photosCount = Array.isArray(photosArr) ? photosArr.length : 0;
  if (photosCount === 0) missing.push('NEED_GOOGLE_PHOTOS');

  const hasDesc =
    nonTrivialText(place.description) ||
    nonTrivialText(place.curatorNote) ||
    nonTrivialText(place.pullQuote);
  if (!hasDesc) missing.push('NEED_DESCRIPTION');

  const hasTagSignals =
    place.has_energy === true ||
    place.has_pts === true ||
    (place.vibeTags?.length ?? 0) > 0;
  if (!hasTagSignals) {
    missing.push('NEED_TAG_SIGNALS');
  }

  return missing;
}

// ---------------------------------------------------------------------------
// Compute PRL for summary (simplified inline)
// ---------------------------------------------------------------------------

function computePrlBucket(place: {
  hours: unknown;
  googlePlacesAttributes: unknown;
  googlePhotos: unknown;
  description: string | null;
  pullQuote: string | null;
  vibeTags: string[];
  has_energy?: boolean;
  has_pts?: boolean;
  place_photo_eval?: { tier: string }[];
  curatorNote?: string | null;
}): number {
  const hasHours = !!place.hours;
  const attrs = place.googlePlacesAttributes as Record<string, unknown> | null;
  const hasAttrs = !!attrs && typeof attrs === 'object';
  const photosArr = place.googlePhotos as unknown[] | null;
  const hasPhoto = Array.isArray(photosArr) && photosArr.length > 0;
  const hasDesc =
    nonTrivialText(place.description) ||
    nonTrivialText(place.curatorNote) ||
    nonTrivialText(place.pullQuote);
  const hasTags =
    place.has_energy === true ||
    place.has_pts === true ||
    (place.vibeTags?.length ?? 0) > 0;
  const hasHero = (place.place_photo_eval ?? []).some((e) => e.tier === 'HERO');

  // PRL 1: missing launch essentials (photos, attrs, tag signals)
  if (!hasPhoto || !hasAttrs || !hasTags) return 1;
  // PRL 2: launch-ready (photos + attrs + tags); hours/description non-blocking
  if (!hasHours || !hasDesc || !hasHero) return 2;
  // PRL 3: fully complete
  return 3;
}

// ---------------------------------------------------------------------------
// Exported audit (used by coverage-run and coverage-queue)
// ---------------------------------------------------------------------------

export async function runCoverageAudit(options?: {
  limit?: number;
  laOnly?: boolean;
  ttlDays?: number;
  retryBackoffHours?: number;
}): Promise<CoverageRunReport> {
  const limit = options?.limit ?? 200;
  const laOnlyFlag = options?.laOnly ?? true;
  const ttlDays = options?.ttlDays ?? 90;
  const retryBackoffHours = options?.retryBackoffHours ?? 24;

  const { host, dbname } = parseDatabaseUrl();

  const report: CoverageRunReport = {
    run_id: `run_${Date.now()}`,
    created_at: new Date().toISOString(),
    db_identity: {
      host,
      dbname,
      database_url_host: host,
      database_url_dbname: dbname,
    },
    params: {
      limit,
      la_only: laOnlyFlag,
      ttl_days: ttlDays,
      retry_backoff_hours: retryBackoffHours,
    },
    counts: {
      total_places: 0,
      by_prl: {},
      by_missing_group: {},
      candidates_count: 0,
      excluded_by_ttl: 0,
      excluded_by_backoff: 0,
      excluded_by_running: 0,
      excluded_by_complete: 0,
    },
    candidates: [],
    duplicate_groups: [],
    top_20_candidates: [],
  };

  const whereClause = {
    ...(laOnlyFlag && {
      latitude: { gte: LA_BBOX.latMin, lte: LA_BBOX.latMax },
      longitude: { gte: LA_BBOX.lngMin, lte: LA_BBOX.lngMax },
    }),
    OR: [
      { businessStatus: null },
      { businessStatus: { not: 'CLOSED_PERMANENTLY' } },
    ] as const,
  };

  type PlaceRow = {
    id: string;
    slug: string;
    name: string;
    googlePlaceId: string | null;
    hours: unknown;
    description: string | null;
    pullQuote: string | null;
    googlePhotos: unknown;
    googlePlacesAttributes: unknown;
    vibeTags: string[];
    place_photo_eval: { tier: string }[];
    map_places: { descriptor: string | null }[];
  };

  const places = await db.entities.findMany({
    where: whereClause,
    take: limit,
    orderBy: [{ slug: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      googlePlaceId: true,
      hours: true,
      description: true,
      pullQuote: true,
      googlePhotos: true,
      googlePlacesAttributes: true,
      vibeTags: true,
      place_photo_eval: { select: { tier: true } },
      map_places: {
        where: { lists: { status: 'PUBLISHED' } },
        take: 1,
        select: { descriptor: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  // Tag signals: source of truth via SQL EXISTS (not Prisma _count)
  const placeIds = places.map((p) => p.id);
  let tagSignalsByPlaceId = new Map<string, { has_energy: boolean; has_pts: boolean }>();
  if (placeIds.length > 0) {
    const rows = await db.$queryRaw<
      { id: string; has_energy: boolean; has_pts: boolean }[]
    >(Prisma.sql`
      SELECT p.id,
        exists(SELECT 1 FROM energy_scores es WHERE es.place_id = p.id) AS has_energy,
        exists(SELECT 1 FROM place_tag_scores pts WHERE pts.place_id = p.id) AS has_pts
      FROM places p
      WHERE p.id IN (${Prisma.join(placeIds)})
    `);
    for (const r of rows) {
      tagSignalsByPlaceId.set(r.id, {
        has_energy: r.has_energy,
        has_pts: r.has_pts,
      });
    }
  }

  const curatorNoteByPlace = new Map<string, string | null>();
  for (const p of places) {
    const mp = (p as PlaceRow).map_places?.[0];
    curatorNoteByPlace.set(
      p.id,
      (mp?.descriptor?.trim() as string) ?? null
    );
  }

  report.counts.total_places = places.length;

  for (const p of places) {
    const tagSignals = tagSignalsByPlaceId.get(p.id);
    const prl = computePrlBucket({
      ...p,
      has_energy: tagSignals?.has_energy,
      has_pts: tagSignals?.has_pts,
      curatorNote: curatorNoteByPlace.get(p.id),
    });
    const key = `prl_${prl}`;
    report.counts.by_prl[key] = (report.counts.by_prl[key] ?? 0) + 1;
  }

  let statusByDedupeKey = new Map<
    string,
    {
      last_success_at: Date | null;
      last_attempt_at: Date | null;
      last_attempt_status: string | null;
    }
  >();

  try {
    const statuses = await db.place_coverage_status.findMany({
      select: {
        dedupe_key: true,
        last_success_at: true,
        last_attempt_at: true,
        last_attempt_status: true,
      },
    });
    for (const s of statuses) {
      statusByDedupeKey.set(s.dedupe_key, {
        last_success_at: s.last_success_at,
        last_attempt_at: s.last_attempt_at,
        last_attempt_status: s.last_attempt_status,
      });
    }
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (
      err?.code === 'P2021' ||
      (typeof err?.message === 'string' &&
        /does not exist|relation|table/.test(err.message))
    ) {
      // Table may not exist
    } else {
      throw e;
    }
  }

  const ttlCutoff = new Date();
  ttlCutoff.setDate(ttlCutoff.getDate() - ttlDays);
  const backoffCutoff = new Date();
  backoffCutoff.setHours(backoffCutoff.getHours() - retryBackoffHours);

  const candidates: CoverageCandidate[] = [];

  for (const p of places) {
    const dedupeKey = (p.googlePlaceId ?? p.id).trim() || p.id;
    const tagSignals = tagSignalsByPlaceId.get(p.id);
    const missing = computeMissingGroups({
      ...p,
      has_energy: tagSignals?.has_energy,
      has_pts: tagSignals?.has_pts,
      curatorNote: curatorNoteByPlace.get(p.id),
    });

    if (missing.length === 0) {
      report.counts.excluded_by_complete++;
      continue;
    }

    for (const g of missing) {
      report.counts.by_missing_group[g] =
        (report.counts.by_missing_group[g] ?? 0) + 1;
    }

    const status = statusByDedupeKey.get(dedupeKey);
    if (status?.last_attempt_status === 'RUNNING') {
      report.counts.excluded_by_running++;
      continue;
    }
    if (status?.last_success_at && status.last_success_at >= ttlCutoff) {
      report.counts.excluded_by_ttl++;
      continue;
    }
    if (
      status?.last_attempt_status === 'FAIL' &&
      status?.last_attempt_at &&
      status.last_attempt_at >= backoffCutoff
    ) {
      report.counts.excluded_by_backoff++;
      continue;
    }

    candidates.push({
      place_id: p.id,
      slug: p.slug,
      name: p.name,
      google_place_id: p.googlePlaceId,
      dedupe_key: dedupeKey,
      missing_groups: missing,
      reason: `Missing: ${missing.join(', ')}`,
    });
  }

  report.candidates = candidates;
  report.counts.candidates_count = candidates.length;
  report.top_20_candidates = candidates.slice(0, 20);

  const gpidToPlaces = new Map<string, { id: string; slug: string }[]>();
  const slugToPlaces = new Map<string, { id: string }[]>();

  for (const p of places) {
    if (p.googlePlaceId?.trim()) {
      const list = gpidToPlaces.get(p.googlePlaceId) ?? [];
      list.push({ id: p.id, slug: p.slug });
      gpidToPlaces.set(p.googlePlaceId, list);
    }
    const list = slugToPlaces.get(p.slug) ?? [];
    list.push({ id: p.id });
    slugToPlaces.set(p.slug, list);
  }

  for (const [gpid, list] of gpidToPlaces) {
    if (list.length > 1) {
      report.duplicate_groups.push({
        key: 'google_place_id',
        value: gpid,
        place_ids: list.map((x) => x.id),
        slugs: list.map((x) => x.slug),
      });
    }
  }
  for (const [slug, list] of slugToPlaces) {
    if (list.length > 1) {
      report.duplicate_groups.push({
        key: 'slug',
        value: slug,
        place_ids: list.map((x) => x.id),
        slugs: [slug],
      });
    }
  }

  const gpids = places.map((p) => p.googlePlaceId).filter(Boolean) as string[];
  if (gpids.length > 0) {
    try {
      const grCounts = await db.golden_records.groupBy({
        by: ['google_place_id'],
        where: { google_place_id: { in: gpids } },
        _count: { canonical_id: true },
      });
      for (const g of grCounts) {
        if (g.google_place_id && g._count.canonical_id > 1) {
          report.duplicate_groups.push({
            key: 'google_place_id',
            value: `golden:${g.google_place_id}`,
            place_ids: [],
            slugs: [`${g._count.canonical_id} golden records`],
          });
        }
      }
    } catch {
      /* golden_records may not exist */
    }
  }

  return report;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  assertDbIdentity();

  const laOnlyFlag = !process.argv.includes('--no-la-only');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '200', 10) : 200;
  const ttlDays = parseInt(process.env.COVERAGE_TTL_DAYS ?? '90', 10);
  const retryBackoffHours = parseInt(
    process.env.RETRY_BACKOFF_HOURS ?? '24',
    10
  );

  const report = await runCoverageAudit({
    limit,
    laOnly: laOnlyFlag,
    ttlDays,
    retryBackoffHours,
  });

  const { host, dbname } = report.db_identity;

  // Write report
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .slice(0, 15);
  const outDir = path.join(process.cwd(), 'data', 'coverage');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `coverage_run__${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  // Terminal summary
  console.log('\n=== Coverage Run v1 (READ-ONLY) ===\n');
  console.log('DB identity:');
  console.log(`  host: ${host}`);
  console.log(`  dbname: ${dbname}`);
  console.log('\nCounts by PRL:');
  for (const [k, v] of Object.entries(report.counts.by_prl).sort()) {
    console.log(`  ${k}: ${v}`);
  }
  console.log('\nCounts by missing group:');
  for (const [k, v] of Object.entries(report.counts.by_missing_group).sort()) {
    console.log(`  ${k}: ${v}`);
  }
  console.log('\nExclusions:');
  console.log(`  excluded_by_complete: ${report.counts.excluded_by_complete}`);
  console.log(`  excluded_by_ttl: ${report.counts.excluded_by_ttl}`);
  console.log(`  excluded_by_backoff: ${report.counts.excluded_by_backoff}`);
  console.log(`  excluded_by_running: ${report.counts.excluded_by_running}`);
  console.log(`\nCandidates: ${report.counts.candidates_count}`);

  console.log('\nTop 20 candidates:');
  for (const c of report.top_20_candidates) {
    console.log(
      `  ${c.slug} | ${c.missing_groups.join(', ')} | ${c.dedupe_key}`
    );
  }

  console.log('\nDuplicate groups:');
  for (const d of report.duplicate_groups) {
    console.log(
      `  ${d.key}=${d.value}: ${d.place_ids.length} places, slugs=${d.slugs.join(', ')}`
    );
  }

  console.log(`\nReport: ${outPath}`);
}

// Run only when executed as script (not when imported by coverage-apply)
const isEntryPoint = process.argv[1]?.includes('coverage-run') ?? false;
if (isEntryPoint) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
