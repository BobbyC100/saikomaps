/**
 * migrate-actor-relationships-to-entities.ts
 *
 * Rewires the EntityActorRelationship.entity_id FK from golden_records.canonical_id
 * to entities.id.
 *
 * Background
 * ----------
 * EntityActorRelationship was created pointing to golden_records.canonical_id.
 * FieldsMembership and TraceSignalsCache have already been rewired to entities.id
 * (migrations 20260307000000 and 20260307000001 respectively).
 *
 * This script completes the rewire for EntityActorRelationship.
 *
 * Why no data migration is needed
 * --------------------------------
 * entities.id === golden_records.canonical_id (same UUID values; established during
 * initial sync and confirmed in migration comments for 20260221000000,
 * 20260307000000, and 20260307000001). The only change is which table/column the
 * FK constraint points to.
 *
 * This script is a prerequisite for the deferred migration:
 *   prisma/migrations/20260306300000_drop_legacy_tables_fields_v2/migration.sql
 * which drops golden_records. That migration cannot be applied while any FK still
 * points to golden_records.canonical_id.
 *
 * Gate reference: docs/DEFERRED_MIGRATION_GATES.md (Gate 1, prerequisite 6)
 *
 * Usage
 * -----
 *   npx tsx -r ./scripts/load-env.js scripts/migrate-actor-relationships-to-entities.ts
 *   npx tsx -r ./scripts/load-env.js scripts/migrate-actor-relationships-to-entities.ts --apply
 *
 * Dry-run (default): audit and report only. No DB writes.
 * --apply:           execute the FK constraint rewire.
 *
 * Output
 * ------
 * Writes a CSV audit log to data/migrations/migrate_actor_relationships_<timestamp>.csv
 * Prints a summary and any orphan rows to stdout.
 *
 * Blockers that abort the script
 * --------------------------------
 * - Any EntityActorRelationship.entity_id that does NOT exist in entities.id
 *   is an orphan. Orphans are reported and the script aborts in --apply mode.
 *   Resolve orphans manually before re-running with --apply.
 */

import path from 'path';
import fs from 'fs';
import { db } from '@/lib/db';

const AUDIT_DIR = path.join(process.cwd(), 'data', 'migrations');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const AUDIT_PATH = path.join(AUDIT_DIR, `migrate_actor_relationships_${TIMESTAMP}.csv`);

const FK_CONSTRAINT_NAME = 'EntityActorRelationship_entity_id_fkey';

function parseArgs(): { apply: boolean } {
  return { apply: process.argv.includes('--apply') };
}

interface AuditRow {
  entity_actor_rel_id: string;
  entity_id: string;
  actor_id: string;
  role: string;
  in_entities: boolean;
  in_golden_records: boolean;
  status: 'ok' | 'orphan_missing_from_entities' | 'orphan_missing_from_both';
}

interface FkStatus {
  constraint_name: string;
  referenced_table: string;
}

// ---------------------------------------------------------------------------
// Step 1: Check current FK constraint target
// ---------------------------------------------------------------------------
async function checkCurrentFkTarget(): Promise<FkStatus | null> {
  const rows = await db.$queryRaw<{ conname: string; referenced_table: string }[]>`
    SELECT
      c.conname,
      r.relname AS referenced_table
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.confrelid
    WHERE c.conname = ${FK_CONSTRAINT_NAME}
  `;
  if (rows.length === 0) return null;
  return { constraint_name: rows[0].conname, referenced_table: rows[0].referenced_table };
}

