/**
 * Saiko Maps — Voice Engine v2.0 Batch Generator
 * 
 * Generates taglines for golden_records with identity signals.
 * 
 * Usage:
 *   npx tsx scripts/generate-taglines-v2.ts [options]
 * 
 * Options:
 *   --dry-run       Don't write to database
 *   --limit=N       Process only N records
 *   --verbose       Show detailed generation info
 *   --place=NAME    Process single place by name
 *   --reprocess     Regenerate even if tagline exists
 *   --concurrency=N Parallel generation (default: 5)
 * 
 * Examples:
 *   npx tsx scripts/generate-taglines-v2.ts --dry-run --limit=10 --verbose
 *   npx tsx scripts/generate-taglines-v2.ts --place="Langer's"
 *   npx tsx scripts/generate-taglines-v2.ts --limit=50 --concurrency=10
 */

import { PrismaClient } from '@prisma/client';
import { writeInterpretationCache } from '../lib/fields-v2/write-claim';
import {
  fetchRecordsForTaglineGeneration,
  buildTaglineInputFromGoldenRecord,
  enrichPlaceV2,
  assessSignalQuality,
} from '../lib/voice-engine-v2';

// ============================================================================
// TYPES
// ============================================================================

interface CliArgs {
  dryRun: boolean;
  limit: number | null;
  verbose: boolean;
  placeName: string | null;
  reprocess: boolean;
  concurrency: number;
}

