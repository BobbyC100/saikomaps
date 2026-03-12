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
 *
 * Stages:
 *   1  Google Places identity commit  (GPID, coords, address, hours, photos)
 *   2  Surface discovery              (find homepage/menu/about/contact URLs)
 *   3  Surface fetch                  (capture raw HTML/text)
 *   4  Surface parse                  (structure captured content)
 *   5  Identity signal extraction     (AI → derived_signals)
 *   6  Website enrichment             (menu_url, reservation_url → Fields v2)
 *   7  Tagline generation             (AI → interpretation_cache)
 */

import { spawnSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

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
const fromStage = parseInt(getArg('from') ?? '1', 10);
const onlyStage = getArg('only') ? parseInt(getArg('only')!, 10) : null;
const batchArg = getArg('batch');
const batchSize = batchArg ? parseInt(batchArg, 10) : null;

if (!slug && !batchSize) {
  console.error('Usage: npm run enrich:place -- --slug=<slug>');
  console.error('       npm run enrich:place -- --batch=N');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// DB skip checks
// ---------------------------------------------------------------------------

const db = new PrismaClient();

async function getEntity() {
  const entity = await db.entities.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      website: true,
      googlePlaceId: true,
      last_enriched_at: true,
    },
  });
  if (!entity) {
    console.error(`Entity not found: "${slug}"`);
    process.exit(1);
  }
  return entity;
}