// ---------------------------------------------------------------------------
// Step 2: Audit all EntityActorRelationship rows
// ---------------------------------------------------------------------------
async function auditRelationships(): Promise<{
  rows: AuditRow[];
  orphans: AuditRow[];
  totalCount: number;
  orphanCount: number;
}> {
  const [relationships, entityIds, goldenIds] = await Promise.all([
    db.entityActorRelationship.findMany({
      select: { id: true, entityId: true, actorId: true, role: true },
    }),
    db.entities.findMany({ select: { id: true } }),
    // golden_records may not exist if Gate 2 was already applied — wrap in try/catch
    db.$queryRaw<{ canonical_id: string }[]>`
      SELECT canonical_id FROM golden_records
    `.catch(() => [] as { canonical_id: string }[]),
  ]);

  const entityIdSet = new Set(entityIds.map((e) => e.id));
  const goldenIdSet = new Set(goldenIds.map((g) => g.canonical_id));

  const auditRows: AuditRow[] = relationships.map((rel) => {
    const inEntities = entityIdSet.has(rel.entityId);
    const inGolden = goldenIdSet.has(rel.entityId);
    let status: AuditRow['status'] = 'ok';
    if (!inEntities && inGolden) status = 'orphan_missing_from_entities';
    if (!inEntities && !inGolden) status = 'orphan_missing_from_both';
    return {
      entity_actor_rel_id: rel.id,
      entity_id: rel.entityId,
      actor_id: rel.actorId,
      role: rel.role,
      in_entities: inEntities,
      in_golden_records: inGolden,
      status,
    };
  });

  const orphans = auditRows.filter((r) => r.status !== 'ok');

  return {
    rows: auditRows,
    orphans,
    totalCount: relationships.length,
    orphanCount: orphans.length,
  };
}

// ---------------------------------------------------------------------------
// Step 3: Rewire the FK constraint (apply mode only)
// ---------------------------------------------------------------------------
async function rewireFkConstraint(): Promise<void> {
  // DDL must use $executeRawUnsafe — Prisma parameterizes tagged template literals,
  // which is incompatible with ALTER TABLE statements.
  await db.$executeRawUnsafe(
    `ALTER TABLE "EntityActorRelationship" DROP CONSTRAINT IF EXISTS "${FK_CONSTRAINT_NAME}"`
  );
  await db.$executeRawUnsafe(
    `ALTER TABLE "EntityActorRelationship"
       ADD CONSTRAINT "${FK_CONSTRAINT_NAME}"
       FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
       ON DELETE CASCADE ON UPDATE CASCADE`
  );
}

// ---------------------------------------------------------------------------
// Step 4: Verify the constraint was rewired correctly
// ---------------------------------------------------------------------------
async function verifyFkConstraint(): Promise<FkStatus | null> {
  return checkCurrentFkTarget();
}

