/**
 * Enrichment Depth Audit
 *
 * Measures every active entity against the six-tier coverage model
 * (ARCH-COVERAGE-TIERS-V1), broken down by vertical and entity type.
 *
 * For each entity, evaluates:
 *   Tier 1 — Identity & Location (name, coords, address, neighborhood, GPID, etc.)
 *   Tier 2 — Visit Decision Facts (hours, price level, business status, reservation, menu)
 *   Tier 3 — Surface Evidence (merchant surfaces captured, social profiles fetched)
 *   Tier 4 — Offering Signals (derived signals, cuisine, program signals)
 *   Tier 5 — Editorial Coverage (coverage sources, pull quotes, description)
 *   Tier 6 — Experiential Interpretation (energy scores, tag scores, PRL, SceneSense)
 *
 * Key feature: distinguishes between "empty" (never checked) and "checked" (evidence
 * tables have records — even if the result was null). This implements the confirmed-
 * absence principle from ARCH-ENRICHMENT-EVIDENCE-MODEL-V1.
 *
 * Output modes:
 *   --summary     Summary stats only (to stderr)
 *   --csv         Full per-entity CSV (default, to stdout)
 *   --vertical X  Filter to a specific vertical (EAT, PARKS, SHOP, etc.)
 *   --limit N     First N entities
 *   --low-depth   Only show entities below 50% overall depth
 *
 * Usage:
 *   npx tsx scripts/audit-enrichment-depth.ts --summary
 *   npx tsx scripts/audit-enrichment-depth.ts > enrichment-depth.csv
 *   npx tsx scripts/audit-enrichment-depth.ts --vertical EAT --low-depth > eat-gaps.csv
 *
 * Phase 1B+ of the enrichment evidence model.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TierScore {
  filled: number;
  expected: number;
  pct: number;
  details: Record<string, boolean>; // field name → present?
}

interface EntityDepth {
  id: string;
  slug: string;
  name: string;
  vertical: string;
  entityType: string;
  status: string;
  tier1: TierScore;
  tier2: TierScore;
  tier3: TierScore;
  tier4: TierScore;
  tier5: TierScore;
  tier6: TierScore;
  overall: number;        // weighted composite
  enrichmentChecked: boolean;  // has ANY enrichment run been attempted?
  lastEnrichedAt: Date | null;
  surfaceCount: number;
  claimCount: number;
  coverageSourceCount: number;
}

// ---------------------------------------------------------------------------
// Vertical-aware field expectations (from ARCH-COVERAGE-TIERS-V1)
// ---------------------------------------------------------------------------

type Vertical = string;

interface FieldExpectation {
  field: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  requiredFor: Vertical[];   // verticals where this is required/expected
  optionalFor: Vertical[];   // verticals where this is nice-to-have
  notApplicable: Vertical[]; // verticals where this doesn't apply
}

// We use 'ALL' as a shorthand for all verticals
const ALL = ['EAT', 'DRINKS', 'CULTURE', 'SHOP', 'ACTIVITY', 'NATURE', 'PARKS', 'STAY', 'WELLNESS', 'NIGHTLIFE', 'COMMUNITY', 'SPORT', 'OTHER'];

const FIELD_EXPECTATIONS: FieldExpectation[] = [
  // Tier 1 — Identity & Location
  { field: 'name',         tier: 1, requiredFor: ALL, optionalFor: [], notApplicable: [] },
  { field: 'latitude',     tier: 1, requiredFor: ALL, optionalFor: [], notApplicable: [] },
  { field: 'longitude',    tier: 1, requiredFor: ALL, optionalFor: [], notApplicable: [] },
  { field: 'address',      tier: 1, requiredFor: ['EAT', 'DRINKS', 'SHOP', 'CULTURE', 'STAY'], optionalFor: ['ACTIVITY', 'WELLNESS', 'NIGHTLIFE'], notApplicable: ['PARKS', 'NATURE'] },
  { field: 'neighborhood', tier: 1, requiredFor: ALL, optionalFor: [], notApplicable: [] },
  { field: 'category',     tier: 1, requiredFor: ALL, optionalFor: [], notApplicable: [] },
  { field: 'cuisineType',  tier: 1, requiredFor: ['EAT', 'DRINKS'], optionalFor: [], notApplicable: ['PARKS', 'NATURE', 'CULTURE', 'SHOP', 'ACTIVITY'] },
  { field: 'googlePlaceId', tier: 1, requiredFor: [], optionalFor: ALL, notApplicable: [] }, // never required, always counted
  { field: 'phone',        tier: 1, requiredFor: ['STAY'], optionalFor: ['EAT', 'DRINKS', 'SHOP', 'CULTURE'], notApplicable: ['PARKS', 'NATURE', 'ACTIVITY'] },
  { field: 'website',      tier: 1, requiredFor: ['STAY'], optionalFor: ['EAT', 'DRINKS', 'SHOP', 'CULTURE'], notApplicable: ['NATURE'] },
  { field: 'instagram',    tier: 1, requiredFor: [], optionalFor: ALL, notApplicable: [] },
  { field: 'tiktok',       tier: 1, requiredFor: [], optionalFor: ALL, notApplicable: [] },

  // Tier 2 — Visit Decision Facts
  { field: 'hours',          tier: 2, requiredFor: ['EAT', 'DRINKS', 'SHOP', 'CULTURE', 'STAY'], optionalFor: ['ACTIVITY', 'WELLNESS'], notApplicable: ['PARKS', 'NATURE'] },
  { field: 'priceLevel',     tier: 2, requiredFor: ['EAT', 'DRINKS'], optionalFor: ['SHOP', 'STAY'], notApplicable: ['PARKS', 'NATURE', 'ACTIVITY'] },
  { field: 'businessStatus', tier: 2, requiredFor: ALL, optionalFor: [], notApplicable: [] },
  { field: 'reservationUrl', tier: 2, requiredFor: [], optionalFor: ['EAT', 'DRINKS', 'STAY'], notApplicable: ['PARKS', 'NATURE', 'SHOP', 'ACTIVITY'] },

  // Tier 3 — Surface Evidence (checked via evidence tables, not entity fields)
  // These are counted from merchant_surfaces, merchant_surface_scans, etc.
  // Represented as synthetic fields here for scoring
  { field: '_hasSurfaces',        tier: 3, requiredFor: ['EAT', 'DRINKS', 'SHOP', 'CULTURE', 'STAY'], optionalFor: ['ACTIVITY', 'WELLNESS'], notApplicable: ['PARKS', 'NATURE'] },
  { field: '_hasHomepageSurface', tier: 3, requiredFor: ['EAT', 'DRINKS', 'SHOP'], optionalFor: ['CULTURE', 'STAY'], notApplicable: ['PARKS', 'NATURE'] },
  { field: '_hasMenuSurface',     tier: 3, requiredFor: ['EAT', 'DRINKS'], optionalFor: [], notApplicable: ['PARKS', 'NATURE', 'SHOP', 'ACTIVITY'] },
  { field: '_hasInstagramSurface', tier: 3, requiredFor: [], optionalFor: ['EAT', 'DRINKS', 'SHOP', 'CULTURE'], notApplicable: [] },

  // Tier 4 — Offering Signals
  { field: '_hasDerivedSignals',  tier: 4, requiredFor: ['EAT', 'DRINKS'], optionalFor: ['SHOP', 'CULTURE'], notApplicable: ['PARKS', 'NATURE', 'ACTIVITY'] },
  { field: '_hasMerchantSignals', tier: 4, requiredFor: ['EAT', 'DRINKS'], optionalFor: ['SHOP'], notApplicable: ['PARKS', 'NATURE'] },

  // Tier 5 — Editorial Coverage
  { field: 'description',       tier: 5, requiredFor: ['EAT', 'DRINKS'], optionalFor: ALL, notApplicable: [] },
  { field: 'pullQuote',         tier: 5, requiredFor: [], optionalFor: ['EAT', 'DRINKS', 'CULTURE'], notApplicable: ['PARKS', 'NATURE'] },
  { field: '_hasCoverageSources', tier: 5, requiredFor: [], optionalFor: ['EAT', 'DRINKS', 'CULTURE'], notApplicable: [] },

  // Tier 6 — Experiential Interpretation
  { field: 'tagline',           tier: 6, requiredFor: [], optionalFor: ['EAT', 'DRINKS', 'CULTURE', 'SHOP'], notApplicable: ['PARKS', 'NATURE'] },
  { field: '_hasEnergyScores',  tier: 6, requiredFor: [], optionalFor: ['EAT', 'DRINKS'], notApplicable: ['PARKS', 'NATURE'] },
  { field: '_hasTagScores',     tier: 6, requiredFor: [], optionalFor: ['EAT', 'DRINKS'], notApplicable: ['PARKS', 'NATURE'] },
  { field: '_hasInterpretation', tier: 6, requiredFor: [], optionalFor: ['EAT', 'DRINKS'], notApplicable: [] },
];

function isExpected(fe: FieldExpectation, vertical: string): boolean {
  return fe.requiredFor.includes(vertical) || fe.optionalFor.includes(vertical);
}

// ---------------------------------------------------------------------------
// Evidence data loader
// ---------------------------------------------------------------------------

interface EvidenceData {
  surfacesByEntity: Map<string, Set<string>>;      // entity_id → set of surface_types
  enrichmentRuns: Map<string, Date>;                // entity_id → latest run date
  claimCounts: Map<string, number>;                 // entity_id → count of observed_claims
  coverageCounts: Map<string, number>;              // entity_id → count of coverage_sources
  derivedSignalEntities: Set<string>;               // entities with derived_signals
  merchantSignalEntities: Set<string>;              // entities with merchant_signals
  energyScoreEntities: Set<string>;                 // entities with energy_scores
  tagScoreEntities: Set<string>;                    // entities with place_tag_scores
  interpretationEntities: Set<string>;              // entities with interpretation_cache
}

async function loadEvidenceData(): Promise<EvidenceData> {
  // Parallel queries for all evidence tables
  const [
    surfaces,
    enrichmentRuns,
    claimCounts,
    coverageCounts,
    derivedSignals,
    merchantSignals,
    energyScores,
    tagScores,
    interpretations,
  ] = await Promise.all([
    // Surfaces by entity with surface type
    prisma.merchant_surfaces.findMany({
      select: { entityId: true, surfaceType: true },
    }),
    // Latest enrichment run per entity
    prisma.merchant_enrichment_runs.findMany({
      select: { entityId: true, fetchedAt: true },
      orderBy: { fetchedAt: 'desc' },
    }),
    // Claim counts per entity
    prisma.observed_claims.groupBy({
      by: ['entityId'],
      _count: { claimId: true },
    }),
    // Coverage source counts per entity
    prisma.coverage_sources.groupBy({
      by: ['entityId'],
      _count: { id: true },
    }),
    // Entities with derived signals
    prisma.derived_signals.findMany({
      select: { entityId: true },
      distinct: ['entityId'],
    }),
    // Entities with merchant signals
    prisma.merchant_signals.findMany({
      select: { entityId: true },
      distinct: ['entityId'],
    }),
    // Entities with energy scores
    prisma.energy_scores.findMany({
      select: { entityId: true },
      distinct: ['entityId'],
    }),
    // Entities with tag scores
    prisma.place_tag_scores.findMany({
      select: { entityId: true },
      distinct: ['entityId'],
    }),
    // Entities with interpretation cache entries
    prisma.interpretation_cache.findMany({
      select: { entityId: true },
      distinct: ['entityId'],
    }),
  ]);

  // Build lookup maps
  const surfacesByEntity = new Map<string, Set<string>>();
  for (const s of surfaces) {
    if (!surfacesByEntity.has(s.entityId)) surfacesByEntity.set(s.entityId, new Set());
    surfacesByEntity.get(s.entityId)!.add(s.surfaceType);
  }

  const enrichmentRunMap = new Map<string, Date>();
  for (const r of enrichmentRuns) {
    // Only keep the latest per entity (already ordered desc)
    if (!enrichmentRunMap.has(r.entityId)) {
      enrichmentRunMap.set(r.entityId, r.fetchedAt);
    }
  }

  const claimCountMap = new Map<string, number>();
  for (const c of claimCounts) {
    claimCountMap.set(c.entityId, c._count.claimId);
  }

  const coverageCountMap = new Map<string, number>();
  for (const c of coverageCounts) {
    coverageCountMap.set(c.entityId, c._count.id);
  }

  return {
    surfacesByEntity,
    enrichmentRuns: enrichmentRunMap,
    claimCounts: claimCountMap,
    coverageCounts: coverageCountMap,
    derivedSignalEntities: new Set(derivedSignals.map(d => d.entityId)),
    merchantSignalEntities: new Set(merchantSignals.map(d => d.entityId)),
    energyScoreEntities: new Set(energyScores.map(d => d.entityId)),
    tagScoreEntities: new Set(tagScores.map(d => d.entityId)),
    interpretationEntities: new Set(interpretations.map(d => d.entityId)),
  };
}

// ---------------------------------------------------------------------------
// Scoring engine
// ---------------------------------------------------------------------------

function isNonEmpty(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return JSON.stringify(val) !== '{}' && JSON.stringify(val) !== 'null';
  return true;
}

function scoreTier(
  tier: 1 | 2 | 3 | 4 | 5 | 6,
  entity: any,
  vertical: string,
  evidence: EvidenceData,
): TierScore {
  const fields = FIELD_EXPECTATIONS.filter(f => f.tier === tier && isExpected(f, vertical));
  if (fields.length === 0) return { filled: 0, expected: 0, pct: 1.0, details: {} };

  const details: Record<string, boolean> = {};
  let filled = 0;

  for (const f of fields) {
    let present = false;

    // Synthetic fields — checked from evidence tables
    if (f.field.startsWith('_')) {
      const surfaces = evidence.surfacesByEntity.get(entity.id);
      switch (f.field) {
        case '_hasSurfaces':
          present = surfaces != null && surfaces.size > 0;
          break;
        case '_hasHomepageSurface':
          present = surfaces != null && (surfaces.has('homepage') || surfaces.has('about'));
          break;
        case '_hasMenuSurface':
          present = surfaces != null && (surfaces.has('menu') || surfaces.has('drinks'));
          break;
        case '_hasInstagramSurface':
          present = surfaces != null && surfaces.has('instagram');
          break;
        case '_hasDerivedSignals':
          present = evidence.derivedSignalEntities.has(entity.id);
          break;
        case '_hasMerchantSignals':
          present = evidence.merchantSignalEntities.has(entity.id);
          break;
        case '_hasCoverageSources':
          present = (evidence.coverageCounts.get(entity.id) ?? 0) > 0;
          break;
        case '_hasEnergyScores':
          present = evidence.energyScoreEntities.has(entity.id);
          break;
        case '_hasTagScores':
          present = evidence.tagScoreEntities.has(entity.id);
          break;
        case '_hasInterpretation':
          present = evidence.interpretationEntities.has(entity.id);
          break;
      }
    } else {
      // Direct entity fields
      present = isNonEmpty(entity[f.field]);
    }

    details[f.field] = present;
    if (present) filled++;
  }

  return {
    filled,
    expected: fields.length,
    pct: fields.length > 0 ? filled / fields.length : 1.0,
    details,
  };
}

function computeOverall(t1: TierScore, t2: TierScore, t3: TierScore, t4: TierScore, t5: TierScore, t6: TierScore): number {
  // Weighted: Tier 1 and 2 matter most, Tier 6 is nice-to-have
  const weights = [0.30, 0.25, 0.15, 0.15, 0.10, 0.05];
  const pcts = [t1.pct, t2.pct, t3.pct, t4.pct, t5.pct, t6.pct];
  let total = 0;
  let weightSum = 0;
  for (let i = 0; i < 6; i++) {
    // Only include tiers that have expected fields (don't penalize for N/A tiers)
    const tierScore = [t1, t2, t3, t4, t5, t6][i];
    if (tierScore.expected > 0) {
      total += weights[i] * pcts[i];
      weightSum += weights[i];
    }
  }
  return weightSum > 0 ? total / weightSum : 0;
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let summaryOnly = false;
  let limit = Infinity;
  let verticalFilter: string | null = null;
  let lowDepthOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--summary') summaryOnly = true;
    else if (args[i] === '--limit') limit = parseInt(args[++i] || '0', 10) || Infinity;
    else if (args[i] === '--vertical') verticalFilter = args[++i]?.toUpperCase() || null;
    else if (args[i] === '--low-depth') lowDepthOnly = true;
  }

  return { summaryOnly, limit, verticalFilter, lowDepthOnly };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { summaryOnly, limit, verticalFilter, lowDepthOnly } = parseArgs();

  const write = (s: string) => process.stderr.write(s + '\n');
  write('Loading entities...');

  // 1. Fetch all active entities
  const where: any = { status: { in: ['OPEN', 'CANDIDATE'] } };
  if (verticalFilter) where.primaryVertical = verticalFilter;

  const entities = await prisma.entities.findMany({
    where,
    orderBy: { name: 'asc' },
    ...(limit < Infinity ? { take: limit } : {}),
  });

  write(`Loaded ${entities.length} entities.`);
  write('Loading evidence data...');

  // 2. Load evidence data from all enrichment tables
  const evidence = await loadEvidenceData();

  write(`Evidence loaded: ${evidence.surfacesByEntity.size} entities with surfaces, ${evidence.enrichmentRuns.size} with enrichment runs, ${evidence.claimCounts.size} with claims.`);

  // 3. Score each entity
  const results: EntityDepth[] = [];

  for (const entity of entities) {
    const vertical = entity.primaryVertical;

    const tier1 = scoreTier(1, entity, vertical, evidence);
    const tier2 = scoreTier(2, entity, vertical, evidence);
    const tier3 = scoreTier(3, entity, vertical, evidence);
    const tier4 = scoreTier(4, entity, vertical, evidence);
    const tier5 = scoreTier(5, entity, vertical, evidence);
    const tier6 = scoreTier(6, entity, vertical, evidence);
    const overall = computeOverall(tier1, tier2, tier3, tier4, tier5, tier6);

    const depth: EntityDepth = {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      vertical,
      entityType: entity.entityType,
      status: entity.status,
      tier1,
      tier2,
      tier3,
      tier4,
      tier5,
      tier6,
      overall,
      enrichmentChecked: evidence.enrichmentRuns.has(entity.id),
      lastEnrichedAt: evidence.enrichmentRuns.get(entity.id) ?? null,
      surfaceCount: evidence.surfacesByEntity.get(entity.id)?.size ?? 0,
      claimCount: evidence.claimCounts.get(entity.id) ?? 0,
      coverageSourceCount: evidence.coverageCounts.get(entity.id) ?? 0,
    };

    if (lowDepthOnly && depth.overall >= 0.5) continue;

    results.push(depth);
  }

  // 4. Output
  if (!summaryOnly) {
    printCsv(results);
  }
  printSummary(results, write);

  await prisma.$disconnect();
}

// ---------------------------------------------------------------------------
// CSV Output
// ---------------------------------------------------------------------------

function printCsv(results: EntityDepth[]) {
  // Header
  console.log([
    'entity_id', 'slug', 'name', 'vertical', 'entity_type', 'status',
    'tier1_pct', 'tier2_pct', 'tier3_pct', 'tier4_pct', 'tier5_pct', 'tier6_pct',
    'overall_depth',
    'enrichment_checked', 'last_enriched_at',
    'surface_count', 'claim_count', 'coverage_source_count',
    'tier1_detail', 'tier2_detail', 'tier3_detail',
  ].join(','));

  for (const r of results) {
    const row = [
      r.id,
      r.slug,
      csvEscape(r.name),
      r.vertical,
      r.entityType,
      r.status,
      pctStr(r.tier1.pct),
      pctStr(r.tier2.pct),
      pctStr(r.tier3.pct),
      pctStr(r.tier4.pct),
      pctStr(r.tier5.pct),
      pctStr(r.tier6.pct),
      pctStr(r.overall),
      r.enrichmentChecked ? 'Y' : 'N',
      r.lastEnrichedAt ? r.lastEnrichedAt.toISOString().split('T')[0] : '',
      r.surfaceCount,
      r.claimCount,
      r.coverageSourceCount,
      csvEscape(tierDetailStr(r.tier1)),
      csvEscape(tierDetailStr(r.tier2)),
      csvEscape(tierDetailStr(r.tier3)),
    ];
    console.log(row.join(','));
  }
}

function tierDetailStr(tier: TierScore): string {
  return Object.entries(tier.details)
    .map(([k, v]) => `${k.replace(/^_/, '')}=${v ? 'Y' : 'N'}`)
    .join('; ');
}

function pctStr(n: number): string {
  return (n * 100).toFixed(1);
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Summary Output
// ---------------------------------------------------------------------------

function printSummary(results: EntityDepth[], write: (s: string) => void) {
  write(`\n${'='.repeat(60)}`);
  write(`  ENRICHMENT DEPTH AUDIT`);
  write(`  ${results.length} entities audited`);
  write(`${'='.repeat(60)}`);

  // Overall depth distribution
  const depthBuckets = { deep: 0, moderate: 0, shallow: 0, empty: 0 };
  for (const r of results) {
    if (r.overall >= 0.75) depthBuckets.deep++;
    else if (r.overall >= 0.50) depthBuckets.moderate++;
    else if (r.overall >= 0.25) depthBuckets.shallow++;
    else depthBuckets.empty++;
  }

  write('\nOverall Depth Distribution:');
  write(`  Deep    (≥75%)   ${pad(depthBuckets.deep)}  (${pct(depthBuckets.deep, results.length)})`);
  write(`  Moderate(50-74%) ${pad(depthBuckets.moderate)}  (${pct(depthBuckets.moderate, results.length)})`);
  write(`  Shallow (25-49%) ${pad(depthBuckets.shallow)}  (${pct(depthBuckets.shallow, results.length)})`);
  write(`  Empty   (<25%)   ${pad(depthBuckets.empty)}  (${pct(depthBuckets.empty, results.length)})`);

  // Enrichment pipeline coverage
  const enriched = results.filter(r => r.enrichmentChecked).length;
  const withSurfaces = results.filter(r => r.surfaceCount > 0).length;
  const withClaims = results.filter(r => r.claimCount > 0).length;
  const withCoverage = results.filter(r => r.coverageSourceCount > 0).length;

  write('\nEnrichment Pipeline Coverage:');
  write(`  Enrichment run attempted  ${pad(enriched)}  (${pct(enriched, results.length)})`);
  write(`  Has merchant surfaces     ${pad(withSurfaces)}  (${pct(withSurfaces, results.length)})`);
  write(`  Has observed claims       ${pad(withClaims)}  (${pct(withClaims, results.length)})`);
  write(`  Has editorial coverage    ${pad(withCoverage)}  (${pct(withCoverage, results.length)})`);

  // Per-tier average by vertical
  const verticals = [...new Set(results.map(r => r.vertical))].sort();

  write('\nAverage Tier Completion by Vertical:');
  write(`  ${'Vertical'.padEnd(12)} ${'T1'.padStart(6)} ${'T2'.padStart(6)} ${'T3'.padStart(6)} ${'T4'.padStart(6)} ${'T5'.padStart(6)} ${'T6'.padStart(6)} ${'Overall'.padStart(8)}  Count`);
  write(`  ${'─'.repeat(12)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(8)}  ${'─'.repeat(5)}`);

  for (const v of verticals) {
    const vResults = results.filter(r => r.vertical === v);
    const avg = (fn: (r: EntityDepth) => number) => vResults.reduce((s, r) => s + fn(r), 0) / vResults.length;

    write(`  ${v.padEnd(12)} ${pctStr(avg(r => r.tier1.pct)).padStart(5)}% ${pctStr(avg(r => r.tier2.pct)).padStart(5)}% ${pctStr(avg(r => r.tier3.pct)).padStart(5)}% ${pctStr(avg(r => r.tier4.pct)).padStart(5)}% ${pctStr(avg(r => r.tier5.pct)).padStart(5)}% ${pctStr(avg(r => r.tier6.pct)).padStart(5)}% ${pctStr(avg(r => r.overall)).padStart(7)}%  ${pad(vResults.length)}`);
  }

  // Biggest gaps: most common missing fields across the corpus
  write('\nMost Common Missing Fields (across all entities):');
  const fieldMissCounts: Record<string, number> = {};
  const fieldTotalCounts: Record<string, number> = {};

  for (const r of results) {
    for (const tier of [r.tier1, r.tier2, r.tier3, r.tier4, r.tier5, r.tier6]) {
      for (const [field, present] of Object.entries(tier.details)) {
        fieldTotalCounts[field] = (fieldTotalCounts[field] ?? 0) + 1;
        if (!present) fieldMissCounts[field] = (fieldMissCounts[field] ?? 0) + 1;
      }
    }
  }

  const sortedMissing = Object.entries(fieldMissCounts)
    .map(([field, count]) => ({ field, count, total: fieldTotalCounts[field] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  for (const { field, count, total } of sortedMissing) {
    const cleanField = field.replace(/^_/, '');
    write(`  ${cleanField.padEnd(28)} ${pad(count)} / ${pad(total)} missing  (${pct(count, total)})`);
  }

  // Never-enriched entities (no enrichment run AND no surfaces AND no claims)
  const neverTouched = results.filter(r => !r.enrichmentChecked && r.surfaceCount === 0 && r.claimCount === 0);
  write(`\nNever-enriched entities (no runs, no surfaces, no claims): ${neverTouched.length} (${pct(neverTouched.length, results.length)})`);

  if (neverTouched.length > 0 && neverTouched.length <= 20) {
    for (const r of neverTouched) {
      write(`  - ${r.name} (${r.vertical}, ${r.slug})`);
    }
  } else if (neverTouched.length > 20) {
    write(`  (showing first 20)`);
    for (const r of neverTouched.slice(0, 20)) {
      write(`  - ${r.name} (${r.vertical}, ${r.slug})`);
    }
  }

  write('');
}

function pad(n: number): string {
  return n.toString().padStart(5);
}

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return ((n / total) * 100).toFixed(1) + '%';
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
