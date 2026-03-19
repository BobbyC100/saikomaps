#!/usr/bin/env node
/**
 * smart-enrich-batch.ts — Run smart-enrich across all active entities with gaps.
 *
 * Pulls entities from the DB that are missing key fields, then runs smart-enrich
 * on each one sequentially. Respects rate limits and logs progress.
 *
 * Usage:
 *   # Full run (all entities with gaps)
 *   ./scripts/db-neon.sh npx tsx -r ./scripts/load-env.js scripts/smart-enrich-batch.ts
 *
 *   # Limit to N entities
 *   ./scripts/db-neon.sh npx tsx -r ./scripts/load-env.js scripts/smart-enrich-batch.ts --limit=10
 *
 *   # Cheap only (skip Google Places + Claude Sonnet)
 *   ./scripts/db-neon.sh npx tsx -r ./scripts/load-env.js scripts/smart-enrich-batch.ts --cheap
 *
 *   # Only entities missing specific fields
 *   ./scripts/db-neon.sh npx tsx -r ./scripts/load-env.js scripts/smart-enrich-batch.ts --gap=website
 *   ./scripts/db-neon.sh npx tsx -r ./scripts/load-env.js scripts/smart-enrich-batch.ts --gap=coords
 *   ./scripts/db-neon.sh npx tsx -r ./scripts/load-env.js scripts/smart-enrich-batch.ts --gap=phone
 *
 *   # Dry run
 *   ./scripts/db-neon.sh npx tsx -r ./scripts/load-env.js scripts/smart-enrich-batch.ts --limit=5 --dry-run
 *
 * Cost estimate: ~$0.01-0.04 per entity depending on gaps
 */

import { smartEnrich, type SmartEnrichResult } from '@/lib/smart-enrich';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : null;
}

const limitArg = getArg('limit');
const limit = limitArg ? parseInt(limitArg, 10) : undefined;
const gapFilter = getArg('gap'); // website, coords, phone, gpid, instagram, neighborhood
const cheapOnly = args.includes('--cheap');
const dryRun = args.includes('--dry-run');
const resumeAfter = getArg('resume-after'); // entity slug to resume after (for crash recovery)

// ---------------------------------------------------------------------------
// Build query for entities with gaps
// ---------------------------------------------------------------------------

