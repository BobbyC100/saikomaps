#!/usr/bin/env node
/**
 * smart-enrich.ts — Cost-optimized entity enrichment CLI
 *
 * Takes entity names and runs the cheapest enrichment path first.
 * Only escalates to paid APIs (Google Places) when there are actual gaps.
 *
 * Usage:
 *   # Single entity
 *   ./scripts/db-neon.sh npx tsx scripts/smart-enrich.ts --name="Bavel"
 *   ./scripts/db-neon.sh npx tsx scripts/smart-enrich.ts --name="Bestia" --neighborhood="Arts District"
 *
 *   # Batch from comma-separated names
 *   ./scripts/db-neon.sh npx tsx scripts/smart-enrich.ts --names="Bavel,Bestia,Republique"
 *
 *   # Batch from file (one name per line)
 *   ./scripts/db-neon.sh npx tsx scripts/smart-enrich.ts --file=data/new-places.txt
 *
 *   # Cheap only (skip Google Places, ~$0.01/entity)
 *   ./scripts/db-neon.sh npx tsx scripts/smart-enrich.ts --name="Bavel" --cheap
 *
 *   # Dry run
 *   ./scripts/db-neon.sh npx tsx scripts/smart-enrich.ts --name="Bavel" --dry-run
 *
 * Cost:
 *   --cheap mode:  ~$0.01/entity (Haiku web search + free scraping)
 *   Full mode:     ~$0.01-0.04/entity (adds Google Places only if needed)
 */

import { smartEnrich, type SmartEnrichResult } from '@/lib/smart-enrich';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : null;
}

const singleName = getArg('name');
const batchNames = getArg('names');
const inputFile = getArg('file');
const city = getArg('city') ?? 'Los Angeles';
const neighborhood = getArg('neighborhood') ?? undefined;
const category = getArg('category') ?? 'restaurant';
const cheapOnly = args.includes('--cheap');
const dryRun = args.includes('--dry-run');

// Collect names to process
const names: string[] = [];

if (singleName) {
  names.push(singleName);
} else if (batchNames) {
  names.push(...batchNames.split(',').map((n) => n.trim()).filter(Boolean));
} else if (inputFile) {
  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }
  const lines = fs.readFileSync(inputFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  names.push(...lines);
}

if (names.length === 0) {
  console.error('Usage:');
  console.error('  npx tsx scripts/smart-enrich.ts --name="Bavel"');
  console.error('  npx tsx scripts/smart-enrich.ts --names="Bavel,Bestia,Republique"');
  console.error('  npx tsx scripts/smart-enrich.ts --file=data/new-places.txt');
  console.error('');
  console.error('Options:');
  console.error('  --city=<city>               (default: Los Angeles)');
  console.error('  --neighborhood=<hood>       (optional)');
  console.error('  --category=<type>           (default: restaurant)');
  console.error('  --cheap                     Skip Google Places (~$0.01/entity)');
  console.error('  --dry-run                   No writes');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n⚡ Smart Enrich — ${names.length} entit${names.length === 1 ? 'y' : 'ies'}`);
  console.log(`   City: ${city} | Category: ${category}`);
  if (cheapOnly) console.log('   Mode: CHEAP ONLY (skip Google Places)');
  if (dryRun) console.log('   Mode: DRY RUN (no writes)');
  console.log('');

  const results: SmartEnrichResult[] = [];
  let totalCost = 0;

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    console.log(`─── [${i + 1}/${names.length}] ${name} ${'─'.repeat(Math.max(0, 50 - name.length))}`);

    try {
      const result = await smartEnrich({
        name,
        city,
        neighborhood,
        category,
        cheapOnly,
        dryRun,
      });

      results.push(result);

      // Print phase results
      for (const p of result.phases) {
        const icon = p.status === 'ran' ? '✓' : p.status === 'skipped' ? '·' : '✗';
        const dur = p.duration_ms > 0 ? ` (${(p.duration_ms / 1000).toFixed(1)}s)` : '';
        const disc = Object.entries(p.discovered)
          .filter(([, v]) => v !== null)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        console.log(`  ${icon} Phase ${p.phase}: ${p.name} [${p.cost}]${dur}${disc ? ` → ${disc}` : ''}`);
      }

      // Print remaining gaps
      if (result.gaps.length > 0) {
        console.log(`  ⚠ Gaps: ${result.gaps.join(', ')}`);
      } else {
        console.log(`  ✓ No gaps — fully enriched`);
      }

      console.log(`  Cost: ${result.totalCostEstimate}`);
      const costMatch = result.totalCostEstimate.match(/\$([0-9.]+)/);
      totalCost += costMatch ? parseFloat(costMatch[1]) : 0;
    } catch (e) {
      console.error(`  ✗ Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    console.log('');
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('Smart Enrich Summary');
  console.log('═'.repeat(60));
  const succeeded = results.filter((r) => r.entityId).length;
  const fullyEnriched = results.filter((r) => r.gaps.length === 0).length;
  console.log(`  Processed: ${names.length}`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Fully enriched: ${fullyEnriched}`);
  console.log(`  With gaps: ${succeeded - fullyEnriched}`);
  console.log(`  Total cost: $${totalCost.toFixed(2)}`);

  if (succeeded > 0) {
    const avgCost = totalCost / succeeded;
    console.log(`  Avg cost/entity: $${avgCost.toFixed(3)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
