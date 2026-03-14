/**
 * Phase 1 — Dataset State Audit
 * Produces a snapshot of current dataset health.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const db = new PrismaClient();

interface CountResult { count: number }

async function rawCount(sql: Prisma.Sql): Promise<number> {
  const rows = await db.$queryRaw<CountResult[]>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  // 1. Total entity records
  const totalEntities = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities`);

  // 2. Core identity completeness (snake_case DB columns)
  const completeCore = await rawCount(Prisma.sql`
    SELECT COUNT(*)::int as count FROM entities
    WHERE name IS NOT NULL AND name != ''
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND category IS NOT NULL AND category != ''
  `);

  // 3. Missing core identity fields
  const missingName = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE name IS NULL OR name = ''`);
  const missingLat = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE latitude IS NULL`);
  const missingLng = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE longitude IS NULL`);
  const missingCategory = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE category IS NULL OR category = ''`);
  const missingAddress = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE address IS NULL OR address = ''`);
  const missingGpid = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE google_place_id IS NULL OR google_place_id = ''`);
  const missingWebsite = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE website IS NULL OR website = ''`);
  const missingAnyCoreField = totalEntities - completeCore;

  // 4. Records with zero interpretation signals
  const withAnySignal = await rawCount(Prisma.sql`
    SELECT COUNT(DISTINCT e.id)::int as count
    FROM entities e
    WHERE EXISTS (SELECT 1 FROM derived_signals ds WHERE ds.entity_id = e.id)
       OR EXISTS (SELECT 1 FROM interpretation_cache ic WHERE ic.entity_id = e.id)
       OR EXISTS (SELECT 1 FROM energy_scores es WHERE es.entity_id = e.id)
       OR EXISTS (SELECT 1 FROM place_tag_scores pts WHERE pts.entity_id = e.id)
  `);
  const noSignals = totalEntities - withAnySignal;

  // Signal type breakdowns
  const withDerivedSignals = await rawCount(Prisma.sql`SELECT COUNT(DISTINCT entity_id)::int as count FROM derived_signals`);
  const withInterpCache = await rawCount(Prisma.sql`SELECT COUNT(DISTINCT entity_id)::int as count FROM interpretation_cache`);
  const withEnergyScores = await rawCount(Prisma.sql`SELECT COUNT(DISTINCT entity_id)::int as count FROM energy_scores`);
  const withTagScores = await rawCount(Prisma.sql`SELECT COUNT(DISTINCT entity_id)::int as count FROM place_tag_scores`);

  // 5. Enrichment pipeline coverage
  const surfaceEntityCount = await rawCount(Prisma.sql`SELECT COUNT(DISTINCT entity_id)::int as count FROM merchant_surfaces`);
  const withIdentitySignals = await rawCount(Prisma.sql`SELECT COUNT(DISTINCT entity_id)::int as count FROM derived_signals WHERE signal_key = 'identity_signals'`);
  const withCurrentTagline = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM interpretation_cache WHERE output_type = 'TAGLINE' AND is_current = true`);
  const canonicalStateCount = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM canonical_entity_state`);
  const goldenRecordCount = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM golden_records`);

  // 6. Flagged for human review
  const reviewQueueTotal = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM review_queue WHERE status IN ('pending', 'in_progress', 'flagged')`);
  const gpidQueuePending = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM gpid_resolution_queue WHERE human_status = 'PENDING'`);
  const sanctionConflictsOpen = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM sanction_conflicts WHERE status = 'OPEN'`);

  // 7. Enrichment errors
  const fetchFailed = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM merchant_surfaces WHERE fetch_status = 'fetch_failed'`);
  const parseFailed = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM merchant_surfaces WHERE parse_status = 'parse_failed'`);

  // Entities needing human review (flag column)
  const needsHumanReview = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE needs_human_review = true`);

  // Entity statuses
  const statusBreakdown: { status: string; count: number }[] = await db.$queryRaw`
    SELECT status, COUNT(*)::int as count FROM entities GROUP BY status ORDER BY count DESC
  `;
  const businessStatusBreakdown: { business_status: string | null; count: number }[] = await db.$queryRaw`
    SELECT business_status, COUNT(*)::int as count FROM entities
    WHERE business_status IS NOT NULL AND business_status != 'OPERATIONAL'
    GROUP BY business_status ORDER BY count DESC
  `;

  // Enrichment run stats
  const enrichedCount = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE last_enriched_at IS NOT NULL`);

  // SceneSense coverage
  const sceneSenseCount = await rawCount(Prisma.sql`
    SELECT COUNT(*)::int as count FROM interpretation_cache
    WHERE output_type = 'SCENESENSE_PRL' AND is_current = true
  `);

  // Offering programs coverage
  const offeringProgramCount = await rawCount(Prisma.sql`
    SELECT COUNT(DISTINCT entity_id)::int as count FROM derived_signals
    WHERE signal_key = 'offering_programs'
  `);

  // Enrichment stage breakdown
  const stageBreakdown: { enrichment_stage: number | null; count: number }[] = await db.$queryRaw`
    SELECT enrichment_stage, COUNT(*)::int as count FROM entities
    GROUP BY enrichment_stage ORDER BY enrichment_stage NULLS FIRST
  `;

  console.log(`
PHASE 1 CHECKPOINT
══════════════════

ENTITY RECORDS
  Total entity records:              ${totalEntities}
  Golden records:                    ${goldenRecordCount}
  Canonical entity state records:    ${canonicalStateCount}

CORE IDENTITY COMPLETENESS
  Complete core identity (name+coords+category): ${completeCore}
  Missing one or more core fields:               ${missingAnyCoreField}

  Missing field breakdown:
    name:            ${missingName}
    latitude:        ${missingLat}
    longitude:       ${missingLng}
    category:        ${missingCategory}
    address:         ${missingAddress}
    google_place_id: ${missingGpid}
    website:         ${missingWebsite}

INTERPRETATION SIGNALS
  Records with ZERO interpretation signals: ${noSignals} of ${totalEntities}
  Records with derived_signals:             ${withDerivedSignals}
  Records with interpretation_cache:        ${withInterpCache}
  Records with energy_scores:               ${withEnergyScores}
  Records with place_tag_scores:            ${withTagScores}

ENRICHMENT PIPELINE COVERAGE
  Entities with merchant_surfaces:          ${surfaceEntityCount}
  Entities with identity signals (derived): ${withIdentitySignals}
  Entities with current tagline:            ${withCurrentTagline}
  Entities with SceneSense (PRL):           ${sceneSenseCount}
  Entities with offering programs:          ${offeringProgramCount}
  Entities with last_enriched_at set:       ${enrichedCount}

ENRICHMENT STAGE DISTRIBUTION:
${stageBreakdown.map(r => `  Stage ${r.enrichment_stage ?? 'null'}: ${r.count}`).join('\n')}

FLAGGED FOR REVIEW
  Review queue (pending/in_progress/flagged): ${reviewQueueTotal}
  GPID resolution queue (pending):            ${gpidQueuePending}
  Sanction conflicts (open):                  ${sanctionConflictsOpen}
  Entities with needs_human_review=true:      ${needsHumanReview}
  Total flagged for review:                   ${reviewQueueTotal + gpidQueuePending + sanctionConflictsOpen + needsHumanReview}

ENRICHMENT ERRORS
  Merchant surface fetch failures:  ${fetchFailed}
  Merchant surface parse failures:  ${parseFailed}

ENTITY STATUS BREAKDOWN:
${statusBreakdown.map(r => `  ${r.status || '(null)'}: ${r.count}`).join('\n')}

BUSINESS STATUS (non-operational):
${businessStatusBreakdown.length > 0 ? businessStatusBreakdown.map(r => `  ${r.business_status || '(null)'}: ${r.count}`).join('\n') : '  (all operational or null)'}

──────────────────
Dataset health: ${
    missingAnyCoreField > totalEntities * 0.3 || noSignals > totalEntities * 0.8
      ? 'DEGRADED'
      : noSignals > totalEntities * 0.5 || fetchFailed > 20
        ? 'NEEDS ATTENTION'
        : 'HEALTHY'
  }

Top issues:
${[
    missingCategory > 10 && `  • ${missingCategory} entities missing category`,
    missingGpid > 10 && `  • ${missingGpid} entities missing Google Place ID`,
    missingWebsite > 10 && `  • ${missingWebsite} entities missing website`,
    noSignals > 10 && `  • ${noSignals} entities with zero interpretation signals`,
    fetchFailed > 0 && `  • ${fetchFailed} surface fetch failures`,
    parseFailed > 0 && `  • ${parseFailed} surface parse failures`,
    reviewQueueTotal > 0 && `  • ${reviewQueueTotal} items in review queue`,
    gpidQueuePending > 0 && `  • ${gpidQueuePending} GPID resolutions pending`,
    sanctionConflictsOpen > 0 && `  • ${sanctionConflictsOpen} open sanction conflicts`,
    needsHumanReview > 0 && `  • ${needsHumanReview} entities flagged needs_human_review`,
  ].filter(Boolean).join('\n') || '  (none)'}
`);
}

main().catch(console.error).finally(() => db.$disconnect());
