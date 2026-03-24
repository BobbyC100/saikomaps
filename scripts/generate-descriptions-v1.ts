/**
 * Saiko Maps — Description Generation Pipeline v1
 *
 * Generates About descriptions for entities using the 3-tier hierarchy:
 *   Tier 1: Verbatim merchant copy from parsed surfaces
 *   Tier 2: Synthesized from merchant text + identity signals (AI)
 *   Tier 3: Composed from signals + coverage sources (AI)
 *
 * Usage:
 *   npx tsx scripts/generate-descriptions-v1.ts [options]
 *
 * Options:
 *   --dry-run        Don't write to database
 *   --limit=N        Process only N records
 *   --verbose        Show detailed generation info
 *   --place=NAME     Process single place by name (partial match)
 *   --reprocess      Regenerate even if description exists
 *   --tier=N         Only run specific tier (1, 2, or 3)
 *   --concurrency=N  Parallel generation (default: 3)
 *
 * Examples:
 *   npx tsx scripts/generate-descriptions-v1.ts --dry-run --limit=10 --verbose
 *   npx tsx scripts/generate-descriptions-v1.ts --place="Langer's" --verbose
 *   npx tsx scripts/generate-descriptions-v1.ts --tier=1 --limit=50
 *
 * Spec: docs/traces/about-description-spec-v1.md
 * Work order: docs/traces/WO-ABOUT-001-voice-descriptor-pipeline.md
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { PrismaClient } from '@prisma/client';
import { writeInterpretationCache } from '../lib/fields-v2/write-claim';
import { materializeCoverageEvidence, type CoverageEvidence } from '../lib/coverage/normalize-evidence';
import {
  fetchRecordsForDescriptionGeneration,
  selectTier,
  computeQuality,
  type EntityDescriptionRecord,
  type DescriptionTier,
} from '../lib/voice-engine-v2/description-extraction';
import {
  generateTier2Description,
  generateTier3Description,
} from '../lib/voice-engine-v2/description-generator';

// ============================================================================
// TYPES
// ============================================================================

interface CliArgs {
  dryRun: boolean;
  limit: number | null;
  verbose: boolean;
  placeName: string | null;
  reprocess: boolean;
  tierOnly: DescriptionTier | null;
  concurrency: number;
  maxRetries: number;
  retryBaseMs: number;
  allowCategoryOnly: boolean;
  allowNameOnly: boolean;
}

interface Stats {
  processed: number;
  generated: number;
  skipped: number;
  failed: number;
  belowGate: number;
  byTier: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  byDensity: {
    high: number;
    medium: number;
    low: number;
  };
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  const tierArg = args.find(a => a.startsWith('--tier='));
  let tierOnly: DescriptionTier | null = null;
  if (tierArg) {
    const parsed = parseInt(tierArg.split('=')[1]);
    if (parsed === 1 || parsed === 2 || parsed === 3) {
      tierOnly = parsed;
    }
  }

  return {
    dryRun: args.includes('--dry-run'),
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : null,
    verbose: args.includes('--verbose'),
    placeName: args.find(a => a.startsWith('--place='))
      ? args.find(a => a.startsWith('--place='))!.split('=')[1].replace(/"/g, '')
      : null,
    reprocess: args.includes('--reprocess'),
    tierOnly,
    concurrency: args.find(a => a.startsWith('--concurrency='))
      ? parseInt(args.find(a => a.startsWith('--concurrency='))!.split('=')[1])
      : 3,
    maxRetries: args.find(a => a.startsWith('--max-retries='))
      ? parseInt(args.find(a => a.startsWith('--max-retries='))!.split('=')[1])
      : 4,
    retryBaseMs: args.find(a => a.startsWith('--retry-base-ms='))
      ? parseInt(args.find(a => a.startsWith('--retry-base-ms='))!.split('=')[1])
      : 1500,
    allowCategoryOnly: args.includes('--allow-category-only'),
    allowNameOnly: args.includes('--allow-name-only'),
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncate(text: string, maxLen = 80): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('529') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('econnreset') ||
    lower.includes('socket hang up') ||
    lower.includes('overloaded')
  );
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  args: CliArgs,
  verbose: boolean
): Promise<T> {
  let attempt = 0;
  const maxAttempts = Math.max(1, args.maxRetries + 1);
  let lastErr: unknown = null;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableError(err);
      const shouldRetry = retryable && attempt < maxAttempts - 1;

      if (!shouldRetry) {
        throw err;
      }

      const waitMs = Math.round(args.retryBaseMs * Math.pow(2, attempt) * (1 + Math.random() * 0.2));
      if (verbose) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  ⚠ ${label} failed (attempt ${attempt + 1}/${maxAttempts}) — retrying in ${waitMs}ms`);
        console.log(`     ${truncate(msg, 140)}`);
      }
      await sleep(waitMs);
      attempt++;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(`${label} failed after retries`);
}

// ============================================================================
// PROCESSING
// ============================================================================

async function processEntity(
  db: PrismaClient,
  record: EntityDescriptionRecord,
  args: CliArgs,
  stats: Stats,
  prefix: string,
): Promise<void> {
  // Select tier
  const selection = selectTier(record);
  const categoryOnlyFallback =
    args.allowCategoryOnly &&
    selection.tier === null &&
    record.identitySignals === null &&
    !!record.category;
  const nameOnlyFallback =
    args.allowNameOnly &&
    selection.tier === null &&
    record.identitySignals === null &&
    !record.category;

  // Below minimum data gate
  if (selection.tier === null && !categoryOnlyFallback && !nameOnlyFallback) {
    if (args.verbose) {
      console.log(`${prefix} ${record.name}`);
      console.log(`  ⚪ Skip: ${selection.reason}`);
    }
    stats.belowGate++;
  if (categoryOnlyFallback) {
    if (args.verbose) {
      console.log(`${prefix} ${record.name}`);
      console.log('  Tier: 3 — compose_from_category_only_fallback');
    } else {
      console.log(`${prefix} ${record.name} (tier 3*)`);
    }
  }
  if (nameOnlyFallback) {
    if (args.verbose) {
      console.log(`${prefix} ${record.name}`);
      console.log('  Tier: 3 — compose_from_name_only_fallback');
    } else {
      console.log(`${prefix} ${record.name} (tier 3**)`);
    }
  }

    stats.skipped++;
    return;
  }

  // If --tier flag is set, skip entities that don't match
  if (args.tierOnly && selection.tier !== args.tierOnly) {
    stats.skipped++;
    return;
  }

  if (args.verbose) {
    console.log(`${prefix} ${record.name}`);
    console.log(`  Tier: ${selection.tier} — ${selection.reason}`);
  } else {
    console.log(`${prefix} ${record.name} (tier ${selection.tier})`);
  }

  // ── Tier 1: verbatim extraction ──────────────────────────────────────
  if (selection.tier === 1 && selection.tier1Result) {
    const { text, quality, surfaceType } = selection.tier1Result;

    if (args.verbose) {
      console.log(`  📝 Extracted from ${surfaceType}: "${truncate(text)}"`);
      console.log(`  📊 Quality: coverage=${quality.source_coverage_score}, density=${quality.signal_density}`);
    }

    if (!args.dryRun) {
      // Write to entities.description — only if current source is null or weaker
      const currentSource = record.descriptionSource;
      const shouldWrite = !currentSource || currentSource !== 'editorial';

      if (shouldWrite) {
        await db.entities.update({
          where: { id: record.id },
          data: {
            description: text,
            descriptionSource: 'website',
          },
        });

        // Also write to interpretation_cache for consistency with read path
        await writeInterpretationCache(db, {
          entityId: record.id,
          outputType: 'VOICE_DESCRIPTOR',
          content: {
            text,
            description_quality: quality,
          },
          promptVersion: 'verbatim-v1',
          dryRun: false,
        });

        if (args.verbose) {
          console.log(`  💾 Saved to entities.description (source=website) + interpretation_cache`);
        }
      } else {
        if (args.verbose) {
          console.log(`  ⏭️  Skip write: existing description_source='${currentSource}' is stronger`);
        }
      }
    }

    stats.generated++;
    stats.byTier.tier1++;
    stats.byDensity[quality.signal_density]++;
    return;
  }

  // ── Tier 2: synthesize from merchant copy ────────────────────────────
  if (selection.tier === 2 && selection.tier2Inputs) {
    const { textBlocks, surfaceType } = selection.tier2Inputs;
    const quality = computeQuality(2, {
      textBlockCount: textBlocks.length,
      identitySignals: record.identitySignals,
    });

    if (args.verbose) {
      console.log(`  📥 Input: ${textBlocks.length} text blocks from ${surfaceType}`);
      console.log(`  📊 Quality: coverage=${quality.source_coverage_score}, density=${quality.signal_density}`);
    }

    // Dry run: skip AI call, just report what would happen
    if (args.dryRun) {
      if (args.verbose) {
        console.log(`  🔸 Would call AI (about-synth-v2) — skipped in dry run`);
      }
      stats.generated++;
      stats.byTier.tier2++;
      stats.byDensity[quality.signal_density]++;
      return;
    }

    try {
      const result = await withRetry(
        'Tier 2 generation',
        () => generateTier2Description({
          entityName: record.name,
          textBlocks,
          identitySignals: record.identitySignals,
        }),
        args,
        args.verbose
      );

      if (args.verbose) {
        console.log(`  📝 Generated: "${truncate(result.text)}"`);
      }

      await writeInterpretationCache(db, {
        entityId: record.id,
        outputType: 'VOICE_DESCRIPTOR',
        content: {
          text: result.text,
          description_quality: quality,
        },
        promptVersion: 'about-synth-v2',
        modelVersion: result.model,
        dryRun: false,
      });

      if (args.verbose) {
        console.log(`  💾 Saved to interpretation_cache (VOICE_DESCRIPTOR, about-synth-v2)`);
      }

      stats.generated++;
      stats.byTier.tier2++;
      stats.byDensity[quality.signal_density]++;
    } catch (err) {
      console.error(`  ❌ Tier 2 generation failed:`, err);
      stats.failed++;
    }
    return;
  }

  // ── Tier 3: compose from signals ─────────────────────────────────────
  if (selection.tier === 3 || categoryOnlyFallback || nameOnlyFallback) {
    if (nameOnlyFallback) {
      const fallbackText = record.neighborhood
        ? `${record.name} is a local spot in ${record.neighborhood}, with profile details being expanded as additional source material is verified.`
        : `${record.name} is a local Los Angeles spot, with profile details being expanded as additional source material is verified.`;
      const quality = computeQuality(3, {
        identitySignals: record.identitySignals,
        hasCoverageSources: false,
      });

      if (args.verbose) {
        console.log(`  📝 Name-only fallback: "${truncate(fallbackText)}"`);
      }

      if (!args.dryRun) {
        await writeInterpretationCache(db, {
          entityId: record.id,
          outputType: 'VOICE_DESCRIPTOR',
          content: {
            text: fallbackText,
            description_quality: quality,
          },
          promptVersion: 'about-nameonly-v1',
          dryRun: false,
        });

        if (args.verbose) {
          console.log('  💾 Saved to interpretation_cache (VOICE_DESCRIPTOR, about-nameonly-v1)');
        }
      }

      stats.generated++;
      stats.byTier.tier3++;
      stats.byDensity[quality.signal_density]++;
      return;
    }

    // Materialize coverage evidence for richer grounding
    let coverageEvidence: CoverageEvidence | null = null;
    try {
      coverageEvidence = await materializeCoverageEvidence(record.id);
    } catch (err) {
      // Non-fatal: coverage is supplementary
      if (args.verbose) {
        console.log(`  ⚠ Coverage evidence failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const quality = computeQuality(3, {
      identitySignals: record.identitySignals,
      hasCoverageSources: coverageEvidence !== null && coverageEvidence.sourceCount > 0,
    });

      if (args.verbose) {
        const signalCount = record.identitySignals ? Object.keys(record.identitySignals).length : 0;
        console.log(`  📥 Input: ${signalCount} identity signals, category=${record.category}, neighborhood=${record.neighborhood}`);
      if (coverageEvidence) {
        console.log(`  📥 Coverage: ${coverageEvidence.sourceCount} sources, ${coverageEvidence.facts.people.length} people, ${coverageEvidence.facts.dishes.length} dishes, ${coverageEvidence.facts.accolades.length} accolades`);
      }
      console.log(`  📊 Quality: coverage=${quality.source_coverage_score}, density=${quality.signal_density}`);
    }

    // Dry run: skip AI call, just report what would happen
    if (args.dryRun) {
      if (args.verbose) {
        console.log(`  🔸 Would call AI (about-compose-v2) — skipped in dry run`);
      }
      stats.generated++;
      stats.byTier.tier3++;
      stats.byDensity[quality.signal_density]++;
      return;
    }

    try {
      const result = await withRetry(
        'Tier 3 generation',
        () => generateTier3Description({
          entityName: record.name,
          category: record.category,
          neighborhood: record.neighborhood,
          identitySignals: record.identitySignals,
          coverageEvidence: coverageEvidence ?? undefined,
        }),
        args,
        args.verbose
      );

      if (args.verbose) {
        console.log(`  📝 Generated: "${truncate(result.text)}"`);
      }

      await writeInterpretationCache(db, {
        entityId: record.id,
        outputType: 'VOICE_DESCRIPTOR',
        content: {
          text: result.text,
          description_quality: quality,
        },
        promptVersion: 'about-compose-v2',
        modelVersion: result.model,
        dryRun: false,
      });

      if (args.verbose) {
        console.log(`  💾 Saved to interpretation_cache (VOICE_DESCRIPTOR, about-compose-v2)`);
      }

      stats.generated++;
      stats.byTier.tier3++;
      stats.byDensity[quality.signal_density]++;
    } catch (err) {
      console.error(`  ❌ Tier 3 generation failed:`, err);
      stats.failed++;
    }
    return;
  }

  // Fallthrough: tier selected but no inputs matched (shouldn't happen)
  stats.skipped++;
}

// ============================================================================
// MAIN
// ============================================================================

const prisma = new PrismaClient();

async function main() {
  const args = parseArgs();

  console.log('\n📖  Saiko Description Pipeline v1');
  console.log('==========================================');
  if (args.dryRun) console.log('🔸 DRY RUN MODE — no database writes');
  if (args.limit) console.log(`🔸 Limit: ${args.limit} records`);
  if (args.placeName) console.log(`🔸 Single place: "${args.placeName}"`);
  if (args.reprocess) console.log('🔸 Reprocessing existing descriptions');
  if (args.tierOnly) console.log(`🔸 Tier filter: Tier ${args.tierOnly} only`);
  if (args.verbose) console.log('🔸 Verbose mode enabled');
  console.log(`🔸 Concurrency: ${args.concurrency}`);
  console.log(`🔸 Max retries: ${args.maxRetries}`);
  console.log(`🔸 Retry base ms: ${args.retryBaseMs}`);
  if (args.allowCategoryOnly) console.log('🔸 Category-only fallback: enabled');
  if (args.allowNameOnly) console.log('🔸 Name-only fallback: enabled');
  console.log('');

  // Fetch records
  console.log('📍 Fetching entities with surfaces + signals...');

  const records = await fetchRecordsForDescriptionGeneration(prisma, {
    limit: args.limit ?? undefined,
    reprocess: args.reprocess,
    placeName: args.placeName ?? undefined,
  });

  console.log(`📍 Found ${records.length} entities to evaluate\n`);

  if (records.length === 0) {
    console.log('No records to process. Exiting.');
    return;
  }

  // Stats
  const stats: Stats = {
    processed: 0,
    generated: 0,
    skipped: 0,
    failed: 0,
    belowGate: 0,
    byTier: { tier1: 0, tier2: 0, tier3: 0 },
    byDensity: { high: 0, medium: 0, low: 0 },
  };

  // Process in batches
  for (let i = 0; i < records.length; i += args.concurrency) {
    const batch = records.slice(i, i + args.concurrency);
    const batchNum = Math.floor(i / args.concurrency) + 1;
    const totalBatches = Math.ceil(records.length / args.concurrency);

    console.log(`\n[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} entities...`);
    console.log('─'.repeat(80));

    const batchPromises = batch.map(async (record, batchIdx) => {
      const globalIdx = i + batchIdx;
      const prefix = `[${globalIdx + 1}/${records.length}]`;

      try {
        await processEntity(prisma, record, args, stats, prefix);
        stats.processed++;
      } catch (error) {
        console.error(`${prefix} ❌ Unexpected error for ${record.name}:`, error);
        stats.failed++;
        stats.processed++;
      }
    });

    await Promise.all(batchPromises);

    // Small delay between batches (rate limiting for AI calls)
    if (i + args.concurrency < records.length) {
      await sleep(500);
    }
  }

  // Summary
  console.log('\n==========================================');
  console.log('📊 DESCRIPTION GENERATION SUMMARY');
  console.log('==========================================');
  console.log(`Total processed:     ${stats.processed}`);
  console.log(`Generated:           ${stats.generated}`);
  console.log(`Skipped:             ${stats.skipped}`);
  console.log(`  Below data gate:   ${stats.belowGate}`);
  console.log(`Failed:              ${stats.failed}`);
  console.log('');
  console.log('By Tier:');
  console.log(`  Tier 1 (verbatim):    ${stats.byTier.tier1}`);
  console.log(`  Tier 2 (synthesized): ${stats.byTier.tier2}`);
  console.log(`  Tier 3 (composed):    ${stats.byTier.tier3}`);
  console.log('');
  console.log('By Signal Density:');
  console.log(`  High:    ${stats.byDensity.high}`);
  console.log(`  Medium:  ${stats.byDensity.medium}`);
  console.log(`  Low:     ${stats.byDensity.low}`);
  console.log('==========================================\n');

  if (args.dryRun) {
    console.log('🔸 DRY RUN — no changes written to database');
  } else if (stats.generated > 0) {
    console.log(`\n✅ Successfully generated ${stats.generated} descriptions`);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