interface Stats {
  processed: number;
  generated: number;
  skipped: number;
  failed: number;
  byPattern: {
    food: number;
    neighborhood: number;
    energy: number;
    authority: number;
  };
  byQuality: {
    excellent: number;
    good: number;
    minimal: number;
    insufficient: number;
  };
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  
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
    concurrency: args.find(a => a.startsWith('--concurrency='))
      ? parseInt(args.find(a => a.startsWith('--concurrency='))!.split('=')[1])
      : 5,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const prisma = new PrismaClient();

async function main() {
  const args = parseArgs();
  
  console.log('\n🎙️  Saiko Voice Engine v2.0 — Tagline Generator');
  console.log('==========================================');
  if (args.dryRun) console.log('🔸 DRY RUN MODE — no database writes');
  if (args.limit) console.log(`🔸 Limit: ${args.limit} records`);
  if (args.placeName) console.log(`🔸 Single place: "${args.placeName}"`);
  if (args.reprocess) console.log('🔸 Reprocessing existing taglines');
  if (args.verbose) console.log('🔸 Verbose mode enabled');
  console.log(`🔸 Concurrency: ${args.concurrency}`);
  console.log('');

  // Fetch records
  console.log('📍 Fetching records with identity signals...');
  
  const records = await fetchRecordsForTaglineGeneration({
    county: 'Los Angeles',
    limit: args.limit ?? undefined,
    reprocess: args.reprocess,
  });
  
  // Filter by name if specified
  const filteredRecords = args.placeName
    ? records.filter(r => r.name.toLowerCase().includes(args.placeName!.toLowerCase()))
    : records;

  console.log(`📍 Found ${filteredRecords.length} places to process\n`);

  if (filteredRecords.length === 0) {
    console.log('No records to process. Exiting.');
    return;
  }

  // Stats tracking
  const stats: Stats = {
    processed: 0,
    generated: 0,
    skipped: 0,
    failed: 0,
    byPattern: {
      food: 0,
      neighborhood: 0,
      energy: 0,
      authority: 0,
    },
    byQuality: {
      excellent: 0,
      good: 0,
      minimal: 0,
      insufficient: 0,
    },
  };

  // Process in batches with concurrency limit
  for (let i = 0; i < filteredRecords.length; i += args.concurrency) {
    const batch = filteredRecords.slice(i, i + args.concurrency);
    const batchNum = Math.floor(i / args.concurrency) + 1;
    const totalBatches = Math.ceil(filteredRecords.length / args.concurrency);
    
    console.log(`\n[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} places...`);
    console.log('─'.repeat(80));
    
    const batchPromises = batch.map(async (record, batchIdx) => {
      const globalIdx = i + batchIdx;
      const prefix = `[${globalIdx + 1}/${filteredRecords.length}]`;
      
      try {
        // Build input
        const input = buildTaglineInputFromGoldenRecord(record);
        
        // Assess signal quality
        const qualityAssessment = assessSignalQuality(input.signals);
        stats.byQuality[qualityAssessment.quality]++;
        
        if (args.verbose) {
          console.log(`${prefix} ${record.name}`);
          console.log(`  Quality: ${qualityAssessment.quality} — ${qualityAssessment.reason}`);
        } else {
          console.log(`${prefix} ${record.name} (${qualityAssessment.quality})`);
        }
        
        // Skip if insufficient
        if (qualityAssessment.quality === 'insufficient') {
          if (args.verbose) {
            console.log(`  ⚠️  Skipping: Insufficient signals`);
          }
          stats.skipped++;
          stats.processed++;
          return;
        }
        
        // Generate tagline
        const result = await enrichPlaceV2(input);
        
        // Log result
        if (args.verbose) {
          console.log(`  🏷️  [${result.taglinePattern}] "${result.tagline}"`);
          console.log(`  📝 Candidates:`);
          result.taglineCandidates.forEach((c, idx) => {
            const marker = c === result.tagline ? '✅' : '  ';
            console.log(`     ${marker} "${c}"`);
          });
        }
        
        // Update stats
        stats.generated++;
        stats.byPattern[result.taglinePattern as keyof Stats['byPattern']]++;
        
        // Write to database
        if (!args.dryRun) {
          // Fields v2: write to interpretation_cache.
          // canonical_id is the entity_id in both the legacy shim and the new derived_signals path.
          const interpretationEntityId: string | null = record.canonical_id
            ?? (record.google_place_id
              ? await prisma.canonical_entity_state.findFirst({
                  where: { google_place_id: record.google_place_id },
                  select: { entity_id: true },
                }).then(r => r?.entity_id ?? null).catch(() => null)
              : null);

          if (interpretationEntityId) {
            await writeInterpretationCache(prisma, {
              entityId: interpretationEntityId,
              outputType: 'TAGLINE',
              content: {
                text: result.tagline,
                candidates: result.taglineCandidates,
                pattern: result.taglinePattern,
              },
              promptVersion: `voice-v2-${result.taglinePattern}`,
              inputSignalIds: [],
            }).catch((err) => {
              console.warn(`  [Fields v2] interpretation_cache write failed:`, err);
            });
          }
          
          if (args.verbose) {
            console.log(`  💾 Saved to database (legacy + Fields v2)`);
          }
        }
        
        stats.processed++;
        
      } catch (error) {
        console.error(`${prefix} ❌ Error:`, error);
        stats.failed++;
        stats.processed++;
      }
    });
    
    // Wait for batch to complete
    await Promise.all(batchPromises);
    
    // Small delay between batches
    if (i + args.concurrency < filteredRecords.length) {
      await sleep(500);
    }
  }

  // Print summary
  console.log('\n==========================================');
  console.log('📊 GENERATION SUMMARY');
  console.log('==========================================');
  console.log(`Total processed:  ${stats.processed}`);
  console.log(`Generated:        ${stats.generated}`);
  console.log(`Skipped:          ${stats.skipped}`);
  console.log(`Failed:           ${stats.failed}`);
  console.log('');
  console.log('By Pattern:');
  console.log(`  Food Forward:       ${stats.byPattern.food}`);
  console.log(`  Neighborhood Anchor: ${stats.byPattern.neighborhood}`);
  console.log(`  Energy Check:       ${stats.byPattern.energy}`);
  console.log(`  Local Authority:    ${stats.byPattern.authority}`);
  console.log('');
  console.log('By Signal Quality:');
  console.log(`  Excellent: ${stats.byQuality.excellent}`);
  console.log(`  Good:      ${stats.byQuality.good}`);
  console.log(`  Minimal:   ${stats.byQuality.minimal}`);
  console.log(`  Insufficient: ${stats.byQuality.insufficient}`);
  console.log('==========================================\n');

  if (args.dryRun) {
    console.log('🔸 DRY RUN — no changes written to database');
  } else if (stats.generated > 0) {
    console.log(`\n✅ Successfully saved ${stats.generated} taglines to database`);
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
