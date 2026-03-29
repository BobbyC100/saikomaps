#!/usr/bin/env node
/**
 * enrich-place.ts — Full enrichment pipeline for a single entity.
 *
 * Runs all enrichment stages in sequence. Each stage is idempotent —
 * already-complete work is skipped automatically by the underlying scripts.
 *
 * Usage:
 *   npm run enrich:place -- --slug=republique
 *   npm run enrich:place -- --slug=republique --dry-run
 *   npm run enrich:place -- --slug=republique --from=3     # resume from stage 3
 *   npm run enrich:place -- --slug=republique --only=5     # run only stage 5
 *   npm run enrich:place -- --batch=50 --concurrency=5    # website-first bulk (stages 2-7)
 *   npm run enrich:place -- --batch=50 --include-google   # include stage 1 (Google Places)
 *
 * Stages:
 *   1  Google Places identity commit  (GPID, coords, address, hours, photos)
 *   2  Surface discovery              (find homepage/menu/about/contact URLs)
 *   3  Surface fetch                  (capture raw HTML/text)
 *   4  Surface parse                  (structure captured content)
 *   5  Identity signal extraction     (AI → derived_signals)
 *   6  Website enrichment             (menu_url, reservation_url → Fields v2)
 *   7  Interpretation                 (AI → interpretation_cache)
 */

import { spawnSync, spawn as spawnAsync } from 'child_process';
import { PrismaClient, Prisma } from '@prisma/client';
import { scanEntities } from '../lib/coverage/issue-scanner';
import { isEntityEnriched } from '../lib/coverage/enrichment-profiles';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : null;
}

const slug = getArg('slug');
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const noAutoComplete = args.includes('--no-autocomplete');
const includeGoogle = args.includes('--include-google');
const fromStage = parseInt(getArg('from') ?? (includeGoogle ? '1' : '2'), 10);
const onlyStage = getArg('only') ? parseInt(getArg('only')!, 10) : null;
const batchArg = getArg('batch');
const batchSize = batchArg ? parseInt(batchArg, 10) : null;
const concurrencyArg = getArg('concurrency');
const concurrency = concurrencyArg ? parseInt(concurrencyArg, 10) : 1;

