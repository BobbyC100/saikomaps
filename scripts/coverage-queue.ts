/**
 * Coverage Queue v1 — Stub that prints what WOULD be queued (no API calls)
 *
 * Usage:
 *   npm run coverage:queue:local
 *   npm run coverage:queue:neon
 *
 * Requires: .env.local with DATABASE_URL and DB_ENV (dev|staging|prod)
 *
 * --la-only   Filter to LA bbox (default: true)
 * --limit=N   Max places to consider (default: 200)
 *
 * Output: Per-place list of missing field groups that would be requested.
 * Does NOT call external APIs.
 */

// Triggers v3.0 validation via coverage-run's config/db import
import { runCoverageAudit } from './coverage-run';

async function main() {

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

  console.log('\n=== Coverage Queue v1 (STUB — no API calls) ===\n');
  console.log(`DB: host=${host} dbname=${dbname}`);
  console.log(`Params: limit=${limit} la_only=${laOnlyFlag}`);
  console.log(`Candidates: ${report.counts.candidates_count}\n`);

  console.log('Per-place missing field groups that WOULD be requested:\n');

  for (const c of report.candidates) {
    const groups = c.missing_groups.join(' | ');
    console.log(`  ${c.slug}`);
    console.log(`    place_id: ${c.place_id}`);
    console.log(`    dedupe_key: ${c.dedupe_key}`);
    console.log(`    missing: ${groups}`);
    console.log(
      `    would_request: ${describeRequests(c.missing_groups)}\n`
    );
  }

  console.log(
    `\nTotal: ${report.candidates.length} places would be queued (no APIs called).`
  );
}

function describeRequests(groups: string[]): string {
  const parts: string[] = [];
  if (groups.includes('NEED_HOURS')) parts.push('Google Places hours');
  if (groups.includes('NEED_GOOGLE_ATTRS'))
    parts.push('Google Places attributes');
  if (groups.includes('NEED_GOOGLE_PHOTOS'))
    parts.push('Google Places photos');
  if (groups.includes('NEED_DESCRIPTION'))
    parts.push('description/curator/pullQuote');
  if (groups.includes('NEED_TAG_SIGNALS'))
    parts.push('tag signals (energy/vibeTags)');
  return parts.join('; ') || 'none';
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
