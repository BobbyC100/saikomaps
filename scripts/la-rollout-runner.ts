#!/usr/bin/env node
/**
 * LA Rollout: "Empty the Chambers"
 * Runs all Tier 1 + Tier 2 enrichment for LA only, then entity groups.
 *
 * Order:
 * 1. Tier 1: Backfill websites from Google (LA-only)
 * 2. Tier 2: Website enrichment batch (LA-only)
 * 3. Tier 2b: About/Menu/Wine scrape (LA-only)
 * 4. Human review sweep
 * 5. Entity groups pass
 *
 * Usage:
 *   npm run la:rollout:dry -- --limit 10
 *   npm run la:rollout -- --limit 200
 *   npm run la:rollout -- --limit 50 --verbose
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { db } from '@/lib/db';
import { getPlaceIds, getLaCanonicalIds } from '@/lib/la-scope';

function parseArgs(): {
  dryRun: boolean;
  limit: number | null;
  verbose: boolean;
  laOnly: boolean;
} {
  const argv = process.argv.slice(2);
  const limitArg =
    argv.find((a) => a.startsWith('--limit=')) ??
    (argv.includes('--limit') ? argv[argv.indexOf('--limit') + 1] : null);
  const limit = limitArg ? parseInt(String(limitArg).replace(/^--limit=/, ''), 10) : null;
  return {
    dryRun: argv.includes('--dry-run'),
    limit: Number.isFinite(limit) && limit! > 0 ? limit! : null,
    verbose: argv.includes('--verbose'),
    laOnly: argv.includes('--la-only'),
  };
}

function runScript(
  name: string,
  script: string,
  args: string[],
  verbose: boolean
): { ok: boolean; code: number } {
  const fullArgs = [script, ...args];
  if (verbose) console.log(`\n▶ Running: npx tsx ${script} ${args.join(' ')}\n`);
  const result = spawnSync(
    path.join(process.cwd(), 'node_modules/.bin/tsx'),
    fullArgs,
    { stdio: 'inherit', cwd: process.cwd(), env: process.env }
  );
  const ok = result.status === 0;
  if (!ok && verbose) console.error(`\n✗ ${name} exited with code ${result.status}`);
  return { ok, code: result.status ?? 1 };
}

async function gatherReport(laEntityIds: string[], laCanonicalIds: string[]) {
  const idSet = new Set(laEntityIds);
  const canonicalSet = new Set(laCanonicalIds);

  const entities = await db.entities.findMany({
    where: { id: { in: laEntityIds } },
    select: {
      id: true,
      status: true,
      googlePlaceId: true,
      website: true,
      enrichment_stage: true,
      needs_human_review: true,
    },
  });

  const goldenRecords = await db.golden_records.findMany({
    where: { canonical_id: { in: laCanonicalIds } },
    select: {
      canonical_id: true,
      google_place_id: true,
      scrape_status: true,
      about_copy: true,
      menu_url: true,
      winelist_url: true,
    },
  });

  const entityByGpid = new Map(
    entities.filter((e) => e.googlePlaceId).map((e) => [e.googlePlaceId!, e])
  );

  const openWithGpid = entities.filter(
    (e) => e.status === 'OPEN' && e.googlePlaceId && e.googlePlaceId.trim()
  );
  const hasWebsite = openWithGpid.filter((e) => e.website?.trim());
  const missingWebsite = openWithGpid.filter((e) => !e.website?.trim());
  const tier2Success = entities.filter((e) => e.enrichment_stage === 'MERCHANT_ENRICHED');
  const tier2Failed = entities.filter((e) => e.enrichment_stage === 'FAILED');
  const needsHumanReview = entities.filter((e) => e.needs_human_review);

  const scrapeSuccess = goldenRecords.filter((r) => r.scrape_status === 'success');
  const scrapePartial = goldenRecords.filter((r) => r.scrape_status === 'partial');
  const scrapeFail = goldenRecords.filter((r) =>
    ['failed', 'blocked', 'timeout', 'no_website'].includes(r.scrape_status ?? '')
  );

  const aboutCopyCount = goldenRecords.filter((r) => r.about_copy?.trim()).length;
  const menuUrlCount = goldenRecords.filter((r) => r.menu_url?.trim()).length;
  const winelistUrlCount = goldenRecords.filter((r) => r.winelist_url?.trim()).length;

  const merchantSignalsCount = await db.merchant_signals.count({
    where: { entityId: { in: laEntityIds } },
  });

  return {
    totalLaOpenWithGpid: openWithGpid.length,
    hasWebsite: hasWebsite.length,
    missingWebsite: missingWebsite.length,
    tier2Success: tier2Success.length,
    tier2Failed: tier2Failed.length,
    scrapeSuccess: scrapeSuccess.length,
    scrapePartial: scrapePartial.length,
    scrapeFail: scrapeFail.length,
    needsHumanReview: needsHumanReview.length,
    merchantSignals: merchantSignalsCount,
    aboutCopyCount,
    menuUrlCount,
    winelistUrlCount,
  };
}

async function main() {
  const { dryRun, limit, verbose, laOnly } = parseArgs();

  if (!laOnly) {
    console.error('This rollout requires --la-only. Exiting.');
    process.exit(1);
  }

  const laEntityIds = await getPlaceIds({ laOnly: true, limit: null });
  const laCanonicalIds = await getLaCanonicalIds({ limit: null });
  if (!laEntityIds?.length) {
    console.error('No LA entities in scope.');
    process.exit(1);
  }

  const limitArgs = limit ? [`--limit=${limit}`] : [];
  const dryRunArgs = dryRun ? ['--dry-run'] : [];
  const verboseArgs = verbose ? ['--verbose'] : [];
  const commonArgs = ['--la-only', ...limitArgs, ...dryRunArgs, ...verboseArgs];

  console.log('\n' + '═'.repeat(60));
  console.log('LA ROLLOUT: "Empty the Chambers"');
  console.log('═'.repeat(60));
  console.log(`  la-only: true | dry-run: ${dryRun} | limit: ${limit ?? 'none'}`);
  console.log('');

  const reportBefore = await gatherReport(laEntityIds, laCanonicalIds);

  // Step 1: Tier 1 backfill websites
  const s1 = runScript(
    'Tier 1: Backfill websites from Google',
    path.join(__dirname, 'backfill-websites-from-google.ts'),
    commonArgs,
    verbose
  );
  if (!s1.ok && !dryRun) {
    console.error('Step 1 failed. Continuing...');
  }

  // Step 2: Tier 2 website enrichment
  const s2 = runScript(
    'Tier 2: Website enrichment',
    path.join(__dirname, 'run-tier2-website-enrichment.ts'),
    commonArgs,
    verbose
  );
  if (!s2.ok && !dryRun) {
    console.error('Step 2 failed. Continuing...');
  }

  // Step 3: Tier 2b About/Menu/Wine scrape
  const s3 = runScript(
    'Tier 2b: About/Menu/Wine scrape',
    path.join(__dirname, 'scrape-menus-from-websites.ts'),
    commonArgs,
    verbose
  );
  if (!s3.ok && !dryRun) {
    console.error('Step 3 failed. Continuing...');
  }

  // Step 4: Human review sweep
  const s4 = runScript(
    'Human review sweep',
    path.join(__dirname, 'sweep-human-review-tier2.ts'),
    commonArgs,
    verbose
  );
  if (!s4.ok && !dryRun) {
    console.error('Step 4 failed. Continuing...');
  }

  // Step 5: Entity groups
  const s5 = runScript(
    'Entity groups',
    path.join(__dirname, 'run-entity-groups-la.ts'),
    dryRun ? ['--dry-run'] : [],
    verbose
  );
  if (!s5.ok && !dryRun) {
    console.error('Step 5 failed. Continuing...');
  }

  const reportAfter = await gatherReport(laEntityIds, laCanonicalIds);

  // Final report
  console.log('\n' + '═'.repeat(60));
  console.log('LA ROLLOUT — FINAL REPORT');
  console.log('═'.repeat(60));
  console.log('\n📊 COVERAGE');
  console.log('  total LA OPEN with GPID:    ', reportAfter.totalLaOpenWithGpid);
  console.log('  has website:                ', reportAfter.hasWebsite);
  console.log('  missing website:            ', reportAfter.missingWebsite);
  console.log('  tier2 success:              ', reportAfter.tier2Success);
  console.log('  tier2 fail:                 ', reportAfter.tier2Failed);
  console.log('  scrape success:             ', reportAfter.scrapeSuccess);
  console.log('  scrape partial:             ', reportAfter.scrapePartial);
  console.log('  scrape fail:                ', reportAfter.scrapeFail);
  console.log('  needs_human_review before:  ', reportBefore.needsHumanReview);
  console.log('  needs_human_review after:   ', reportAfter.needsHumanReview);
  console.log('  needs_human_review delta:   ', reportAfter.needsHumanReview - reportBefore.needsHumanReview);

  console.log('\n📦 DATA PRODUCED');
  console.log('  merchant_signals before:    ', reportBefore.merchantSignals);
  console.log('  merchant_signals after:     ', reportAfter.merchantSignals);
  console.log('  merchant_signals delta:     ', reportAfter.merchantSignals - reportBefore.merchantSignals);
  console.log('  golden_records about_copy:  ', reportAfter.aboutCopyCount);
  console.log('  golden_records menu_url:    ', reportAfter.menuUrlCount);
  console.log('  golden_records winelist_url:', reportAfter.winelistUrlCount);
  console.log('═'.repeat(60));
  if (dryRun) console.log('\n🔸 DRY RUN — no database writes were made.');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
