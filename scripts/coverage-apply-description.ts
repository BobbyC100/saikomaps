/**
 * Coverage Apply Description — Fills NEED_DESCRIPTION for queued places
 * using Google Place Details editorial_summary.
 *
 * Uses runCoverageAudit(); only processes places with NEED_DESCRIPTION.
 * Fetches Place Details via lib/google-places getPlaceDetails.
 * Extracts editorial_summary.overview; skips if not available (NO_GOOGLE_DESCRIPTION).
 * Idempotent: skips places that already have non-empty description.
 *
 * Usage:
 *   REQUIRE_DB_HOST=... REQUIRE_DB_NAME=... npm run coverage:apply:description:neon -- --la-only --limit=50
 *   ... --apply   # persist changes
 *
 * Flags:
 *   --limit=N     Max places to process (default 20)
 *   --la-only     Filter to LA bbox (default: true)
 *   --no-la-only  Disable LA filter
 *   --ttl-days=N  Override COVERAGE_TTL_DAYS
 *
 * Output:
 *   Terminal summary: written / skipped_existing / skipped_no_google_desc / failed
 *   JSON report: data/coverage/coverage_apply_description__YYYYMMDD_HHMMSS.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '@/lib/db';
import { getPlaceDetails } from '@/lib/google-places';
import { runCoverageAudit, type CoverageCandidate } from './coverage-run';

const DEFAULT_LIMIT = 20;
const RATE_LIMIT_MS = 250;

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
      `[COVERAGE APPLY DESCRIPTION] Source-of-truth mismatch: REQUIRE_DB_HOST=${requireHost} but DATABASE_URL host is "${host}"`
    );
    process.exit(1);
  }
  if (requireName && dbname !== requireName) {
    console.error(
      `[COVERAGE APPLY DESCRIPTION] Source-of-truth mismatch: REQUIRE_DB_NAME=${requireName} but DATABASE_URL dbname is "${dbname}"`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Filter candidates to NEED_DESCRIPTION only
// ---------------------------------------------------------------------------
function filterToDescription(candidates: CoverageCandidate[]): CoverageCandidate[] {
  return candidates.filter((c) => {
    if (!c.missing_groups.includes('NEED_DESCRIPTION')) return false;
    if (!c.google_place_id?.trim()) return false;
    return true;
  });
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

export interface CoverageApplyDescriptionReport {
  run_id: string;
  created_at: string;
  dry_run: boolean;
  params: { limit: number; la_only: boolean; ttl_days: number };
  counts: {
    candidates_total: number;
    candidates_filtered: number;
    processed: number;
    written: number;
    skipped_existing: number;
    skipped_no_google_desc: number;
    failed: number;
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

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set.');
    process.exit(1);
  }
  if (process.env.GOOGLE_PLACES_ENABLED !== 'true') {
    console.error('❌ GOOGLE_PLACES_ENABLED must be true.');
    process.exit(1);
  }

  const report: CoverageApplyDescriptionReport = {
    run_id: `apply_desc_${Date.now()}`,
    created_at: new Date().toISOString(),
    dry_run: dryRun,
    params: { limit, la_only: laOnly, ttl_days: ttlDays },
    counts: {
      candidates_total: 0,
      candidates_filtered: 0,
      processed: 0,
      written: 0,
      skipped_existing: 0,
      skipped_no_google_desc: 0,
      failed: 0,
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

  const filtered = filterToDescription(auditReport.candidates);
  const toProcess = filtered.slice(0, limit);

  report.counts.candidates_total = auditReport.candidates_count;
  report.counts.candidates_filtered = filtered.length;

  console.log('\n=== Coverage Apply Description (NEED_DESCRIPTION) ===\n');
  console.log(`DB: ${auditReport.db_identity.host} / ${auditReport.db_identity.dbname}`);
  console.log(`Params: limit=${limit} la_only=${laOnly} ttl_days=${ttlDays}`);
  console.log(`Candidates (NEED_DESCRIPTION): ${filtered.length} (processing up to ${toProcess.length})`);
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

  // Idempotency: fetch current descriptions for candidates
  const placeIds = toProcess.map((c) => c.place_id);
  const placesWithDesc = await db.entities.findMany({
    where: { id: { in: placeIds } },
    select: { id: true, description: true },
  });
  const hasExistingDesc = new Set(
    placesWithDesc.filter((p) => p.description != null && p.description.trim().length > 0).map((p) => p.id)
  );

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < toProcess.length; i++) {
    const candidate = toProcess[i];
    const { place_id, slug, google_place_id } = candidate;
    report.counts.processed++;

    if (hasExistingDesc.has(place_id)) {
      report.counts.skipped_existing++;
      if (i < 5) console.log(`  ⏭ ${slug} (existing description)`);
      continue;
    }

    const gpid = google_place_id?.trim();
    if (!gpid) {
      report.counts.failed++;
      report.failed_slugs.push(slug);
      report.errors.push({ slug, error: 'No google_place_id' });
      continue;
    }

    try {
      const details = await getPlaceDetails(gpid);
      await sleep(RATE_LIMIT_MS);

      const desc = (details?.editorialSummary ?? '').trim();
      if (!desc || desc.length === 0) {
        report.counts.skipped_no_google_desc++;
        if (i < 5) console.log(`  ⏭ ${slug} (NO_GOOGLE_DESCRIPTION)`);
        continue;
      }

      if (!dryRun) {
        await db.entities.update({
          where: { id: place_id },
          data: { description: desc },
        });
      }

      report.counts.written++;
      if (i < 10) {
        const label = dryRun ? '[DRY]' : '✓';
        console.log(`  ${label} ${slug} → description (${desc.length} chars)`);
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
  console.log(`Written: ${report.counts.written}`);
  console.log(`Skipped (existing): ${report.counts.skipped_existing}`);
  console.log(`Skipped (NO_GOOGLE_DESCRIPTION): ${report.counts.skipped_no_google_desc}`);
  console.log(`Failed: ${report.counts.failed}`);
  if (dryRun) {
    console.log('\n(DRY RUN — no changes persisted. Run with --apply to write.)');
  }

  const outPath = writeReport(report);
  console.log(`\nReport: ${outPath}`);
}

function writeReport(report: CoverageApplyDescriptionReport): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .slice(0, 15);
  const outDir = path.join(process.cwd(), 'data', 'coverage');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `coverage_apply_description__${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