async function shouldSkip(stage: number, entity: Awaited<ReturnType<typeof getEntity>>): Promise<{ skip: boolean; reason: string }> {
  switch (stage) {
    case 1: {
      // Google Places identity (GPID lookup + place data) is a cost-controlled
      // operation managed by backfill-google-places.ts, run as a separate batch.
      // Never auto-triggered per-entity to prevent wrong-place matches and
      // uncontrolled API spend. Run: npm run backfill:google -- --slug=<slug>
      return { skip: true, reason: 'Google Places identity resolved separately via backfill-google-places.ts' };
    }
    case 2: {
      const existing = await db.merchant_surfaces.findFirst({
        where: { entity_id: entity.id },
        select: { id: true },
      });
      if (existing) return { skip: true, reason: 'surface rows already exist' };
      if (!entity.website) return { skip: true, reason: 'no website' };
      return { skip: false, reason: '' };
    }
    case 3: {
      const pending = await db.merchant_surfaces.findFirst({
        where: { entity_id: entity.id, fetch_status: 'discovered' },
        select: { id: true },
      });
      if (!pending) return { skip: true, reason: 'no surfaces with fetch_status=discovered' };
      return { skip: false, reason: '' };
    }
    case 4: {
      const pending = await db.merchant_surfaces.findFirst({
        where: { entity_id: entity.id, fetch_status: 'fetch_success', parse_status: 'parse_pending' },
        select: { id: true },
      });
      if (!pending) return { skip: true, reason: 'no surfaces pending parse' };
      return { skip: false, reason: '' };
    }
    case 5: {
      const existing = await db.derived_signals.findFirst({
        where: { entity_id: entity.id, signal_key: 'identity_signals' },
        select: { entity_id: true },
      });
      if (existing) return { skip: true, reason: 'identity_signals already in derived_signals' };
      return { skip: false, reason: '' };
    }
    case 6: {
      if (entity.last_enriched_at) return { skip: true, reason: 'last_enriched_at already set' };
      if (!entity.website) return { skip: true, reason: 'no website' };
      return { skip: false, reason: '' };
    }
    case 7: {
      const existing = await db.interpretation_cache.findFirst({
        where: { entity_id: entity.id, output_type: 'TAGLINE', is_current: true },
        select: { entity_id: true },
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

async function run(stage: number, label: string, script: string, extraArgs: string[], entityId?: string): Promise<boolean> {
  const stageArgs = dryRun ? [...extraArgs, '--dry-run'] : extraArgs;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Stage ${stage}: ${label}`);
  console.log(`  ${[TSX, script, ...stageArgs].join(' ')}`);
  console.log('─'.repeat(60));

  const result = spawnSync(TSX, [script, ...stageArgs], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\n⚠  Stage ${stage} exited with status ${result.status}`);
    return false;
  }

  // Track highest completed stage
  if (!dryRun && entityId) {
    await db.entities.update({
      where: { id: entityId },
      data: { enrichment_stage: String(stage) },
    }).catch(() => {}); // non-fatal
  }

  return true;
}

// ---------------------------------------------------------------------------
// Batch / single mode
// ---------------------------------------------------------------------------

async function runBatch(n: number) {
  console.log(`\n🔁 Batch enrichment — ${n} entities\n`);
  if (dryRun) console.log('   DRY RUN — no writes\n');

  // Pick N unenriched LA-area entities (no interpretation_cache TAGLINE yet)
  const enrichedIds = (await db.interpretation_cache.findMany({
    where: { output_type: 'TAGLINE', is_current: true },
    select: { entity_id: true },
  })).map((r) => r.entity_id).filter(Boolean) as string[];

  const candidates = await db.entities.findMany({
    where: {
      id: { notIn: enrichedIds },
      googlePlaceId: { contains: 'woAR' },
    },
    select: { id: true, name: true, slug: true, website: true, googlePlaceId: true, last_enriched_at: true },
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

  for (const entity of batch) {
    console.log(`\n${'▓'.repeat(60)}`);
    console.log(`Enriching: ${entity.name} (${entity.slug})`);
    console.log('▓'.repeat(60));

    // Re-use the stages array with this entity
    const stages = buildStages(entity);
    let failed = false;

    for (const stage of stages) {
      if (stage.n < fromStage) continue;
      if (onlyStage !== null && stage.n !== onlyStage) continue;

      const { skip, reason } = await shouldSkip(stage.n, entity);
      if (skip) {
        console.log(`  Stage ${stage.n}: ${stage.label} — skipped (${reason})`);
        continue;
      }

      const ok = await run(stage.n, stage.label, stage.script, stage.args(), entity.id);
      if (!ok) {
        console.error(`  Pipeline stopped at stage ${stage.n} for ${entity.slug}`);
        failed = true;
        break;
      }
    }

    // Auto-clear needs_human_review if tagline was successfully generated
    if (!dryRun && !failed) {
      const hasTagline = await db.interpretation_cache.findFirst({
        where: { entity_id: entity.id, output_type: 'TAGLINE', is_current: true },
        select: { entity_id: true },
      });
      if (hasTagline) {
        await db.entities.update({
          where: { id: entity.id },
          data: { needs_human_review: false },
        });
      }
    }

    summary.push({ slug: entity.slug, status: failed ? 'failed' : 'ok' });
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
      args: () => [`--entity-id=${entity.id}`, '--limit=1'],
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
      args: () => [`--place=${entity.name}`],
    },
    {
      n: 6,
      label: 'Website enrichment',
      script: 'scripts/run-website-enrichment.ts',
      args: () => [`--slug=${entity.slug}`],
    },
    {
      n: 7,
      label: 'Tagline generation (AI)',
      script: 'scripts/generate-taglines-v2.ts',
      args: () => [`--place=${entity.name}`],
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

  for (const stage of stages) {
    if (onlyStage !== null && stage.n !== onlyStage) {
      results.push({ n: stage.n, label: stage.label, status: 'skipped' });
      continue;
    }
    if (stage.n < fromStage) {
      results.push({ n: stage.n, label: stage.label, status: 'skipped' });
      continue;
    }

    const { skip, reason } = await shouldSkip(stage.n, entity);
    if (skip) {
      console.log(`\nStage ${stage.n}: ${stage.label} — skipped (${reason})`);
      results.push({ n: stage.n, label: stage.label, status: 'skipped' });
      continue;
    }

    const ok = await run(stage.n, stage.label, stage.script, stage.args(), entity.id);
    results.push({ n: stage.n, label: stage.label, status: ok ? 'ran' : 'failed' });

    if (!ok) {
      console.error(`\nPipeline stopped at stage ${stage.n}. Fix the error and re-run with --from=${stage.n}`);
      break;
    }
  }

  // Auto-clear needs_human_review if tagline was successfully generated
  if (!dryRun) {
    const hasTagline = await db.interpretation_cache.findFirst({
      where: { entity_id: entity.id, output_type: 'TAGLINE', is_current: true },
      select: { entity_id: true },
    });
    if (hasTagline) {
      await db.entities.update({
        where: { id: entity.id },
        data: { needs_human_review: false },
      });
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