// ---------------------------------------------------------------------------
// Audit CSV writer
// ---------------------------------------------------------------------------
function writeAuditCsv(rows: AuditRow[]): void {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const header = 'entity_actor_rel_id,entity_id,actor_id,role,in_entities,in_golden_records,status\n';
  const body = rows
    .map((r) =>
      [
        r.entity_actor_rel_id,
        r.entity_id,
        r.actor_id,
        r.role,
        String(r.in_entities),
        String(r.in_golden_records),
        r.status,
      ].join(',')
    )
    .join('\n');
  fs.writeFileSync(AUDIT_PATH, header + body + '\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const { apply } = parseArgs();

  console.log('=============================================================');
  console.log('migrate-actor-relationships-to-entities');
  console.log('=============================================================');
  console.log(apply ? 'MODE: --apply (writes enabled)' : 'MODE: dry-run (no writes)');
  console.log('');

  // ── Check current FK state ──
  console.log('Step 1: Checking current FK constraint target...');
  const fkBefore = await checkCurrentFkTarget();
  if (!fkBefore) {
    console.log(`  ✓ Constraint "${FK_CONSTRAINT_NAME}" does not exist.`);
    console.log('  This may mean the constraint was already dropped (Gate 2 applied).');
    console.log('  Or the constraint name differs. Check DB manually:');
    console.log(`    SELECT conname FROM pg_constraint WHERE conname LIKE '%EntityActorRelationship%';`);
    console.log('');
    console.log('No action taken.');
    return;
  }

  console.log(`  Constraint: ${fkBefore.constraint_name}`);
  console.log(`  Currently references: ${fkBefore.referenced_table}`);

  if (fkBefore.referenced_table === 'entities') {
    console.log('  ✓ FK already points to entities. Nothing to do.');
    return;
  }

  if (fkBefore.referenced_table !== 'golden_records') {
    console.warn(`  ⚠ Unexpected reference target: "${fkBefore.referenced_table}". Expected "golden_records".`);
    console.warn('  Aborting to avoid unintended changes. Investigate manually.');
    process.exit(1);
  }

  console.log('  FK currently references golden_records — rewire required.');
  console.log('');

  // ── Audit all relationship rows ──
  console.log('Step 2: Auditing EntityActorRelationship rows...');
  const { rows, orphans, totalCount, orphanCount } = await auditRelationships();
  console.log(`  Total EntityActorRelationship rows: ${totalCount}`);
  console.log(`  Rows with entity_id present in entities.id: ${totalCount - orphanCount}`);
  console.log(`  Orphan rows (entity_id NOT in entities.id): ${orphanCount}`);
  console.log('');

  if (orphans.length > 0) {
    console.log('  ORPHAN ROWS DETECTED:');
    for (const o of orphans) {
      console.log(`    - rel_id=${o.entity_actor_rel_id} | entity_id=${o.entity_id} | role=${o.role} | status=${o.status}`);
    }
    console.log('');
    console.log('  ⚠ Orphan rows must be resolved before the FK can be rewired.');
    console.log('  These entity_ids exist in EntityActorRelationship but not in entities.id.');
    console.log('  Resolution options:');
    console.log('    1. Delete orphan rows: DELETE FROM "EntityActorRelationship" WHERE entity_id IN (...)');
    console.log('    2. Confirm whether the entity was deleted and the orphan is safe to drop.');
    console.log('    3. If the entity exists in entities under a different ID, update the row.');
    console.log('');

    writeAuditCsv(rows);
    console.log(`Audit written to: ${AUDIT_PATH}`);

    if (apply) {
      console.log('');
      console.log('  Aborting --apply due to orphan rows. Resolve orphans and re-run.');
      process.exit(1);
    } else {
      console.log('Dry-run complete. Resolve orphans before running with --apply.');
    }
    return;
  }

  console.log('  ✓ All entity_id values exist in entities.id. Safe to rewire.');
  console.log('');

  // ── Write audit CSV ──
  writeAuditCsv(rows);
  console.log(`Audit written to: ${AUDIT_PATH}`);
  console.log('');

  if (!apply) {
    console.log('Dry-run complete. No changes made.');
    console.log('');
    console.log('To apply the FK rewire, run:');
    console.log('  npx tsx -r ./scripts/load-env.js scripts/migrate-actor-relationships-to-entities.ts --apply');
    return;
  }

  // ── Apply: rewire the FK constraint ──
  console.log('Step 3: Rewiring FK constraint...');
  console.log(`  Dropping constraint: ${FK_CONSTRAINT_NAME} (currently → golden_records.canonical_id)`);
  console.log(`  Adding constraint:   ${FK_CONSTRAINT_NAME} (→ entities.id)`);
  await rewireFkConstraint();
  console.log('  ✓ FK rewired.');
  console.log('');

  // ── Verify ──
  console.log('Step 4: Verifying constraint...');
  const fkAfter = await verifyFkConstraint();
  if (!fkAfter) {
    console.error('  ✗ Constraint not found after apply. Investigate manually.');
    process.exit(1);
  }
  if (fkAfter.referenced_table !== 'entities') {
    console.error(`  ✗ Constraint still references "${fkAfter.referenced_table}" — expected "entities".`);
    process.exit(1);
  }
  console.log(`  ✓ Constraint "${fkAfter.constraint_name}" now references "${fkAfter.referenced_table}".`);
  console.log('');

  console.log('=============================================================');
  console.log('Migration complete.');
  console.log('');
  console.log('Summary:');
  console.log(`  EntityActorRelationship rows audited: ${totalCount}`);
  console.log(`  Orphans found:                        0`);
  console.log(`  FK rewired from:                      golden_records.canonical_id`);
  console.log(`  FK rewired to:                        entities.id`);
  console.log(`  Audit CSV:                            ${AUDIT_PATH}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Update prisma/schema.prisma: change EntityActorRelationship.entity');
  console.log('     relation from golden_records to entities.');
  console.log('  2. Run: npx prisma generate');
  console.log('  3. Confirm Gate 1 prerequisites in docs/DEFERRED_MIGRATION_GATES.md.');
  console.log('=============================================================');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
