/**
 * Coverage Apply — Fills NEED_GOOGLE_PHOTOS, NEED_HOURS, NEED_GOOGLE_ATTRS
 * for queued places via Google Places API.
 *
 * Idempotency verified — safe for re-run:
 *   - entity_coverage_status: upsert by dedupe_key
 *   - entities: deterministic overwrite (hours, googlePhotos, googlePlacesAttributes, placesDataCachedAt)
 *   - No append-only arrays
 *
 * Hard rules:
 *   - Default DRY RUN; writes only with --apply
 *   - Caps: --limit default 20; --photos-per-place default 10 (max 10)
 *   - Rate limit: 200–300ms between Google calls
 *   - Idempotent: never re-fetch if fields already present
 *   - Updates entity_coverage_status on success/fail
 *   - No description, no tag signals in this phase
 *
 * Usage:
 *   npm run coverage:apply:neon -- --la-only --limit=20
 *   ... --dry-run   # simulate (default; no DB writes)
 *   ... --apply     # persist changes
 *
 * Requires: .env.local with DATABASE_URL and DB_ENV (dev|staging|prod)
 *
 * Output:
 *   Terminal summary: succeeded/failed + counts per group
 *   JSON report: data/coverage/coverage_apply__YYYYMMDD_HHMMSS.json
 */

import * as fs from 'fs';
import * as path from 'path';
import pLimit from 'p-limit';
import { EnrichmentStage } from '@prisma/client';
import { db } from '@/config/db';
import { getPlaceDetails, getPlaceAttributes } from '@/lib/google-places';
import { runCoverageAudit, type CoverageCandidate, type MissingGroup } from './coverage-run';

const prisma = db.admin;

// ---------------------------------------------------------------------------
// Apply phase: only these groups
// ---------------------------------------------------------------------------
const APPLY_GROUPS: readonly MissingGroup[] = [
  'NEED_GOOGLE_PHOTOS',
  'NEED_HOURS',
  'NEED_GOOGLE_ATTRS',
] as const;

const APPLY_GROUP_SET = new Set(APPLY_GROUPS);

const RATE_LIMIT_MS = 250;
const DEFAULT_LIMIT = 20;
const DEFAULT_PHOTOS_PER_PLACE = 10;
const MAX_PHOTOS_PER_PLACE = 10;

// Concurrency + throughput guard (SKAI-WO-ENRICHMENT-PRE-FLIGHT-CHECK)
const BATCH_SIZE = 25;
const CONCURRENCY = 5;
const SLEEP_MS = 100;

// ---------------------------------------------------------------------------
// Hours format (compatible with Place API / imports)
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

// ---------------------------------------------------------------------------
// Photo format (places.googlePhotos — photo_reference or photoReference)
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