async function getEntitiesWithGaps() {
  type EntityRow = {
    id: string;
    name: string;
    slug: string;
    neighborhood: string | null;
    website: string | null;
    instagram: string | null;
    google_place_id: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
  };

  // Build WHERE conditions based on gap filter
  let gapCondition = '';
  if (gapFilter === 'website') {
    gapCondition = `AND (e.website IS NULL OR e.website = '')`;
  } else if (gapFilter === 'coords') {
    gapCondition = `AND (e.latitude IS NULL OR e.longitude IS NULL)`;
  } else if (gapFilter === 'phone') {
    gapCondition = `AND (e.phone IS NULL OR e.phone = '')`;
  } else if (gapFilter === 'gpid') {
    gapCondition = `AND (e.google_place_id IS NULL OR e.google_place_id = '')`;
  } else if (gapFilter === 'instagram') {
    gapCondition = `AND (e.instagram IS NULL OR e.instagram = '' OR e.instagram = '__none__')`;
  } else if (gapFilter === 'neighborhood') {
    gapCondition = `AND (e.neighborhood IS NULL OR e.neighborhood = '')`;
  } else {
    // Default: any entity missing at least one key field
    gapCondition = `AND (
      (e.website IS NULL OR e.website = '')
      OR (e.instagram IS NULL OR e.instagram = '' OR e.instagram = '__none__')
      OR (e.google_place_id IS NULL OR e.google_place_id = '')
      OR e.latitude IS NULL
      OR e.longitude IS NULL
      OR (e.phone IS NULL OR e.phone = '')
      OR (e.neighborhood IS NULL OR e.neighborhood = '')
    )`;
  }

  const limitClause = limit ? `LIMIT ${limit}` : '';

  const entities = await db.$queryRawUnsafe<EntityRow[]>(`
    SELECT
      e.id, e.name, e.slug, e.neighborhood,
      e.website, e.instagram, e.google_place_id,
      e.latitude::float AS latitude, e.longitude::float AS longitude,
      e.phone
    FROM entities e
    WHERE e.status NOT IN ('PERMANENTLY_CLOSED', 'CANDIDATE')
    ${gapCondition}
    ORDER BY e.name ASC
    ${limitClause}
  `);

  return entities;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  const entities = await getEntitiesWithGaps();

  // If resuming, skip entities before the resume point
  let startIndex = 0;
  if (resumeAfter) {
    const resumeIdx = entities.findIndex((e) => e.slug === resumeAfter);
    if (resumeIdx >= 0) {
      startIndex = resumeIdx + 1;
      console.log(`\n⏩ Resuming after: ${resumeAfter} (skipping ${startIndex} entities)`);
    } else {
      console.log(`\n⚠ Resume slug not found: ${resumeAfter}, starting from beginning`);
    }
  }

  const remaining = entities.slice(startIndex);

  console.log(`\n⚡ Smart Enrich Batch`);
  console.log(`   Entities with gaps: ${entities.length}`);
  console.log(`   Processing: ${remaining.length}${limit ? ` (limit: ${limit})` : ''}`);
  if (gapFilter) console.log(`   Gap filter: ${gapFilter}`);
  if (cheapOnly) console.log(`   Mode: CHEAP ONLY`);
  if (dryRun) console.log(`   Mode: DRY RUN`);
  console.log('');

  const results: SmartEnrichResult[] = [];
  let totalCost = 0;
  let succeeded = 0;
  let failed = 0;
  let fullyEnriched = 0;

  for (let i = 0; i < remaining.length; i++) {
    const entity = remaining[i];
    const progress = `[${i + 1}/${remaining.length}]`;
    console.log(`─── ${progress} ${entity.name} (${entity.slug}) ${'─'.repeat(Math.max(0, 40 - entity.name.length))}`);

    try {
      const result = await smartEnrich({
        name: entity.name,
        entityId: entity.id,
        neighborhood: entity.neighborhood ?? undefined,
        cheapOnly,
        dryRun,
      });

      results.push(result);
      succeeded++;

      // Print phase results (compact)
      for (const p of result.phases) {
        if (p.status === 'skipped') continue; // only show phases that ran
        const dur = p.duration_ms > 0 ? ` (${(p.duration_ms / 1000).toFixed(1)}s)` : '';
        const disc = Object.entries(p.discovered)
          .filter(([, v]) => v !== null && v !== '0')
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        console.log(`  ✓ P${p.phase}: ${p.name} [${p.cost}]${dur}${disc ? ` → ${disc}` : ''}`);
      }

      if (result.gaps.length > 0) {
        console.log(`  ⚠ Gaps: ${result.gaps.join(', ')}`);
      } else {
        console.log(`  ✓ Fully enriched`);
        fullyEnriched++;
      }

      const costMatch = result.totalCostEstimate.match(/\$([0-9.]+)/);
      const entityCost = costMatch ? parseFloat(costMatch[1]) : 0;
      totalCost += entityCost;
      console.log(`  💰 ${result.totalCostEstimate}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    console.log('');

    // Small delay between entities to be nice to APIs
    if (i < remaining.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('Smart Enrich Batch — Summary');
  console.log('═'.repeat(60));
  console.log(`  Total processed:  ${succeeded + failed}`);
  console.log(`  Succeeded:        ${succeeded}`);
  console.log(`  Fully enriched:   ${fullyEnriched}`);
  console.log(`  With gaps:        ${succeeded - fullyEnriched}`);
  console.log(`  Failed:           ${failed}`);
  console.log(`  Total cost:       $${totalCost.toFixed(2)}`);
  if (succeeded > 0) {
    console.log(`  Avg cost/entity:  $${(totalCost / succeeded).toFixed(3)}`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
