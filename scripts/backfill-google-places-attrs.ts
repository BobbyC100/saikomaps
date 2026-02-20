/**
 * Backfill Google Places attributes for golden_records linked to places.
 *
 * Audit-Before-Enrich Guardrail v1. Populates golden_records.google_places_attributes
 * for eligible linked places so energy_* and tag scoring engines have upstream data.
 *
 * Eligibility: places.googlePlaceId IS NOT NULL AND matching golden_record exists.
 * Scope: LA County only when --la-only (default true for --all).
 *
 * popular_times: NOT available from Google Places API. Stored as null with
 * _meta.popular_times_available: false.
 *
 * Usage:
 *   npm run backfill:google-attrs -- --all
 *   npm run backfill:google-attrs -- --all --no-la-only
 *   npm run backfill:google-attrs -- --limit 50
 *   npm run backfill:google-attrs -- --dry-run
 *   npm run backfill:google-attrs -- --force
 *   npm run backfill:google-attrs -- --refresh-stale
 *   npm run backfill:google-attrs -- --abort-if-estimate-over 100
 *
 * Requires: GOOGLE_PLACES_API_KEY, DATABASE_URL
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '@/lib/db';
import {
  getPlaceAttributes,
  areAttributesPresent,
  isPopularTimesPresent,
  VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING,
} from '@/lib/google-places';

const RATE_LIMIT_MS = 200;
const FAILURES_PATH = path.join(process.cwd(), 'data/logs/backfill-google-places-attrs_failures.json');
const DEFAULT_ATTRS_TTL_DAYS = 30;

/** LA County bounding box (coarse, deterministic). lat [33.70, 34.85], lng [-118.95, -117.60] */
const LA_COUNTY_BBOX = {
  latMin: 33.7,
  latMax: 34.85,
  lngMin: -118.95,
  lngMax: -117.6,
} as const;

function isLosAngelesCounty(county: string | null | undefined): boolean {
  if (!county || typeof county !== 'string') return false;
  const c = county.trim();
  return c === 'Los Angeles County' || /^Los Angeles$/i.test(c);
}

function isInLaBbox(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null || typeof lat !== 'number' || typeof lng !== 'number') return false;
  return (
    lat >= LA_COUNTY_BBOX.latMin &&
    lat <= LA_COUNTY_BBOX.latMax &&
    lng >= LA_COUNTY_BBOX.lngMin &&
    lng <= LA_COUNTY_BBOX.lngMax
  );
}

interface LinkedRow {
  canonical_id: string;
  slug: string;
  google_place_id: string | null;
  place_id: string | null;
  county: string | null;
  gr_lat: number | null;
  gr_lng: number | null;
  p_lat: number | null;
  p_lng: number | null;
  google_places_attributes: unknown;
  google_places_attributes_fetched_at: Date | null;
}

interface FailureRecord {
  place_id: string | null;
  googlePlaceId: string | null;
  error_code: string;
  retry_count: number;
  timestamp: string;
}