// ---------------------------------------------------------------------------
// Filter candidates to apply-phase only
// ---------------------------------------------------------------------------
function filterToApplyGroups(candidates: CoverageCandidate[]): {
  candidate: CoverageCandidate;
  needsDetails: boolean; // hours or photos
  needsAttrs: boolean;
}[] {
  const out: { candidate: CoverageCandidate; needsDetails: boolean; needsAttrs: boolean }[] = [];

  for (const c of candidates) {
    const applyMissing = c.missing_groups.filter((g) => APPLY_GROUP_SET.has(g as MissingGroup));
    if (applyMissing.length === 0) continue;

    // Must have google_place_id to call API
    if (!c.google_place_id?.trim()) continue;

    const needsDetails =
      applyMissing.includes('NEED_GOOGLE_PHOTOS') || applyMissing.includes('NEED_HOURS');
    const needsAttrs = applyMissing.includes('NEED_GOOGLE_ATTRS');

    out.push({
      candidate: { ...c, missing_groups: applyMissing },
      needsDetails,
      needsAttrs,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Upsert entity_coverage_status
// ---------------------------------------------------------------------------
async function upsertCoverageStatus(params: {
  placeId: string;
  dedupeKey: string;
  status: 'SUCCESS' | 'FAIL';
  lastMissingGroups: string[];
  errorCode?: string;
  errorMessage?: string;
}) {
  const existing = await prisma.entity_coverage_status.findUnique({
    where: { dedupe_key: params.dedupeKey },
  });

  const now = new Date();
  const data = {
    entityId: params.placeId,
    dedupe_key: params.dedupeKey,
    last_attempt_at: now,
    last_attempt_status: params.status,
    last_missing_groups: params.lastMissingGroups as object,
    last_error_code: params.errorCode ?? null,
    last_error_message: params.errorMessage ?? null,
    source: 'GOOGLE_PLACES' as const,
    ...(params.status === 'SUCCESS' && { last_success_at: now }),
  };

  if (existing) {
    await prisma.entity_coverage_status.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.entity_coverage_status.create({
      data,
    });
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(): {
  apply: boolean;
  limit: number;
  photosPerPlace: number;
  laOnly: boolean;
  dryRun: boolean;
} {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((a) => a.startsWith('--limit=')) ?? argv.find((a) => a === '--limit');
  const limit = limitArg
    ? parseInt(
        limitArg.includes('=') ? limitArg.split('=')[1] ?? '' : argv[argv.indexOf('--limit') + 1] ?? '',
        10
      ) || DEFAULT_LIMIT
    : DEFAULT_LIMIT;

  const photosArg =
    argv.find((a) => a.startsWith('--photos-per-place=')) ??
    argv.find((a) => a === '--photos-per-place');
  const photosPerPlace = photosArg
    ? Math.min(
        MAX_PHOTOS_PER_PLACE,
        parseInt(
          photosArg.includes('=')
            ? photosArg.split('=')[1] ?? ''
            : argv[argv.indexOf('--photos-per-place') + 1] ?? '',
          10
        ) || DEFAULT_PHOTOS_PER_PLACE
      )
    : DEFAULT_PHOTOS_PER_PLACE;

  const dryRun = argv.includes('--dry-run') || !argv.includes('--apply');
  return {
    apply: !dryRun,
    limit,
    photosPerPlace,
    laOnly: !argv.includes('--no-la-only'),
    dryRun,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export interface CoverageApplyReport {
  run_id: string;
  created_at: string;
  dry_run: boolean;
  params: { limit: number; photos_per_place: number; la_only: boolean };
  counts: {
    candidates_total: number;
    candidates_filtered: number;
    processed: number;
    succeeded: number;
    failed: number;
    by_group: { NEED_GOOGLE_PHOTOS: number; NEED_HOURS: number; NEED_GOOGLE_ATTRS: number };
  };
  failed_slugs: string[];
  errors: { slug: string; error: string }[];
}

async function main() {

  const { apply, limit, photosPerPlace, laOnly, dryRun } = parseArgs();

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set.');
    process.exit(1);
  }
  if (process.env.GOOGLE_PLACES_ENABLED !== 'true') {
    console.error('❌ GOOGLE_PLACES_ENABLED must be true.');
    process.exit(1);
  }

  const report: CoverageApplyReport = {
    run_id: `apply_${Date.now()}`,
    created_at: new Date().toISOString(),
    dry_run: dryRun,
    params: { limit, photos_per_place: photosPerPlace, la_only: laOnly },
    counts: {
      candidates_total: 0,
      candidates_filtered: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      by_group: {
        NEED_GOOGLE_PHOTOS: 0,
        NEED_HOURS: 0,
        NEED_GOOGLE_ATTRS: 0,
      },
    },
    failed_slugs: [],
    errors: [],
  };

  // Audit uses higher limit to get full candidate set; we process up to `limit`
  const auditLimit = Math.max(limit, 200);

  const auditReport = await runCoverageAudit({
    limit: auditLimit,
    laOnly,
    ttlDays: parseInt(process.env.COVERAGE_TTL_DAYS ?? '90', 10),
    retryBackoffHours: parseInt(process.env.RETRY_BACKOFF_HOURS ?? '24', 10),
  });

  const filtered = filterToApplyGroups(auditReport.candidates);
  const toProcess = filtered.slice(0, limit);
  report.counts.candidates_total = auditReport.candidates_count;
  report.counts.candidates_filtered = filtered.length;

  console.log('\n=== Coverage Apply (Place Pages Phase) ===\n');
  console.log(`DB: ${auditReport.db_identity.host} / ${auditReport.db_identity.dbname}`);
  console.log(`Params: limit=${limit} photos_per_place=${photosPerPlace} la_only=${laOnly}`);
  console.log(`Throughput: BATCH_SIZE=${BATCH_SIZE} CONCURRENCY=${CONCURRENCY} SLEEP_MS=${SLEEP_MS}`);
  console.log(`Candidates (apply groups only): ${filtered.length} (processing up to ${toProcess.length})`);
  if (dryRun) {
    console.log('\nDRY RUN — no writes. Use --apply to persist.\n');
  } else {
    console.log('\n--apply: writes enabled.\n');
  }

  if (toProcess.length === 0) {
    console.log('No places to process. Done.');
    writeReport(report);
    return;
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const limitPool = pLimit(CONCURRENCY);

  const processOne = async (
    item: { candidate: CoverageCandidate; needsDetails: boolean; needsAttrs: boolean },
    index: number
  ) => {
    const { candidate, needsDetails, needsAttrs } = item;
    const { place_id, slug, google_place_id, dedupe_key, missing_groups } = candidate;
    const gpid = google_place_id!.trim();

    console.log(`  [start] ${slug} (${place_id})`);
    if (!dryRun) {
      await prisma.entities.update({
        where: { id: place_id },
        data: { last_enrichment_attempt_at: new Date() },
      });
    }
    let details: Awaited<ReturnType<typeof getPlaceDetails>> = null;
    let attrs: Awaited<ReturnType<typeof getPlaceAttributes>> = null;
    let error: string | null = null;
    const byGroupDelta = {
      NEED_GOOGLE_PHOTOS: 0,
      NEED_HOURS: 0,
      NEED_GOOGLE_ATTRS: 0,
    };

    try {
      if (needsDetails) {
        details = await getPlaceDetails(gpid);
        await sleep(RATE_LIMIT_MS);
      }
      if (needsAttrs) {
        attrs = await getPlaceAttributes(gpid);
        await sleep(RATE_LIMIT_MS);
      }

      const updates: {
        hours?: object;
        googlePhotos?: unknown[];
        googlePlacesAttributes?: object;
        businessStatus?: string;
        placesDataCachedAt?: Date;
      } = {};

      if (details) {
        if (details.businessStatus) {
          updates.businessStatus = details.businessStatus;
        }
        if (missing_groups.includes('NEED_HOURS') && details.openingHours) {
          const hours = formatHoursForStore(details.openingHours);
          if (hours) {
            updates.hours = hours;
            byGroupDelta.NEED_HOURS = 1;
          }
        }
        if (missing_groups.includes('NEED_GOOGLE_PHOTOS') && details.photos?.length) {
          const photos = formatPhotosForStore(details.photos, photosPerPlace);
          if (photos?.length) {
            updates.googlePhotos = photos;
            byGroupDelta.NEED_GOOGLE_PHOTOS = 1;
          }
        }
      }

      if (attrs && missing_groups.includes('NEED_GOOGLE_ATTRS')) {
        updates.googlePlacesAttributes = attrs as object;
        byGroupDelta.NEED_GOOGLE_ATTRS = 1;
      }

      const remainingMissing = missing_groups.filter((g) => {
        if (g === 'NEED_HOURS' && updates.hours) return false;
        if (g === 'NEED_GOOGLE_PHOTOS' && updates.googlePhotos?.length) return false;
        if (g === 'NEED_GOOGLE_ATTRS' && updates.googlePlacesAttributes) return false;
        return true;
      });

      if (Object.keys(updates).length === 0) {
        if (!dryRun) {
          await prisma.entities.update({
            where: { id: place_id },
            data: {
              last_enrichment_error: null,
              enrichment_retry_count: 0,
              enrichment_stage: EnrichmentStage.GOOGLE_COVERAGE_COMPLETE,
            },
          });
          await upsertCoverageStatus({
            placeId: place_id,
            dedupeKey: dedupe_key,
            status: 'SUCCESS',
            lastMissingGroups: remainingMissing,
          });
        }
        console.log(`  [finish] ${slug} (no new data to write)`);
        return { succeeded: true, failed: false, slug, error: null, byGroupDelta };
      } else if (!dryRun) {
        updates.placesDataCachedAt = new Date();
        await prisma.entities.update({
          where: { id: place_id },
          data: {
            ...updates,
            last_enrichment_error: null,
            enrichment_retry_count: 0,
            enrichment_stage: EnrichmentStage.GOOGLE_COVERAGE_COMPLETE,
          },
        });
        await upsertCoverageStatus({
          placeId: place_id,
          dedupeKey: dedupe_key,
          status: 'SUCCESS',
          lastMissingGroups: remainingMissing,
        });
        const keys = Object.keys(updates).filter((k) => k !== 'placesDataCachedAt').join(', ');
        console.log(`  [finish] ${slug} → ${keys}`);
        return { succeeded: true, failed: false, slug, error: null, byGroupDelta };
      } else {
        const keys = Object.keys(updates).filter((k) => k !== 'placesDataCachedAt').join(', ');
        console.log(`  [finish] [DRY] ${slug} would write: ${keys}`);
        return { succeeded: true, failed: false, slug, error: null, byGroupDelta };
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      if (!dryRun) {
        const row = await prisma.entities.findUnique({
          where: { id: place_id },
          select: { enrichment_retry_count: true },
        });
        await prisma.entities.update({
          where: { id: place_id },
          data: {
            last_enrichment_error: error.slice(0, 2000),
            enrichment_retry_count: (row?.enrichment_retry_count ?? 0) + 1,
            enrichment_stage: EnrichmentStage.FAILED,
          },
        }).catch(() => {});
        await upsertCoverageStatus({
          placeId: place_id,
          dedupeKey: dedupe_key,
          status: 'FAIL',
          lastMissingGroups: candidate.missing_groups,
          errorCode: 'EXCEPTION',
          errorMessage: error.slice(0, 500),
        }).catch(() => {});
      }
      console.warn(`  [finish] ✗ ${slug}: ${error}`);
      return { succeeded: false, failed: true, slug, error, byGroupDelta };
    }
  };

  const results = await Promise.all(
    toProcess.map((item, i) =>
      limitPool(() => processOne(item, i))
    )
  );

  for (const r of results) {
    report.counts.processed++;
    if (r.succeeded) report.counts.succeeded++;
    if (r.failed) {
      report.counts.failed++;
      report.failed_slugs.push(r.slug);
      if (r.error) report.errors.push({ slug: r.slug, error: r.error });
    }
    report.counts.by_group.NEED_GOOGLE_PHOTOS += r.byGroupDelta.NEED_GOOGLE_PHOTOS;
    report.counts.by_group.NEED_HOURS += r.byGroupDelta.NEED_HOURS;
    report.counts.by_group.NEED_GOOGLE_ATTRS += r.byGroupDelta.NEED_GOOGLE_ATTRS;
  }

  console.log('\n--- Summary ---');
  console.log(`Processed: ${report.counts.processed}`);
  console.log(`Succeeded: ${report.counts.succeeded}`);
  console.log(`Failed: ${report.counts.failed}`);
  console.log('By group:');
  console.log(`  NEED_GOOGLE_PHOTOS: ${report.counts.by_group.NEED_GOOGLE_PHOTOS}`);
  console.log(`  NEED_HOURS: ${report.counts.by_group.NEED_HOURS}`);
  console.log(`  NEED_GOOGLE_ATTRS: ${report.counts.by_group.NEED_GOOGLE_ATTRS}`);
  if (dryRun) {
    console.log('\n(DRY RUN — no changes persisted. Run with --apply to write.)');
  }

  const outPath = writeReport(report);
  console.log(`\nReport: ${outPath}`);
}

function writeReport(report: CoverageApplyReport): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .slice(0, 15);
  const outDir = path.join(process.cwd(), 'data', 'coverage');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `coverage_apply__${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