if (!slug && !batchSize) {
  console.error('Usage: npm run enrich:place -- --slug=<slug>');
  console.error('       npm run enrich:place -- --batch=N');
  console.error('       npm run enrich:place -- --batch=N --concurrency=3');
  console.error('       npm run enrich:place -- --batch=N --force  (include already-enriched entities)');
  console.error('       npm run enrich:place -- --batch=N --include-google  (start from stage 1 instead of 2)');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// DB skip checks
// ---------------------------------------------------------------------------

const db = new PrismaClient();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function markEnrichmentStatus(entityId: string, status: 'ENRICHING' | 'ENRICHED') {
  await db.entities.update({
    where: { id: entityId },
    data: { enrichmentStatus: status },
  });
}

async function assessAndSyncEnrichmentStatus(entityId: string) {
  const [entity, hasOfferingPrograms, hasScenesense, hasEditorialCoverage, hasCurrentTagline, isNomadic] =
    await Promise.all([
      db.entities.findUnique({
        where: { id: entityId },
        select: {
          primaryVertical: true,
          category: true,
          slug: true,
          name: true,
          googlePlaceId: true,
          website: true,
          instagram: true,
          phone: true,
          latitude: true,
          longitude: true,
          neighborhood: true,
          reservationUrl: true,
          canonical_state: {
            select: {
              website: true,
              instagram: true,
              phone: true,
              hoursJson: true,
              reservationUrl: true,
              menuUrl: true,
              eventsUrl: true,
            },
          },
        },
      }),
      db.derived_signals.findFirst({
        where: { entityId, signalKey: 'offering_programs' },
        select: { entityId: true },
      }),
      db.interpretation_cache.findFirst({
        where: { entityId, outputType: 'SCENESENSE_PRL', isCurrent: true },
        select: { entityId: true },
      }),
      db.coverage_sources.findFirst({
        where: { entityId },
        select: { entityId: true },
      }),
      db.interpretation_cache.findFirst({
        where: { entityId, outputType: 'TAGLINE', isCurrent: true },
        select: { entityId: true },
      }),
      db.place_appearances.findFirst({
        where: { subjectEntityId: entityId },
        select: { subjectEntityId: true },
      }),
    ]);

  if (!entity) return { done: false, missing: ['entity_not_found'] };

  const assessment = isEntityEnriched({
    vertical: entity.primaryVertical ?? null,
    category: entity.category ?? null,
    slug: entity.slug,
    name: entity.name,
    isNomadic: Boolean(isNomadic),
    googlePlaceId: entity.googlePlaceId,
    website: entity.website,
    instagram: entity.instagram,
    phone: entity.phone,
    latitude: entity.latitude,
    longitude: entity.longitude,
    neighborhood: entity.neighborhood,
    reservationUrl: entity.reservationUrl,
    cesWebsite: entity.canonical_state?.website ?? null,
    cesInstagram: entity.canonical_state?.instagram ?? null,
    cesPhone: entity.canonical_state?.phone ?? null,
    cesHoursJson: entity.canonical_state?.hoursJson ?? null,
    cesReservationUrl: entity.canonical_state?.reservationUrl ?? null,
    cesMenuUrl: entity.canonical_state?.menuUrl ?? null,
    cesEventsUrl: entity.canonical_state?.eventsUrl ?? null,
    hasOfferingPrograms: Boolean(hasOfferingPrograms),
    hasScenesense: Boolean(hasScenesense),
    hasEditorialCoverage: Boolean(hasEditorialCoverage),
    hasCurrentTagline: Boolean(hasCurrentTagline),
  });

  await markEnrichmentStatus(entityId, assessment.done ? 'ENRICHED' : 'ENRICHING');
  return {
    done: assessment.done,
    missing: [
      ...assessment.identity.missing,
      ...assessment.access.missing,
      ...assessment.offering.missing,
      ...assessment.interpretation.missing,
    ],
  };
}

async function getEntity() {
  const entity = await db.entities.findUnique({
    where: { slug: slug! },
    select: {
      id: true,
      name: true,
      slug: true,
      website: true,
      googlePlaceId: true,
      lastEnrichedAt: true,
    },
  });
  if (!entity) {
    console.error(`Entity not found: "${slug}"`);
    process.exit(1);
  }
  return entity;
}

type SkipEntity = {
  id: string;
  website: string | null;
};

async function shouldSkip(stage: number, entity: SkipEntity): Promise<{ skip: boolean; reason: string }> {
  switch (stage) {
    case 1: {
      // Skip only if Google Places data has actually been fetched and cached
      const full = await db.entities.findUnique({
        where: { id: entity.id },
        select: { placesDataCachedAt: true },
      });
      if (full?.placesDataCachedAt) {
        return { skip: true, reason: 'Google Places data already cached (placesDataCachedAt set)' };
      }
      return { skip: false, reason: '' };
    }
    case 2: {
      const existing = await db.merchant_surfaces.findFirst({
        where: { entityId: entity.id },
        select: { id: true },
      });
      if (existing) return { skip: true, reason: 'surface rows already exist' };
      if (!entity.website) return { skip: true, reason: 'no website' };
      return { skip: false, reason: '' };
    }
    case 3: {
      const pending = await db.merchant_surfaces.findFirst({
        where: { entityId: entity.id, fetchStatus: 'discovered' },
        select: { id: true },
      });
      if (!pending) return { skip: true, reason: 'no surfaces with fetch_status=discovered' };
      return { skip: false, reason: '' };
    }
    case 4: {
      const pending = await db.merchant_surfaces.findFirst({
        where: { entityId: entity.id, fetchStatus: 'fetch_success', parseStatus: 'parse_pending' },
        select: { id: true },
      });
      if (!pending) return { skip: true, reason: 'no surfaces pending parse' };
      return { skip: false, reason: '' };
    }
    case 5: {
      const existing = await db.derived_signals.findFirst({
        where: { entityId: entity.id, signalKey: 'identity_signals' },
        select: { entityId: true },
      });
      if (existing) return { skip: true, reason: 'identity_signals already in derived_signals' };
      return { skip: false, reason: '' };
    }
    case 6: {
      if (!entity.website) return { skip: true, reason: 'no website' };
      const existing = await db.entities.findUnique({
        where: { id: entity.id },
        select: {
          reservationUrl: true,
          canonical_state: {
            select: { menuUrl: true },
          },
        },
      });
      if (existing?.reservationUrl && existing.canonical_state?.menuUrl) {
        return { skip: true, reason: 'website enrichment outputs already present' };
      }
      return { skip: false, reason: '' };
    }
    case 7: {
      const existing = await db.interpretation_cache.findFirst({
        where: { entityId: entity.id, outputType: 'TAGLINE', isCurrent: true },
        select: { entityId: true },
      });
      if (existing) return { skip: true, reason: 'TAGLINE already in interpretation_cache' };
      return { skip: false, reason: '' };
    }
    default:
      return { skip: false, reason: '' };
  }
}

// ---------------------------------------------------------------------------
// Stage runner
// ---------------------------------------------------------------------------

const TSX = './node_modules/.bin/tsx';

async function run(stage: number, label: string, script: string, extraArgs: string[], entityId?: string, async_: boolean = false): Promise<boolean> {
  const stageArgs = dryRun ? [...extraArgs, '--dry-run'] : extraArgs;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Stage ${stage}: ${label}`);
  console.log(`  node -r ./scripts/load-env.js ${TSX} ${script} ${stageArgs.join(' ')}`);
  console.log('─'.repeat(60));

  let exitCode: number | null;

  if (async_) {
    // Async spawn — allows concurrent entity processing in batch mode
    exitCode = await new Promise<number | null>((resolve) => {
      const child = spawnAsync('node', ['-r', './scripts/load-env.js', TSX, script, ...stageArgs], {
        stdio: 'inherit',
        env: process.env,
        cwd: process.cwd(),
      });
      child.on('close', (code) => resolve(code));
      child.on('error', () => resolve(1));
    });
  } else {
    // Sync spawn — simpler for single-entity mode
    const result = spawnSync('node', ['-r', './scripts/load-env.js', TSX, script, ...stageArgs], {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd(),
    });
    exitCode = result.status;
  }

  if (exitCode !== 0) {
    console.error(`\n⚠  Stage ${stage} exited with status ${exitCode}`);
    return false;
  }

  // Track highest completed stage
  if (!dryRun && entityId) {
    try {
      await db.entities.update({
        where: { id: entityId },
        data: { enrichmentStage: String(stage) },
      });
      console.log(`  ✓ enrichmentStage updated to ${stage}`);
    } catch (err: unknown) {
      console.error(`  ✗ Failed to update enrichmentStage: ${getErrorMessage(err)}`);
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Batch / single mode
// ---------------------------------------------------------------------------

async function runBatch(n: number) {
  console.log(`\n🔁 Batch enrichment — ${n} entities (concurrency: ${concurrency})\n`);
  if (dryRun) console.log('   DRY RUN — no writes\n');
  if (force) console.log('   FORCE MODE — including previously enriched entities\n');

  // Pick N not-yet-enriched entities for website-first lane work.
  const whereClause: Prisma.entitiesWhereInput = {
    website: { not: null },
    ...(force ? {} : { enrichmentStatus: { in: ['INGESTED', 'ENRICHING'] } }),
  };

  const candidates = await db.entities.findMany({
    where: whereClause,
    select: { id: true, name: true, slug: true, website: true, googlePlaceId: true, lastEnrichedAt: true },
    take: n * 3, // oversample for shuffle
  });

  // Shuffle and pick n
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const batch = candidates.slice(0, n);

  if (batch.length === 0) {
    console.log('No unenriched LA entities found.');
    return;
  }

  console.log(`Selected ${batch.length} entities:\n`);
  for (const e of batch) console.log(`  · ${e.slug}`);
  console.log('');

  const summary: { slug: string; status: 'ok' | 'failed' }[] = [];
  const useAsync = concurrency > 1;

  async function enrichEntity(entity: typeof batch[0]): Promise<{ slug: string; status: 'ok' | 'failed' }> {
    console.log(`\n${'▓'.repeat(60)}`);
    console.log(`Enriching: ${entity.name} (${entity.slug})`);
    console.log('▓'.repeat(60));

    const stages = buildStages(entity);
    let failed = false;

    if (!dryRun) {
      try {
        await markEnrichmentStatus(entity.id, 'ENRICHING');
      } catch (err: unknown) {
        console.error(`  ✗ Failed to mark enrichmentStatus=ENRICHING: ${getErrorMessage(err)}`);
      }
    }

    for (const stage of stages) {
      if (onlyStage === null && stage.n < fromStage) continue;
      if (onlyStage !== null && stage.n !== onlyStage) continue;

      if (!force && onlyStage === null) {
        const { skip, reason } = await shouldSkip(stage.n, entity);
        if (skip) {
          console.log(`  Stage ${stage.n}: ${stage.label} — skipped (${reason})`);
          continue;
        }
      }

      const ok = await run(stage.n, stage.label, stage.script, stage.args(), entity.id, useAsync);
      if (!ok) {
        console.error(`  Pipeline stopped at stage ${stage.n} for ${entity.slug}`);
        failed = true;
        break;
      }
    }

    // Mark enrichment timestamp + auto-clear review flag
    if (!dryRun && !failed) {
      try {
        await db.entities.update({
          where: { id: entity.id },
          data: { lastEnrichedAt: new Date() },
        });
        console.log(`  ✓ lastEnrichedAt updated`);
      } catch (err: unknown) {
        console.error(`  ✗ Failed to update lastEnrichedAt: ${getErrorMessage(err)}`);
      }

      try {
        const statusResult = await assessAndSyncEnrichmentStatus(entity.id);
        if (statusResult.done) {
          console.log('  ✓ Interpretation layer satisfied; entity marked ENRICHED');
        } else {
          console.log(`  · Interpretation layer incomplete; remains ENRICHING (missing: ${statusResult.missing.join(', ') || 'none'})`);
        }
      } catch (err: unknown) {
        console.error(`  ✗ Failed to evaluate enrichment completion: ${getErrorMessage(err)}`);
      }

      const hasTagline = await db.interpretation_cache.findFirst({
        where: { entityId: entity.id, outputType: 'TAGLINE', isCurrent: true },
        select: { entityId: true },
      });
      if (hasTagline) {
        try {
          await db.entities.update({
            where: { id: entity.id },
            data: { needsHumanReview: false },
          });
          console.log(`  ✓ needsHumanReview cleared`);
        } catch (err: unknown) {
          console.error(`  ✗ Failed to clear needsHumanReview: ${getErrorMessage(err)}`);
        }
      }
    }

    return { slug: entity.slug, status: failed ? 'failed' : 'ok' };
  }

  // Process entities with concurrency limit
  if (concurrency > 1) {
    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(concurrency);
    const results = await Promise.all(
      batch.map((entity) => limit(() => enrichEntity(entity)))
    );
    summary.push(...results);
  } else {
    // Sequential — simpler output, uses spawnSync
    for (const entity of batch) {
      summary.push(await enrichEntity(entity));
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('Batch enrichment summary');
  console.log('═'.repeat(60));
  for (const r of summary) {
    console.log(`  ${r.status === 'ok' ? '✓' : '✗'} ${r.slug}`);
  }
  const ok = summary.filter((r) => r.status === 'ok').length;
  console.log(`\n  ${ok}/${summary.length} succeeded`);
}

function buildStages(entity: Awaited<ReturnType<typeof getEntity>>) {
  return [
    {
      n: 1,
      label: 'Google Places identity commit',
      script: 'scripts/backfill-google-places.ts',
      args: () => ['--slug', entity.slug],
    },
    {
      n: 2,
      label: 'Surface discovery',
      script: 'scripts/run-surface-discovery.ts',
      args: () => [`--entity-id=${entity.id}`, '--limit=1', ...(force ? ['--refresh'] : [])],
    },
    {
      n: 3,
      label: 'Surface fetch',
      script: 'scripts/run-surface-fetch.ts',
      args: () => [`--entity-id=${entity.id}`, '--limit=20'],
    },
    {
      n: 4,
      label: 'Surface parse',
      script: 'scripts/run-surface-parse.ts',
      args: () => [`--entity-id=${entity.id}`, '--limit=20'],
    },
    {
      n: 5,
      label: 'Identity signal extraction (AI)',
      script: 'scripts/extract-identity-signals.ts',
      args: () => [`--slug=${entity.slug}`],
    },
    {
      n: 6,
      label: 'Website enrichment',
      script: 'scripts/run-website-enrichment.ts',
      args: () => [`--slug=${entity.slug}`],
    },
    {
      n: 7,
      label: 'Interpretation (AI)',
      script: 'scripts/generate-taglines-v2.ts',
      args: () => [`--slug=${entity.slug}`],
    },
  ];
}

async function main() {
  if (batchSize) {
    await runBatch(batchSize);
    return;
  }

  const entity = await getEntity();

  console.log(`\nEnrich: ${entity.name} (${entity.slug})`);
  console.log(`  ID:      ${entity.id}`);
  console.log(`  Website: ${entity.website ?? '—'}`);
  console.log(`  GPID:    ${entity.googlePlaceId ?? '(none)'}`);
  if (dryRun) console.log(`  DRY RUN — no writes will be made`);

  const stages = buildStages(entity);
  const results: { n: number; label: string; status: 'ran' | 'skipped' | 'failed' }[] = [];

  if (!dryRun) {
    try {
      await markEnrichmentStatus(entity.id, 'ENRICHING');
      console.log(`  ✓ enrichmentStatus set to ENRICHING`);
    } catch (err: unknown) {
      console.error(`  ✗ Failed to set enrichmentStatus=ENRICHING: ${getErrorMessage(err)}`);
    }
  }

  for (const stage of stages) {
    if (onlyStage !== null && stage.n !== onlyStage) {
      results.push({ n: stage.n, label: stage.label, status: 'skipped' });
      continue;
    }
    if (onlyStage === null && stage.n < fromStage) {
      results.push({ n: stage.n, label: stage.label, status: 'skipped' });
      continue;
    }

    // When --only or --force is set, skip checks are bypassed
    if (!force && onlyStage === null) {
      const { skip, reason } = await shouldSkip(stage.n, entity);
      if (skip) {
        console.log(`\nStage ${stage.n}: ${stage.label} — skipped (${reason})`);
        results.push({ n: stage.n, label: stage.label, status: 'skipped' });
        continue;
      }
    }

    const ok = await run(stage.n, stage.label, stage.script, stage.args(), entity.id);
    results.push({ n: stage.n, label: stage.label, status: ok ? 'ran' : 'failed' });

    if (!ok) {
      console.error(`\nPipeline stopped at stage ${stage.n}. Fix the error and re-run with --from=${stage.n}`);
      break;
    }
  }

  // Autonomous completion lane: coverage discovery/fetch/extract + offering assembly.
  // This makes single-entity enrichment closer to "enter place, pipeline finishes".
  if (!dryRun && !noAutoComplete && onlyStage === null) {
    const completionSteps = [
      {
        n: 8,
        label: 'Coverage discovery',
        script: 'scripts/discover-coverage-sources.ts',
        args: () => [`--slug=${entity.slug}`, '--limit=1'],
      },
      {
        n: 9,
        label: 'Coverage fetch',
        script: 'scripts/fetch-coverage-sources.ts',
        args: () => [`--slug=${entity.slug}`, '--limit=20'],
      },
      {
        n: 10,
        label: 'Coverage extraction',
        script: 'scripts/extract-coverage-sources.ts',
        args: () => [`--slug=${entity.slug}`, '--limit=20'],
      },
      {
        n: 11,
        label: 'Offering program assembly (finalize)',
        script: 'scripts/assemble-offering-programs.ts',
        args: () => [`--slug=${entity.slug}`, '--reprocess'],
      },
      {
        n: 12,
        label: 'Interpretation refresh',
        script: 'scripts/generate-taglines-v2.ts',
        args: () => [`--slug=${entity.slug}`, '--reprocess'],
      },
    ] as const;

    console.log('\nRunning autonomous completion steps...');
    for (const step of completionSteps) {
      const ok = await run(step.n, step.label, step.script, step.args());
      results.push({ n: step.n, label: step.label, status: ok ? 'ran' : 'failed' });
      if (!ok) {
        console.error(`\nAutonomous completion stopped at step ${step.n}.`);
        break;
      }
    }
  }

  // Mark enrichment timestamp + auto-clear review flag
  if (!dryRun) {
    const anyRan = results.some((r) => r.status === 'ran');
    if (anyRan) {
      try {
        await db.entities.update({
          where: { id: entity.id },
          data: { lastEnrichedAt: new Date() },
        });
        console.log(`  ✓ lastEnrichedAt updated`);
      } catch (err: unknown) {
        console.error(`  ✗ Failed to update lastEnrichedAt: ${getErrorMessage(err)}`);
      }

      try {
        const statusResult = await assessAndSyncEnrichmentStatus(entity.id);
        if (statusResult.done) {
          console.log('  ✓ Interpretation layer satisfied; entity marked ENRICHED');
        } else {
          console.log(`  · Interpretation layer incomplete; remains ENRICHING (missing: ${statusResult.missing.join(', ') || 'none'})`);
        }
      } catch (err: unknown) {
        console.error(`  ✗ Failed to evaluate enrichment completion: ${getErrorMessage(err)}`);
      }
    }

    const hasTagline = await db.interpretation_cache.findFirst({
      where: { entityId: entity.id, outputType: 'TAGLINE', isCurrent: true },
      select: { entityId: true },
    });
    if (hasTagline) {
      try {
        await db.entities.update({
          where: { id: entity.id },
          data: { needsHumanReview: false },
        });
        console.log(`  ✓ needsHumanReview cleared`);
      } catch (err: unknown) {
        console.error(`  ✗ Failed to clear needsHumanReview: ${getErrorMessage(err)}`);
      }
    }
  }

  // Auto-rescan issues for this entity so dashboard reflects new data
  if (!dryRun) {
    console.log('\nRe-scanning issues...');
    try {
      const scanResult = await scanEntities(db, { slugs: [entity.slug!] });
      console.log(`  Issues: ${scanResult.issuesCreated} created, ${scanResult.issuesResolved} resolved, ${scanResult.issuesUnchanged} unchanged`);
    } catch (e) {
      console.error('  Issue rescan failed (non-fatal):', e);
    }
  }

  // Post-run orchestration scorecard (non-fatal)
  if (!dryRun) {
    console.log('\nOrchestration scorecard...');
    try {
      const result = spawnSync('node', ['-r', './scripts/load-env.js', TSX, 'scripts/enrichment-orchestration-scorecard.ts', `--slug=${entity.slug}`, '--json'], {
        stdio: 'pipe',
        env: process.env,
        cwd: process.cwd(),
      });
      if (result.status !== 0) {
        console.error('  Scorecard failed (non-fatal).');
      } else {
        const raw = result.stdout?.toString() ?? '';
        try {
          const payload = JSON.parse(raw) as {
            rows?: Array<{ slug: string; offeringReady: boolean | null; gateReasons: string[] }>;
            slo?: {
              discoveryToFetchCoverage: { numerator: number; denominator: number; ratio: number | null };
              fetchToInterpretCompletion: { numerator: number; denominator: number; ratio: number | null };
              offeringAvailability: { numerator: number; denominator: number; ratio: number | null };
            };
          };
          const row = (payload.rows ?? [])[0];
          if (row) {
            if (row.offeringReady === false) {
              console.log(`  · Offering readiness blocked: ${row.gateReasons.join(', ') || 'unknown reasons'}`);
            } else if (row.offeringReady === true) {
              console.log('  ✓ Offering readiness passed');
            }
          }
          if (payload.slo) {
            const toPct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`);
            console.log(
              `  · SLO discovery->fetch: ${payload.slo.discoveryToFetchCoverage.numerator}/${payload.slo.discoveryToFetchCoverage.denominator} (${toPct(payload.slo.discoveryToFetchCoverage.ratio)})`
            );
            console.log(
              `  · SLO fetch->interpret: ${payload.slo.fetchToInterpretCompletion.numerator}/${payload.slo.fetchToInterpretCompletion.denominator} (${toPct(payload.slo.fetchToInterpretCompletion.ratio)})`
            );
            console.log(
              `  · SLO offering availability: ${payload.slo.offeringAvailability.numerator}/${payload.slo.offeringAvailability.denominator} (${toPct(payload.slo.offeringAvailability.ratio)})`
            );
          }
        } catch {
          // Fall back to plain output if JSON parsing fails for any reason.
          if (raw.trim()) {
            console.log(raw.trim());
          }
        }
      }
    } catch (e) {
      console.error('  Scorecard failed (non-fatal):', e);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Enrichment summary: ${entity.name}`);
  console.log('═'.repeat(60));
  for (const r of results) {
    const icon = r.status === 'ran' ? '✓' : r.status === 'skipped' ? '·' : '✗';
    console.log(`  ${icon} Stage ${r.n}: ${r.label} (${r.status})`);
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
