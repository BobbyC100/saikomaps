#!/usr/bin/env node
/**
 * Synthesize Identity Signals from Coverage Evidence
 *
 * Merges normalized coverage facts into derived_signals.identity_signals.
 * This is additive and provenance-aware: existing identity fields are preserved,
 * while coverage hints fill gaps and enrich arrays (dishes/producers/language).
 *
 * Usage:
 *   npx tsx scripts/synthesize-identity-from-coverage.ts
 *   npx tsx scripts/synthesize-identity-from-coverage.ts --apply --limit=100
 *   npx tsx scripts/synthesize-identity-from-coverage.ts --apply --entity-id=<uuid>
 *   npx tsx scripts/synthesize-identity-from-coverage.ts --apply --slug=<slug>
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  loadEnv({ path: '.env.local', override: true });
}

import { db } from '@/lib/db';
import { materializeCoverageEvidence } from '@/lib/coverage/normalize-evidence';
import { writeDerivedSignal } from '@/lib/fields-v2/write-claim';

type CoreIdentity = {
  cuisine_posture: string | null;
  service_model: string | null;
  price_tier: string | null;
  wine_program_intent: string | null;
  place_personality: string | null;
  origin_story_type: string | null;
};

type IdentitySignals = CoreIdentity & {
  signature_dishes: string[];
  key_producers: string[];
  language_signals: string[];
  input_quality?: unknown;
  extraction_confidence?: unknown;
  confidence_tier?: unknown;
  coverage_synthesis?: {
    version: string;
    source_count: number;
    merged_at: string;
    additions: {
      signature_dishes: number;
      key_producers: number;
      language_signals: number;
      origin_story_type_set: boolean;
    };
  };
};

const SIGNAL_VERSION = 'synthesize-identity-coverage-v1';
const MAX_DISHES = 5;
const MAX_PRODUCERS = 5;
const MAX_LANGUAGE = 8;
const DEFAULT_LIMIT = 100;

function parseArgs() {
  const argv = process.argv.slice(2);
  const arg = (name: string) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.split('=').slice(1).join('=') : null;
  };
  const limit = Number.parseInt(arg('limit') ?? '', 10);
  return {
    apply: argv.includes('--apply'),
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
    entityId: arg('entity-id'),
    slug: arg('slug'),
    verbose: argv.includes('--verbose'),
  };
}

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

function uniqueByLower(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

function mergeRankedStrings(existing: string[], coverage: string[], cap: number): string[] {
  return uniqueByLower([...existing, ...coverage]).slice(0, cap);
}

function mapCoverageOriginToIdentityType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;

  // Keep strict mappings to identity_signals vocabulary.
  if (normalized.includes('chef')) return 'chef-journey';
  if (normalized.includes('family')) return 'family-legacy';
  if (normalized.includes('neighborhood')) return 'neighborhood-love';
  if (normalized.includes('concept')) return 'concept-first';
  if (normalized.includes('partnership')) return 'partnership';
  return null;
}

function parseExistingIdentity(signalValue: unknown): IdentitySignals {
  const base = (signalValue && typeof signalValue === 'object')
    ? (signalValue as Record<string, unknown>)
    : {};

  return {
    cuisine_posture: typeof base.cuisine_posture === 'string' ? base.cuisine_posture : null,
    service_model: typeof base.service_model === 'string' ? base.service_model : null,
    price_tier: typeof base.price_tier === 'string' ? base.price_tier : null,
    wine_program_intent: typeof base.wine_program_intent === 'string' ? base.wine_program_intent : null,
    place_personality: typeof base.place_personality === 'string' ? base.place_personality : null,
    origin_story_type: typeof base.origin_story_type === 'string' ? base.origin_story_type : null,
    signature_dishes: toStringArray(base.signature_dishes),
    key_producers: toStringArray(base.key_producers),
    language_signals: toStringArray(base.language_signals),
    input_quality: base.input_quality,
    extraction_confidence: base.extraction_confidence,
    confidence_tier: base.confidence_tier,
  };
}

async function main() {
  const args = parseArgs();
  const dryRun = !args.apply;

  console.log('\n🧩 Synthesize Identity from Coverage');
  console.log('==========================================');
  if (dryRun) console.log('🔸 DRY RUN — no DB writes (use --apply)');
  if (args.entityId) console.log(`🔸 Entity: ${args.entityId}`);
  if (args.slug) console.log(`🔸 Slug: ${args.slug}`);
  console.log(`🔸 Limit: ${args.limit}`);
  if (args.verbose) console.log('🔸 Verbose mode enabled');
  console.log('');

  const candidates = await db.entities.findMany({
    where: {
      ...(args.entityId ? { id: args.entityId } : {}),
      ...(args.slug ? { slug: args.slug } : {}),
      coverage_sources: {
        some: {
          extractions: {
            some: { isCurrent: true },
          },
        },
      },
    },
    select: { id: true, slug: true, name: true },
    orderBy: { name: 'asc' },
    take: args.limit,
  });

  if (candidates.length === 0) {
    console.log('No matching entities with current coverage extractions.');
    return;
  }

  let processed = 0;
  let updated = 0;
  let skippedNoEvidence = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const entity = candidates[i];
    const prefix = `[${i + 1}/${candidates.length}]`;
    processed++;

    try {
      const evidence = await materializeCoverageEvidence(entity.id);
      if (!evidence) {
        skippedNoEvidence++;
        if (args.verbose) {
          console.log(`${prefix} ${entity.slug}: no materialized coverage evidence`);
        }
        continue;
      }

      const existingRow = await db.derived_signals.findFirst({
        where: { entityId: entity.id, signalKey: 'identity_signals' },
        select: { signalValue: true },
        orderBy: { computedAt: 'desc' },
      });
      const existing = parseExistingIdentity(existingRow?.signalValue);

      const coverageDishes = evidence.facts.dishes
        .map((d) => d.text.trim())
        .filter(Boolean);
      const coverageProducers = evidence.facts.producers
        .map((p) => p.text.trim())
        .filter(Boolean);
      const coverageLanguage = evidence.interpretations.atmosphere.descriptors
        .map((d) => d.trim())
        .filter(Boolean);
      const mappedOriginType = mapCoverageOriginToIdentityType(
        evidence.facts.originStoryInterpretation?.archetype ?? null
      );

      const merged: IdentitySignals = {
        cuisine_posture: existing.cuisine_posture,
        service_model: existing.service_model,
        price_tier: existing.price_tier,
        wine_program_intent: existing.wine_program_intent,
        place_personality: existing.place_personality,
        origin_story_type: existing.origin_story_type ?? mappedOriginType,
        signature_dishes: mergeRankedStrings(existing.signature_dishes, coverageDishes, MAX_DISHES),
        key_producers: mergeRankedStrings(existing.key_producers, coverageProducers, MAX_PRODUCERS),
        language_signals: mergeRankedStrings(existing.language_signals, coverageLanguage, MAX_LANGUAGE),
        input_quality: existing.input_quality,
        extraction_confidence: existing.extraction_confidence,
        confidence_tier: existing.confidence_tier,
        coverage_synthesis: {
          version: SIGNAL_VERSION,
          source_count: evidence.sourceCount,
          merged_at: new Date().toISOString(),
          additions: {
            signature_dishes: Math.max(0, mergeRankedStrings(existing.signature_dishes, coverageDishes, MAX_DISHES).length - existing.signature_dishes.length),
            key_producers: Math.max(0, mergeRankedStrings(existing.key_producers, coverageProducers, MAX_PRODUCERS).length - existing.key_producers.length),
            language_signals: Math.max(0, mergeRankedStrings(existing.language_signals, coverageLanguage, MAX_LANGUAGE).length - existing.language_signals.length),
            origin_story_type_set: !existing.origin_story_type && !!mappedOriginType,
          },
        },
      };

      const changed =
        JSON.stringify(existing.signature_dishes) !== JSON.stringify(merged.signature_dishes) ||
        JSON.stringify(existing.key_producers) !== JSON.stringify(merged.key_producers) ||
        JSON.stringify(existing.language_signals) !== JSON.stringify(merged.language_signals) ||
        existing.origin_story_type !== merged.origin_story_type;

      if (!changed) {
        if (args.verbose) {
          console.log(`${prefix} ${entity.slug}: no coverage-driven changes`);
        }
        continue;
      }

      if (!dryRun) {
        await writeDerivedSignal(db, {
          entityId: entity.id,
          signalKey: 'identity_signals',
          signalValue: merged,
          signalVersion: SIGNAL_VERSION,
        });
      }

      updated++;
      const actionWord = dryRun ? 'would update' : 'updated';
      console.log(
        `${prefix} ${entity.slug}: ${actionWord} (dishes=${merged.signature_dishes.length}, producers=${merged.key_producers.length}, language=${merged.language_signals.length}, origin=${merged.origin_story_type ?? 'null'})`
      );
    } catch (err) {
      failed++;
      console.error(
        `${prefix} ${entity.slug}: failed —`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  console.log('\n==========================================');
  console.log('Coverage Identity Synthesis Summary');
  console.log('==========================================');
  console.log(`Processed:           ${processed}`);
  console.log(`Updated:             ${updated}`);
  console.log(`Skipped (no evidence): ${skippedNoEvidence}`);
  console.log(`Failed:              ${failed}`);
  if (dryRun) {
    console.log('Mode:                DRY RUN');
  }
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

