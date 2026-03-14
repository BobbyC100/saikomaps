import { PrismaClient, Prisma } from '@prisma/client';
const db = new PrismaClient();

interface CountResult { count: number }
async function rawCount(sql: Prisma.Sql): Promise<number> {
  const rows = await db.$queryRaw<CountResult[]>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const totalEntities = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities`);
  const identitySignals = await rawCount(Prisma.sql`SELECT COUNT(DISTINCT entity_id)::int as count FROM derived_signals WHERE signal_key = 'identity_signals'`);
  const taglines = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM interpretation_cache WHERE output_type = 'TAGLINE' AND is_current = true`);
  const energyScores = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM energy_scores`);
  const tagScores = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM place_tag_scores`);
  const flagged = await rawCount(Prisma.sql`SELECT COUNT(*)::int as count FROM entities WHERE needs_human_review = true`);

  const withAnySignal = await rawCount(Prisma.sql`
    SELECT COUNT(DISTINCT e.id)::int as count
    FROM entities e
    WHERE EXISTS (SELECT 1 FROM derived_signals ds WHERE ds.entity_id = e.id)
       OR EXISTS (SELECT 1 FROM interpretation_cache ic WHERE ic.entity_id = e.id)
       OR EXISTS (SELECT 1 FROM energy_scores es WHERE es.entity_id = e.id)
       OR EXISTS (SELECT 1 FROM place_tag_scores pts WHERE pts.entity_id = e.id)
  `);
  const noSignals = totalEntities - withAnySignal;

  console.log(`
POST-ENRICHMENT COVERAGE
========================
                          BEFORE    AFTER     DELTA
Total entities:           143       ${totalEntities}
Identity signals:         45        ${identitySignals}       +${identitySignals - 45}
Current taglines:         45        ${taglines}       +${taglines - 45}
Energy scores:            0         ${energyScores}       +${energyScores}
Tag scores:               0         ${tagScores}       +${tagScores}
Entities with NO signals: 98        ${noSignals}        ${noSignals - 98}
Flagged for review:       47        ${flagged}        ${flagged - 47}
`);
}

main().catch(console.error).finally(() => db.$disconnect());