interface PreflightResult {
  eligible_total: number;
  excluded_by_la: number;
  excluded_no_geo: number;
  included_after_la: number;
  satisfied_count: number;
  stale_count: number;
  needs_fetch_count: number;
  estimated_api_calls: number;
  toFetch: LinkedRow[];
}

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let dryRun = false;
  let force = false;
  let laOnly = false; // default set by --all
  let all = false;
  let refreshStale = false;
  let attrsTtlDays = DEFAULT_ATTRS_TTL_DAYS;
  let abortIfEstimateOver = Infinity;
  let onlyMissingAttrs = false;
  let onlyMissingPopularTimes = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') limit = parseInt(args[++i] || '0', 10) || Infinity;
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--force') force = true;
    else if (args[i] === '--la-only') laOnly = true;
    else if (args[i] === '--no-la-only') laOnly = false;
    else if (args[i] === '--all') all = true;
    else if (args[i] === '--refresh-stale') refreshStale = true;
    else if (args[i] === '--attrs-ttl-days') attrsTtlDays = parseInt(args[++i] || '30', 10) || 30;
    else if (args[i] === '--abort-if-estimate-over') abortIfEstimateOver = parseInt(args[++i] || '0', 10) || Infinity;
    else if (args[i] === '--only-missing-attrs') onlyMissingAttrs = true;
    else if (args[i] === '--only-missing-popular-times') onlyMissingPopularTimes = true;
  }

  if (all && !args.includes('--la-only') && !args.includes('--no-la-only')) {
    laOnly = true;
  }

  return {
    limit,
    dryRun,
    force,
    laOnly,
    all,
    refreshStale,
    attrsTtlDays,
    abortIfEstimateOver,
    onlyMissingAttrs,
    onlyMissingPopularTimes,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureLogDir(): void {
  const dir = path.dirname(FAILURES_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadFailures(): FailureRecord[] {
  if (!fs.existsSync(FAILURES_PATH)) return [];
  try {
    const raw = fs.readFileSync(FAILURES_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function appendFailure(record: FailureRecord): void {
  ensureLogDir();
  const existing = loadFailures();
  existing.push(record);
  fs.writeFileSync(FAILURES_PATH, JSON.stringify(existing, null, 2), 'utf-8');
}

/** Deep merge: existing + new. New values override. Preserves existing keys not in new. */
function deepMergeAttrs(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  for (const [k, v] of Object.entries(incoming)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      (base as Record<string, unknown>)[k] = deepMergeAttrs(
        base[k] as Record<string, unknown>,
        v as Record<string, unknown>
      );
    } else {
      (base as Record<string, unknown>)[k] = v;
    }
  }
  return base;
}

function isAttrsFresh(
  fetchedAt: Date | null | undefined,
  ttlDays: number
): boolean {
  if (!fetchedAt) return false;
  const age = (Date.now() - new Date(fetchedAt).getTime()) / (1000 * 60 * 60 * 24);
  return age <= ttlDays;
}

async function runPreflight(opts: {
  laOnly: boolean;
  force: boolean;
  refreshStale: boolean;
  attrsTtlDays: number;
  limit: number;
  onlyMissingAttrs: boolean;
  onlyMissingPopularTimes: boolean;
}): Promise<PreflightResult> {
  const linked = await db.$queryRaw<LinkedRow[]>`
    SELECT
      g.canonical_id,
      g.slug,
      g.google_place_id,
      p.id AS place_id,
      g.county,
      g.lat::float AS gr_lat,
      g.lng::float AS gr_lng,
      p.latitude::float AS p_lat,
      p.longitude::float AS p_lng,
      g.google_places_attributes,
      g.google_places_attributes_fetched_at
    FROM golden_records g
    INNER JOIN places p ON p.google_place_id = g.google_place_id
    WHERE g.google_place_id IS NOT NULL
      AND p.google_place_id IS NOT NULL
  `;

  const eligible_total = linked.length;
  let excluded_by_la = 0;
  let excluded_no_geo = 0;

  const afterLa: LinkedRow[] = [];
  for (const row of linked) {
    if (!opts.laOnly) {
      afterLa.push(row);
      continue;
    }
    if (isLosAngelesCounty(row.county)) {
      afterLa.push(row);
      continue;
    }
    const lat = row.gr_lat ?? row.p_lat;
    const lng = row.gr_lng ?? row.p_lng;
    if (lat == null || lng == null) {
      excluded_no_geo++;
      excluded_by_la++;
      continue;
    }
    if (isInLaBbox(lat, lng)) {
      afterLa.push(row);
    } else {
      excluded_by_la++;
    }
  }

  const included_after_la = afterLa.length;

  let satisfied_count = 0;
  let stale_count = 0;
  const toFetch: LinkedRow[] = [];

  for (const row of afterLa) {
    const hasMinimum = areAttributesPresent(row.google_places_attributes);
    const fresh = isAttrsFresh(row.google_places_attributes_fetched_at, opts.attrsTtlDays);

    if (opts.force) {
      toFetch.push(row);
      continue;
    }
    if (opts.onlyMissingPopularTimes) {
      if (!isPopularTimesPresent(row.google_places_attributes)) toFetch.push(row);
      else satisfied_count++;
      continue;
    }
    if (opts.onlyMissingAttrs || !opts.onlyMissingPopularTimes) {
      if (!hasMinimum) {
        toFetch.push(row);
      } else if (fresh) {
        satisfied_count++;
      } else {
        stale_count++;
        if (opts.refreshStale) toFetch.push(row);
        else satisfied_count++;
      }
    }
  }

  const needs_fetch_count = Math.min(toFetch.length, opts.limit === Infinity ? toFetch.length : opts.limit);
  const limitedToFetch = opts.limit < Infinity ? toFetch.slice(0, opts.limit) : toFetch;

  return {
    eligible_total,
    excluded_by_la,
    excluded_no_geo,
    included_after_la,
    satisfied_count,
    stale_count,
    needs_fetch_count,
    estimated_api_calls: needs_fetch_count,
    toFetch: limitedToFetch,
  };
}

async function main() {
  const opts = parseArgs();

  if (opts.onlyMissingPopularTimes) {
    console.log('\n⚠️  --only-missing-popular-times: popular_times is NOT available from Google Places API; this will effectively process all eligible (no-op filter).\n');
  }

  console.log('fields_mask_used =', VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING);

  const preflight = await runPreflight({
    laOnly: opts.laOnly,
    force: opts.force,
    refreshStale: opts.refreshStale,
    attrsTtlDays: opts.attrsTtlDays,
    limit: opts.limit,
    onlyMissingAttrs: opts.onlyMissingAttrs,
    onlyMissingPopularTimes: opts.onlyMissingPopularTimes,
  });

  console.log('\n--- Preflight Audit ---');
  console.log('eligible_total:', preflight.eligible_total);
  console.log('excluded_by_la:', preflight.excluded_by_la);
  console.log('excluded_no_geo:', preflight.excluded_no_geo);
  console.log('included_after_la:', preflight.included_after_la);
  console.log('satisfied_count:', preflight.satisfied_count);
  console.log('stale_count:', preflight.stale_count);
  console.log('needs_fetch_count:', preflight.needs_fetch_count);
  console.log('estimated_api_calls:', preflight.estimated_api_calls);

  if (preflight.estimated_api_calls > opts.abortIfEstimateOver) {
    console.error(`\n❌ Aborting: estimated_api_calls (${preflight.estimated_api_calls}) > --abort-if-estimate-over (${opts.abortIfEstimateOver})`);
    process.exit(1);
  }

  if (preflight.toFetch.length === 0) {
    console.log('\n✅ No records need fetching. Done.');
    return;
  }

  if (opts.dryRun) {
    console.log('\n(dry run — no API calls, no updates)\n');
    return;
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set. Add it to .env or .env.local');
    process.exit(1);
  }

  console.log('\n--- Fetching ---\n');

  const startMs = Date.now();
  let fetched = 0;
  let failed = 0;
  let skipped_satisfied = preflight.satisfied_count;
  let retries = 0;

  for (const rec of preflight.toFetch) {
    const label = `${rec.slug} (${rec.canonical_id})`;
    const placeId = rec.google_place_id;

    if (!placeId) {
      console.log(`  ⏭️  ${label}: no google_place_id`);
      continue;
    }

    const recordFailure = (errorCode: string, retryCount: number) => {
      appendFailure({
        place_id: rec.place_id ?? null,
        googlePlaceId: placeId,
        error_code: errorCode,
        retry_count: retryCount,
        timestamp: new Date().toISOString(),
      });
    };

    try {
      const attrs = await getPlaceAttributes(placeId);
      if (!attrs) {
        failed++;
        recordFailure('NOT_FOUND', 0);
        console.log(`  ❌ ${label}: Google returned NOT_FOUND`);
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      const existing = rec.google_places_attributes as Record<string, unknown> | null | undefined;
      const merged = deepMergeAttrs(existing ?? undefined, attrs as unknown as Record<string, unknown>);
      (merged as Record<string, unknown>).popular_times = null;
      const meta = (merged as Record<string, unknown>)._meta as Record<string, unknown> | undefined ?? {};
      meta.source = 'google_places';
      meta.fetched_at = new Date().toISOString();
      meta.fields_mask_used = VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING;
      meta.popular_times_available = false;
      (merged as Record<string, unknown>)._meta = meta;

      await db.golden_records.update({
        where: { canonical_id: rec.canonical_id },
        data: {
          google_places_attributes: merged as object,
          google_places_attributes_fetched_at: new Date(),
        },
      });

      fetched++;
      console.log(`  ✅ ${label}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = /OVER_QUERY_LIMIT|429|rate/i.test(msg);
      if (isRateLimit) {
        retries++;
        console.log(`  ⚠️  ${label}: rate limit — waiting 2s`);
        await sleep(2000);
        try {
          const attrs = await getPlaceAttributes(placeId);
          if (!attrs) {
            failed++;
            recordFailure('NOT_FOUND', 1);
            console.log(`  ❌ ${label}: NOT_FOUND after retry`);
            await sleep(RATE_LIMIT_MS);
            continue;
          }
          const existing = rec.google_places_attributes as Record<string, unknown> | null | undefined;
          const merged = deepMergeAttrs(existing ?? undefined, attrs as unknown as Record<string, unknown>);
          (merged as Record<string, unknown>).popular_times = null;
          const meta = (merged as Record<string, unknown>)._meta as Record<string, unknown> | undefined ?? {};
          meta.source = 'google_places';
          meta.fetched_at = new Date().toISOString();
          meta.fields_mask_used = VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING;
          meta.popular_times_available = false;
          (merged as Record<string, unknown>)._meta = meta;
          await db.golden_records.update({
            where: { canonical_id: rec.canonical_id },
            data: {
              google_places_attributes: merged as object,
              google_places_attributes_fetched_at: new Date(),
            },
          });
          fetched++;
          console.log(`  ✅ ${label} (after retry)`);
        } catch (retryErr) {
          failed++;
          const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          recordFailure(retryMsg.length > 200 ? retryMsg.slice(0, 200) : retryMsg, 1);
          console.log(`  ❌ ${label}: ${retryMsg}`);
        }
      } else {
        failed++;
        const errCode = msg.length > 200 ? msg.slice(0, 200) : msg;
        recordFailure(errCode, 0);
        console.log(`  ❌ ${label}: ${msg}`);
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  const elapsedMs = Date.now() - startMs;
  const elapsedSec = elapsedMs / 1000;
  const effectiveQps = elapsedSec > 0 ? (fetched / elapsedSec).toFixed(2) : '0';

  console.log('\n--- Summary ---');
  console.log('eligible_total:', preflight.eligible_total);
  console.log('excluded_by_la:', preflight.excluded_by_la);
  console.log('included_after_la:', preflight.included_after_la);
  console.log('skipped_satisfied:', skipped_satisfied);
  console.log('processed:', fetched + failed);
  console.log('fetched:', fetched);
  console.log('failed:', failed);
  console.log('retries:', retries);
  console.log('elapsed_ms:', elapsedMs);
  console.log('effective_qps:', effectiveQps);
  if (failed > 0) {
    console.log('failures written to:', FAILURES_PATH);
  }
  console.log('\n⚠️  popular_times: NOT available from Google Places API.');
  console.log('   Stored as null with _meta.popular_times_available: false.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
