/**
 * Validate Coverage Evidence Normalizer — Phase 5 Step 1.5
 *
 * Runs materializeCoverageEvidence against a curated set of entities
 * covering different data shapes. Prints structured output for manual
 * review before wiring into downstream pipelines.
 *
 * Usage:
 *   npx tsx scripts/validate-normalizer.ts
 *   npx tsx scripts/validate-normalizer.ts --slug seco
 *   npx tsx scripts/validate-normalizer.ts --limit 20
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { db } from '../lib/db';
import { materializeCoverageEvidence, type CoverageEvidence } from '../lib/coverage/normalize-evidence';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith('--slug='))?.split('=')[1]
  ?? (args.indexOf('--slug') >= 0 ? args[args.indexOf('--slug') + 1] : null);
const limitRaw = args.find((a) => a.startsWith('--limit='))?.split('=')[1]
  ?? (args.indexOf('--limit') >= 0 ? args[args.indexOf('--limit') + 1] : undefined);
const limitArg = limitRaw ? parseInt(limitRaw, 10) : 20;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(80));
  console.log('COVERAGE EVIDENCE NORMALIZER — VALIDATION RUN');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  console.log();

  let entityIds: { id: string; slug: string; name: string; sourceCount: number }[];

  if (slugArg) {
    // Single entity mode
    const entity = await db.entities.findFirst({
      where: { slug: slugArg },
      select: { id: true, slug: true, name: true },
    });
    if (!entity) {
      console.error(`Entity not found: ${slugArg}`);
      process.exit(1);
    }
    const count = await db.coverage_source_extractions.count({
      where: { entityId: entity.id, isCurrent: true },
    });
    entityIds = [{ ...entity, sourceCount: count }];
  } else {
    // Auto-discover: find entities across different coverage shapes
    entityIds = await discoverValidationSet(limitArg);
  }

  console.log(`Validating ${entityIds.length} entities\n`);

  let passCount = 0;
  let nullCount = 0;
  const issues: string[] = [];

  for (const entity of entityIds) {
    console.log('-'.repeat(80));
    console.log(`ENTITY: ${entity.name} (${entity.slug})`);
    console.log(`  ID: ${entity.id}`);
    console.log(`  Extraction count: ${entity.sourceCount}`);
    console.log();

    try {
      const evidence = await materializeCoverageEvidence(entity.id);

      if (!evidence) {
        console.log('  RESULT: null (no qualifying extractions)\n');
        nullCount++;
        continue;
      }

      // Print structured summary
      printEvidenceSummary(evidence, entity);

      // Run validation checks
      const entityIssues = validateEvidence(evidence, entity);
      if (entityIssues.length > 0) {
        console.log('  ⚠ ISSUES:');
        for (const issue of entityIssues) {
          console.log(`    - ${issue}`);
          issues.push(`${entity.slug}: ${issue}`);
        }
      } else {
        console.log('  ✓ All checks passed');
        passCount++;
      }
      console.log();

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ERROR: ${msg}\n`);
      issues.push(`${entity.slug}: ERROR — ${msg}`);
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('VALIDATION SUMMARY');
  console.log(`  Total entities: ${entityIds.length}`);
  console.log(`  Passed: ${passCount}`);
  console.log(`  Null (no data): ${nullCount}`);
  console.log(`  With issues: ${issues.length}`);
  if (issues.length > 0) {
    console.log('\n  All issues:');
    for (const issue of issues) {
      console.log(`    - ${issue}`);
    }
  }
  console.log('='.repeat(80));

  await db.$disconnect();
}

// ---------------------------------------------------------------------------
// Discover a validation set covering different data shapes
// ---------------------------------------------------------------------------

async function discoverValidationSet(limit: number) {
  // Get entities with extracted coverage, grouped by source count
  const entityCounts = await db.coverage_source_extractions.groupBy({
    by: ['entityId'],
    where: { isCurrent: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  if (entityCounts.length === 0) {
    console.log('No entities with current extractions found.');
    process.exit(0);
  }

  // Categorize
  const heavy = entityCounts.filter((e) => e._count.id >= 5);
  const moderate = entityCounts.filter((e) => e._count.id >= 2 && e._count.id < 5);
  const sparse = entityCounts.filter((e) => e._count.id === 1);

  console.log(`Coverage distribution:`);
  console.log(`  Heavy (5+): ${heavy.length} entities`);
  console.log(`  Moderate (2-4): ${moderate.length} entities`);
  console.log(`  Sparse (1): ${sparse.length} entities`);
  console.log();

  // Build a balanced sample from available buckets
  const sample: typeof entityCounts = [];
  const buckets = [heavy, moderate, sparse].filter((b) => b.length > 0);
  const maxPerBucket = buckets.length > 0 ? Math.max(3, Math.ceil(limit / buckets.length)) : 0;

  sample.push(...heavy.slice(0, maxPerBucket));
  sample.push(...moderate.slice(0, maxPerBucket));
  sample.push(...sparse.slice(0, maxPerBucket));

  // Trim to limit
  const trimmed = sample.slice(0, limit);

  console.log(`Sampled ${trimmed.length} entities (max ${maxPerBucket} per bucket)`);

  if (trimmed.length === 0) {
    console.log('No entities sampled — nothing to validate.');
    process.exit(0);
  }

  // Fetch entity details
  const entityIds = trimmed.map((e) => e.entityId);
  const entities = await db.entities.findMany({
    where: { id: { in: entityIds } },
    select: { id: true, slug: true, name: true },
  });

  console.log(`Found ${entities.length} matching entities in DB`);

  const entityMap = new Map(entities.map((e) => [e.id, e]));

  return trimmed
    .map((e) => {
      const entity = entityMap.get(e.entityId);
      if (!entity) return null;
      return { ...entity, sourceCount: e._count.id };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

// ---------------------------------------------------------------------------
// Print evidence summary
// ---------------------------------------------------------------------------

function printEvidenceSummary(ev: CoverageEvidence, entity: { slug: string }) {
  console.log(`  Sources: ${ev.sourceCount}`);
  console.log(`  Materialized: ${ev.materializedAt.toISOString()}`);

  // Facts
  console.log(`  FACTS:`);
  console.log(`    People: ${ev.facts.people.length}`);
  for (const p of ev.facts.people.slice(0, 5)) {
    console.log(`      ${p.name} — ${p.role} [${p.stalenessBand}] (${p.sourceCount} sources, via ${p.mostRecentSource})`);
  }

  console.log(`    Dishes: ${ev.facts.dishes.length}`);
  for (const d of ev.facts.dishes.slice(0, 5)) {
    console.log(`      "${d.text}" (${d.sourceCount} sources)`);
  }

  console.log(`    Accolades: ${ev.facts.accolades.length}`);
  for (const a of ev.facts.accolades.slice(0, 5)) {
    console.log(`      ${a.name}${a.year ? ` (${a.year})` : ''} — ${a.type} (${a.sourceCount} sources)`);
  }

  console.log(`    Pull Quotes: ${ev.facts.pullQuotes.length}`);
  for (const q of ev.facts.pullQuotes.slice(0, 3)) {
    console.log(`      "${q.text.slice(0, 80)}${q.text.length > 80 ? '...' : ''}" — ${q.publication}`);
  }

  if (ev.facts.originStoryFacts) {
    const osf = ev.facts.originStoryFacts;
    console.log(`    Origin Story Facts: year=${osf.foundingYear ?? 'none'}, founders=[${osf.founderNames.join(', ')}], lineage=${osf.lineage ? 'yes' : 'none'} (${osf.sourceCount} sources)`);
  } else {
    console.log(`    Origin Story Facts: none`);
  }

  if (ev.facts.originStoryInterpretation) {
    const osi = ev.facts.originStoryInterpretation;
    console.log(`    Origin Story Interp: archetype=${osi.archetype ?? 'none'}, consensus=${osi.consensus}, labels=[${osi.labels.join(', ')}] (${osi.sourceCount} sources)`);
  } else {
    console.log(`    Origin Story Interp: none`);
  }

  const ec = ev.facts.eventCapabilities;
  if (ec.privateDining.mentioned || ec.groupDining.mentioned || ec.catering.mentioned) {
    console.log(`    Events: private=${ec.privateDining.mentioned}, group=${ec.groupDining.mentioned}, catering=${ec.catering.mentioned}`);
  }

  // Interpretations
  console.log(`  INTERPRETATIONS:`);
  const food = ev.interpretations.food;
  console.log(`    Cuisine: ${food.cuisinePosture ?? 'none'} (agreement: ${food.cuisinePostureAgreement})`);
  if (food.cookingApproaches.length > 0) console.log(`    Cooking: [${food.cookingApproaches.join(', ')}]`);
  if (food.menuFormats.length > 0) console.log(`    Menu formats: [${food.menuFormats.join(', ')}]`);

  const activeSpecialties = Object.entries(food.specialtySignals)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (activeSpecialties.length > 0) console.log(`    Specialties: [${activeSpecialties.join(', ')}]`);

  const bev = ev.interpretations.beverage;
  const activeBev = Object.entries(bev)
    .filter(([, v]) => typeof v === 'object' && 'mentioned' in v && v.mentioned)
    .map(([k]) => k);
  if (activeBev.length > 0) console.log(`    Beverage: [${activeBev.join(', ')}]`);

  const svc = ev.interpretations.service;
  if (svc.serviceModel) console.log(`    Service: ${svc.serviceModel}, reservations: ${svc.reservationPosture ?? 'unknown'}`);
  if (svc.diningFormats.length > 0) console.log(`    Dining formats: [${svc.diningFormats.join(', ')}]`);

  const atm = ev.interpretations.atmosphere;
  if (atm.descriptors.length > 0) console.log(`    Atmosphere: [${atm.descriptors.join(', ')}]`);
  if (atm.energyLevel) console.log(`    Energy: ${atm.energyLevel}, Formality: ${atm.formality}`);

  console.log(`    Sentiment: ${ev.interpretations.sentiment.dominant} (${JSON.stringify(ev.interpretations.sentiment.distribution)})`);

  // Provenance
  console.log(`  PROVENANCE:`);
  console.log(`    Total: ${ev.provenance.totalSources} (T1: ${ev.provenance.tier1Sources}, T2: ${ev.provenance.tier2Sources}, T3: ${ev.provenance.tier3Sources})`);
  console.log(`    Date range: ${ev.provenance.oldestSource?.toISOString().slice(0, 10) ?? '?'} → ${ev.provenance.newestSource?.toISOString().slice(0, 10) ?? '?'}`);
  console.log(`    Median relevance: ${ev.provenance.medianRelevance}`);
}

// ---------------------------------------------------------------------------
// Validation checks
// ---------------------------------------------------------------------------

function validateEvidence(ev: CoverageEvidence, entity: { slug: string; sourceCount: number }): string[] {
  const issues: string[] = [];

  // Source count should match
  if (ev.sourceCount === 0) {
    issues.push('sourceCount is 0 but evidence was returned');
  }

  // People staleness bands should be valid
  for (const p of ev.facts.people) {
    if (!['current', 'aging', 'stale'].includes(p.stalenessBand)) {
      issues.push(`Person "${p.name}" has invalid staleness band: ${p.stalenessBand}`);
    }
    if (!p.name || !p.role) {
      issues.push(`Person entry missing name or role`);
    }
  }

  // Accolade types should be valid
  const validTypes = new Set(['list', 'award', 'star', 'nomination', 'recognition']);
  for (const a of ev.facts.accolades) {
    if (!validTypes.has(a.type)) {
      issues.push(`Accolade "${a.name}" has invalid type: ${a.type}`);
    }
  }

  // Sentiment dominant should match distribution
  const sentDist = ev.interpretations.sentiment.distribution;
  const maxSent = Object.entries(sentDist).reduce((a, b) => a[1] >= b[1] ? a : b, ['', 0]);
  if (maxSent[0] !== ev.interpretations.sentiment.dominant && maxSent[1] > 0) {
    issues.push(`Sentiment dominant "${ev.interpretations.sentiment.dominant}" doesn't match max distribution "${maxSent[0]}"`);
  }

  // Cuisine agreement should be 0-1
  if (ev.interpretations.food.cuisinePostureAgreement < 0 || ev.interpretations.food.cuisinePostureAgreement > 1) {
    issues.push(`Cuisine agreement out of range: ${ev.interpretations.food.cuisinePostureAgreement}`);
  }

  // Origin story consensus should be valid
  if (ev.facts.originStoryInterpretation) {
    const validConsensus = new Set(['unanimous', 'majority', 'conflicting']);
    if (!validConsensus.has(ev.facts.originStoryInterpretation.consensus)) {
      issues.push(`Origin story consensus invalid: ${ev.facts.originStoryInterpretation.consensus}`);
    }
  }

  // Provenance tier counts should sum to total
  const tierSum = ev.provenance.tier1Sources + ev.provenance.tier2Sources + ev.provenance.tier3Sources;
  if (tierSum !== ev.provenance.totalSources) {
    issues.push(`Provenance tier sum (${tierSum}) doesn't match total (${ev.provenance.totalSources})`);
  }

  // Trust tier should be 1, 2, or 3 for all sources
  for (const s of ev.provenance.sources) {
    if (![1, 2, 3].includes(s.trustTier)) {
      issues.push(`Source "${s.publicationName}" has invalid trust tier: ${s.trustTier}`);
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
