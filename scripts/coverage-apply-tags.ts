/**
 * Coverage Apply Tags — Fills NEED_TAG_SIGNALS for queued places
 * via the existing energy + tag pipeline (energy_scores, place_tag_scores).
 *
 * Uses runCoverageAudit(); only processes places with NEED_TAG_SIGNALS.
 * Idempotent: skips places that already have tag signals.
 *
 * Usage:
 *   REQUIRE_DB_HOST=... REQUIRE_DB_NAME=... npm run coverage:apply:tags:neon -- --la-only --limit=20
 *   ... --apply   # persist changes
 *
 * Flags:
 *   --limit=N     Max places to process (default 20)
 *   --la-only     Filter to LA bbox (default: true)
 *   --no-la-only  Disable LA filter
 *   --ttl-days=N  Override COVERAGE_TTL_DAYS
 *
 * Output:
 *   Terminal summary: processed/succeeded/failed
 *   JSON report: data/coverage/coverage_apply_tags__YYYYMMDD_HHMMSS.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { computeEnergy, computeTagScores } from '@/lib/energy-tag-engine';
import type { EnergyInputs, TagScoreInputs } from '@/lib/energy-tag-engine';
import { parseAttrs, isBarForward, buildCoverageAboutText } from '@/lib/energy-tag-engine/shared';
import { runCoverageAudit, type CoverageCandidate } from './coverage-run';

const ENERGY_VERSION = 'energy_v1';
const TAG_VERSION = 'tags_v1';
const DEFAULT_LIMIT = 20;

// ---------------------------------------------------------------------------
// DB identity (mirrors coverage-run)
// ---------------------------------------------------------------------------
function parseDatabaseUrl(): { host: string; dbname: string } {
  const u = process.env.DATABASE_URL ?? '';
  const hostMatch = u.match(/@([^/]+)\//);
  const dbMatch = u.match(/@[^/]+\/([^?]+)/);
  return {
    host: hostMatch ? hostMatch[1] : '?',
    dbname: dbMatch ? dbMatch[1] : '?',
  };
}

function hostMatches(parsed: string, required: string): boolean {
  return parsed === required || parsed.startsWith(required + ':');
}

function assertDbIdentity(): void {
  const { host, dbname } = parseDatabaseUrl();
  const requireHost = process.env.REQUIRE_DB_HOST;
  const requireName = process.env.REQUIRE_DB_NAME;

  if (requireHost && !hostMatches(host, requireHost)) {
    console.error(
      `[COVERAGE APPLY TAGS] Source-of-truth mismatch: REQUIRE_DB_HOST=${requireHost} but DATABASE_URL host is "${host}"`
    );
    process.exit(1);
  }
  if (requireName && dbname !== requireName) {
    console.error(
      `[COVERAGE APPLY TAGS] Source-of-truth mismatch: REQUIRE_DB_NAME=${requireName} but DATABASE_URL dbname is "${dbname}"`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Filter candidates to NEED_TAG_SIGNALS only
// ---------------------------------------------------------------------------
function filterToTagSignals(candidates: CoverageCandidate[]): CoverageCandidate[] {
  return candidates.filter((c) => {
    if (!c.missing_groups.includes('NEED_TAG_SIGNALS')) return false;
    if (!c.google_place_id?.trim()) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Fetch golden records for place_ids
// ---------------------------------------------------------------------------
type GoldenRow = {
  canonical_id: string;
  slug: string;
  description: string | null;
  about_copy: string | null;
  google_places_attributes: unknown;
  category: string | null;
};

async function fetchPlaceIdToGolden(
  placeIds: string[]
): Promise<Map<string, GoldenRow>> {
  const map = new Map<string, GoldenRow>();
  if (placeIds.length === 0) return map;

  const places = await db.places.findMany({
    where: { id: { in: placeIds } },
    select: { id: true, googlePlaceId: true },
  });
  const googleIds = [
    ...new Set(places.map((p) => p.googlePlaceId).filter((id): id is string => id != null)),
  ];
  if (googleIds.length === 0) return map;

  const golden = await db.golden_records.findMany({
    where: { google_place_id: { in: googleIds } },
    select: {
      canonical_id: true,
      slug: true,
      description: true,
      about_copy: true,
      google_places_attributes: true,
      category: true,
      google_place_id: true,
    },
  });

  const googleIdToPlaceId = new Map<string, string>();
  for (const p of places) {
    if (p.googlePlaceId) googleIdToPlaceId.set(p.googlePlaceId, p.id);
  }
  for (const g of golden) {
    const placeId = g.google_place_id ? googleIdToPlaceId.get(g.google_place_id) : undefined;
    if (placeId) {
      map.set(placeId, {
        canonical_id: g.canonical_id,
        slug: g.slug,
        description: g.description,
        about_copy: g.about_copy,
        google_places_attributes: g.google_places_attributes,
        category: g.category,
      });
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Idempotency: check if place already has tag signals
// ---------------------------------------------------------------------------
async function hasTagSignals(placeId: string): Promise<boolean> {
  const [energyCount, tagCount, place] = await Promise.all([
    db.energy_scores.count({ where: { place_id: placeId, version: ENERGY_VERSION } }),
    db.place_tag_scores.count({ where: { place_id: placeId, version: TAG_VERSION } }),
    db.places.findUnique({
      where: { id: placeId },
      select: { vibeTags: true },
    }),
  ]);
  const hasVibeTags = (place?.vibeTags?.length ?? 0) > 0;
  return energyCount > 0 || tagCount > 0 || hasVibeTags;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(): {
  apply: boolean;
  limit: number;
  laOnly: boolean;
  ttlDays: number;
} {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((a) => a.startsWith('--limit=')) ?? argv.find((a) => a === '--limit');
  const limit = limitArg
    ? parseInt(
        limitArg.includes('=') ? limitArg.split('=')[1] ?? '' : argv[argv.indexOf('--limit') + 1] ?? '',
        10
      ) || DEFAULT_LIMIT
    : DEFAULT_LIMIT;

  const ttlArg = argv.find((a) => a.startsWith('--ttl-days=')) ?? argv.find((a) => a === '--ttl-days');
  const ttlDays = ttlArg
    ? parseInt(
        ttlArg.includes('=')
          ? ttlArg.split('=')[1] ?? ''
          : argv[argv.indexOf('--ttl-days') + 1] ?? '',
        10
      ) || 90
    : parseInt(process.env.COVERAGE_TTL_DAYS ?? '90', 10);

  return {
    apply: argv.includes('--apply'),
    limit,
    laOnly: !argv.includes('--no-la-only'),
    ttlDays,
  };
}

// ---------------------------------------------------------------------------
// Report type
// ---------------------------------------------------------------------------
export interface CoverageApplyTagsReport {
  run_id: string;
  created_at: string;
  dry_run: boolean;
  params: { limit: number; la_only: boolean; ttl_days: number };
  counts: {
    candidates_total: number;
    candidates_filtered: number;
    processed: number;
    succeeded: number;
    failed: number;
    skipped_idempotent: number;
  };
  failed_slugs: string[];
  errors: { slug: string; error: string }[];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  assertDbIdentity();

  const { apply, limit, laOnly, ttlDays } = parseArgs();
  const dryRun = !apply;

  const report: CoverageApplyTagsReport = {
    run_id: `apply_tags_${Date.now()}`,
    created_at: new Date().toISOString(),
    dry_run: dryRun,
    params: { limit, la_only: laOnly, ttl_days: ttlDays },
    counts: {
      candidates_total: 0,
      candidates_filtered: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped_idempotent: 0,
    },
    failed_slugs: [],
    errors: [],
  };

  const auditLimit = Math.max(limit, 200);
  const auditReport = await runCoverageAudit({
    limit: auditLimit,
    laOnly,
    ttlDays,
    retryBackoffHours: parseInt(process.env.RETRY_BACKOFF_HOURS ?? '24', 10),
  });

  const filtered = filterToTagSignals(auditReport.candidates);
  const toProcess = filtered.slice(0, limit);

  report.counts.candidates_total = auditReport.candidates_count;
  report.counts.candidates_filtered = filtered.length;

  console.log('\n=== Coverage Apply Tags (NEED_TAG_SIGNALS) ===\n');
  console.log(`DB: ${auditReport.db_identity.host} / ${auditReport.db_identity.dbname}`);
  console.log(`Params: limit=${limit} la_only=${laOnly} ttl_days=${ttlDays}`);
  console.log(`Candidates (NEED_TAG_SIGNALS): ${filtered.length} (processing up to ${toProcess.length})`);
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

  const placeIds = toProcess.map((c) => c.place_id);
  const placeIdToGolden = await fetchPlaceIdToGolden(placeIds);

  const now = new Date();

  for (let i = 0; i < toProcess.length; i++) {
    const candidate = toProcess[i];
    const { place_id, slug } = candidate;
    report.counts.processed++;

    // Idempotent: skip if already has tag signals
    const alreadyHas = await hasTagSignals(place_id);
    if (alreadyHas) {
      report.counts.skipped_idempotent++;
      if (i < 5) console.log(`  ⏭ ${slug} (already has tag signals)`);
      continue;
    }

    const gr = placeIdToGolden.get(place_id);
    if (!gr) {
      report.counts.failed++;
      report.failed_slugs.push(slug);
      report.errors.push({ slug, error: 'No golden record for place' });
      if (report.counts.failed <= 5) console.warn(`  ✗ ${slug}: no golden record`);
      continue;
    }

    try {
      const attrs = parseAttrs(gr.google_places_attributes);
      const energyInputs: EnergyInputs = {
        popularityComponent: null,
        coverageAboutText: buildCoverageAboutText(gr),
        liveMusic: attrs.liveMusic,
        goodForGroups: attrs.goodForGroups,
        barForward: isBarForward(gr),
      };
      const energyResult = computeEnergy(energyInputs);

      const tagInputs: TagScoreInputs = {
        energy_score: energyResult.energy_score,
        energy_confidence: energyResult.energy_confidence,
        coverageAboutText: buildCoverageAboutText(gr),
        liveMusic: attrs.liveMusic,
        goodForGroups: attrs.goodForGroups,
        barForward: isBarForward(gr),
      };
      const tagResult = computeTagScores(tagInputs);

      if (!dryRun) {
        await db.energy_scores.upsert({
          where: { place_id_version: { place_id, version: ENERGY_VERSION } },
          create: {
            id: randomUUID(),
            place_id,
            energy_score: energyResult.energy_score,
            energy_confidence: energyResult.energy_confidence,
            popularity_component: energyResult.popularity_component,
            language_component: energyResult.language_component,
            flags_component: energyResult.flags_component,
            sensory_component: energyResult.sensory_component,
            has_popularity: energyResult.has_popularity,
            has_language: energyResult.has_language,
            has_flags: energyResult.has_flags,
            has_sensory: energyResult.has_sensory,
            version: ENERGY_VERSION,
            computed_at: now,
          },
          update: {
            energy_score: energyResult.energy_score,
            energy_confidence: energyResult.energy_confidence,
            popularity_component: energyResult.popularity_component,
            language_component: energyResult.language_component,
            flags_component: energyResult.flags_component,
            sensory_component: energyResult.sensory_component,
            has_popularity: energyResult.has_popularity,
            has_language: energyResult.has_language,
            has_flags: energyResult.has_flags,
            has_sensory: energyResult.has_sensory,
            computed_at: now,
          },
        });

        await db.place_tag_scores.upsert({
          where: { place_id_version: { place_id, version: TAG_VERSION } },
          create: {
            id: randomUUID(),
            place_id,
            cozy_score: tagResult.cozy_score,
            date_night_score: tagResult.date_night_score,
            late_night_score: tagResult.late_night_score,
            after_work_score: tagResult.after_work_score,
            scene_score: tagResult.scene_score,
            confidence: tagResult.confidence ?? null,
            version: TAG_VERSION,
            depends_on_energy_version: ENERGY_VERSION,
            computed_at: now,
          },
          update: {
            cozy_score: tagResult.cozy_score,
            date_night_score: tagResult.date_night_score,
            late_night_score: tagResult.late_night_score,
            after_work_score: tagResult.after_work_score,
            scene_score: tagResult.scene_score,
            confidence: tagResult.confidence ?? null,
            depends_on_energy_version: ENERGY_VERSION,
            computed_at: now,
          },
        });
      }

      report.counts.succeeded++;
      if (i < 10) {
        const label = dryRun ? '[DRY]' : '✓';
        console.log(`  ${label} ${slug} → energy_scores, place_tag_scores`);
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      report.counts.failed++;
      report.failed_slugs.push(slug);
      report.errors.push({ slug, error });
      if (report.counts.failed <= 5) console.warn(`  ✗ ${slug}: ${error}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Processed: ${report.counts.processed}`);
  console.log(`Succeeded: ${report.counts.succeeded}`);
  console.log(`Failed: ${report.counts.failed}`);
  console.log(`Skipped (idempotent): ${report.counts.skipped_idempotent}`);
  if (dryRun) {
    console.log('\n(DRY RUN — no changes persisted. Run with --apply to write.)');
  }

  const outPath = writeReport(report);
  console.log(`\nReport: ${outPath}`);
}

function writeReport(report: CoverageApplyTagsReport): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .slice(0, 15);
  const outDir = path.join(process.cwd(), 'data', 'coverage');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `coverage_apply_tags__${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
