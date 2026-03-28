#!/usr/bin/env node
/**
 * Warm SceneSense cache (SCENESENSE_PRL) in batch.
 *
 * - Computes PRL + SceneSense using canonical PRL materializer + assembly path
 * - Writes interpretation_cache outputType=SCENESENSE_PRL when --apply is set
 * - Dry-run by default
 *
 * Usage:
 *   npx tsx scripts/warm-scenesense-cache.ts
 *   npx tsx scripts/warm-scenesense-cache.ts --apply --limit=500
 *   npx tsx scripts/warm-scenesense-cache.ts --apply --slug=buvons
 *   npx tsx scripts/warm-scenesense-cache.ts --apply --no-la-only
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  loadEnv({ path: '.env.local', override: true });
}

import { db } from '@/lib/db';
import {
  fetchPlaceForPRLBatch,
  fetchPlaceForPRLBySlug,
  assembleSceneSenseFromMaterialized,
  buildCoverageAtmosphereInput,
  type CoverageAtmosphereExtractionRow,
} from '@/lib/scenesense';
import { writeInterpretationCache } from '@/lib/fields-v2/write-claim';

const DEFAULT_LIMIT = 500;
const PROMPT_VERSION = 'scenesense-warm-v1';

function parseArgs() {
  const argv = process.argv.slice(2);
  const getArg = (name: string): string | null => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.split('=').slice(1).join('=') : null;
  };
  const limitRaw = Number.parseInt(getArg('limit') ?? '', 10);
  return {
    apply: argv.includes('--apply'),
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT,
    slug: getArg('slug'),
    laOnly: !argv.includes('--no-la-only'),
    verbose: argv.includes('--verbose'),
  };
}

function parseIdentity(signalValue: unknown): {
  place_personality: string | null;
  language_signals: string[];
  signature_dishes: string[];
} | null {
  if (!signalValue || typeof signalValue !== 'object') return null;
  const obj = signalValue as Record<string, unknown>;
  const languageSignals = Array.isArray(obj.language_signals)
    ? obj.language_signals.filter((v): v is string => typeof v === 'string')
    : [];
  const signatureDishes = Array.isArray(obj.signature_dishes)
    ? obj.signature_dishes.filter((v): v is string => typeof v === 'string')
    : [];
  const placePersonality =
    typeof obj.place_personality === 'string' ? obj.place_personality : null;
  return {
    place_personality: placePersonality,
    language_signals: languageSignals,
    signature_dishes: signatureDishes,
  };
}

async function main() {
  const args = parseArgs();
  const dryRun = !args.apply;

  console.log('\n🔥 Warm SceneSense Cache');
  console.log('==========================================');
  if (dryRun) console.log('🔸 DRY RUN — no cache writes (use --apply)');
  console.log(`🔸 Limit: ${args.limit}`);
  console.log(`🔸 LA-only: ${args.laOnly}`);
  if (args.slug) console.log(`🔸 Slug: ${args.slug}`);
  if (args.verbose) console.log('🔸 Verbose mode enabled');
  console.log('');

  const materialized: Array<Awaited<ReturnType<typeof fetchPlaceForPRLBatch>>[number]> = args.slug
    ? await (async () => {
        const one = await fetchPlaceForPRLBySlug(args.slug!);
        if (!one) return [];
        return [{ ...one, slug: args.slug! }];
      })()
    : await fetchPlaceForPRLBatch({ limit: args.limit, laOnly: args.laOnly });

  if (materialized.length === 0) {
    console.log('No places matched.');
    return;
  }

  const slugList = materialized.map((p) => p.slug);
  const entities = await db.entities.findMany({
    where: { slug: { in: slugList } },
    select: {
      id: true,
      slug: true,
      category: true,
      category_rel: { select: { slug: true } },
      neighborhood: true,
      derived_signals: {
        where: { signalKey: 'identity_signals' },
        select: { signalValue: true },
        orderBy: { computedAt: 'desc' },
        take: 1,
      },
    },
  });

  const entityBySlug = new Map(entities.map((e) => [e.slug, e]));
  const entityIds = entities.map((e) => e.id);
  const coverageRows = entityIds.length > 0
    ? await db.coverage_source_extractions.findMany({
        where: {
          // SceneSense coverage input must only use current extractions so warmer and route stay parity-safe.
          isCurrent: true,
          coverageSource: {
            entityId: { in: entityIds },
          },
        },
        select: {
          isCurrent: true,
          atmosphereSignals: true,
          coverageSource: {
            select: {
              entityId: true,
            },
          },
        },
      })
    : [];
  const coverageRowsByEntityId = new Map<string, CoverageAtmosphereExtractionRow[]>();
  for (const row of coverageRows) {
    const entityCoverageRows = coverageRowsByEntityId.get(row.coverageSource.entityId) ?? [];
    entityCoverageRows.push({
      isCurrent: row.isCurrent,
      atmosphereSignals: row.atmosphereSignals,
    });
    coverageRowsByEntityId.set(row.coverageSource.entityId, entityCoverageRows);
  }

  let processed = 0;
  let warmed = 0;
  let failed = 0;
  let missingEntity = 0;

  for (let i = 0; i < materialized.length; i++) {
    const p = materialized[i];
    const prefix = `[${i + 1}/${materialized.length}]`;
    processed++;

    const entity = entityBySlug.get(p.slug);
    if (!entity) {
      missingEntity++;
      if (args.verbose) {
        console.log(`${prefix} ${p.slug}: skipped (entity lookup miss)`);
      }
      continue;
    }

    try {
      const identity = parseIdentity(entity.derived_signals[0]?.signalValue ?? null);
      const coverageAtmosphere = buildCoverageAtmosphereInput(
        coverageRowsByEntityId.get(entity.id),
      );
      const result = assembleSceneSenseFromMaterialized({
        placeForPRL: p,
        neighborhood: entity.neighborhood,
        category: entity.category ?? entity.category_rel?.slug ?? null,
        identitySignals: identity,
        coverageAtmosphere,
      });

      if (!dryRun) {
        await writeInterpretationCache(db, {
          entityId: entity.id,
          outputType: 'SCENESENSE_PRL',
          content: {
            prl: result.prl,
            mode: result.mode,
            scenesense: result.scenesense,
          },
          promptVersion: PROMPT_VERSION,
          dryRun: false,
        });
      }

      warmed++;
      if (args.verbose) {
        const action = dryRun ? 'would warm' : 'warmed';
        console.log(`${prefix} ${p.slug}: ${action} (prl=${result.prl}, mode=${result.mode})`);
      }
    } catch (err) {
      failed++;
      console.error(
        `${prefix} ${p.slug}: failed —`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.log('\n==========================================');
  console.log('SceneSense Warm Summary');
  console.log('==========================================');
  console.log(`Processed:            ${processed}`);
  console.log(`Warmed:               ${warmed}`);
  console.log(`Missing entity rows:  ${missingEntity}`);
  console.log(`Failed:               ${failed}`);
  if (dryRun) console.log('Mode:                 DRY RUN');
  console.log('==========================================\n');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

