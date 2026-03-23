/**
 * Backfill Entity Dimension Model v1 columns from audit CSV.
 *
 * Reads the heuristic classifications from entity-dimensions-audit.csv
 * and writes them to the four dimension columns on entities:
 *   - location_type       (LocationType enum)
 *   - schedule_type       (ScheduleType enum)
 *   - identity_anchor_type (IdentityAnchorType enum)
 *   - containment_type    (ContainmentType enum)
 *
 * Safety:
 *   - Dry-run by default. Pass --apply to write.
 *   - Idempotent: only updates entities where ALL four dimension columns are NULL.
 *   - Skips rows with confidence below threshold (default 0.5).
 *   - Logs every write with entity_id, old value (null), new value.
 *
 * Usage:
 *   npx tsx scripts/backfill-entity-dimensions.ts
 *   npx tsx scripts/backfill-entity-dimensions.ts --apply
 *   npx tsx scripts/backfill-entity-dimensions.ts --apply --limit 100
 *   npx tsx scripts/backfill-entity-dimensions.ts --min-confidence 0.7
 *
 * Phase 1C of ARCH-ENTITY-DIMENSION-IMPLEMENTATION-PLAN-V1
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Valid enum values (must match prisma/schema.prisma exactly)
// ---------------------------------------------------------------------------

const VALID_LOCATION_TYPES = new Set(['fixed', 'mobile', 'contained', 'civic']);
const VALID_SCHEDULE_TYPES = new Set(['regular', 'market', 'route', 'open_access', 'date_bounded']);
const VALID_IDENTITY_ANCHORS = new Set(['gpid', 'social', 'operator', 'parent', 'coordinates']);
const VALID_CONTAINMENT_TYPES = new Set(['independent', 'contained', 'host']);

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

interface AuditRow {
  entity_id: string;
  slug: string;
  name: string;
  primary_vertical: string;
  entity_type: string;
  status: string;
  has_gpid: string;
  has_address: string;
  has_instagram: string;
  inferred_location_type: string;
  inferred_schedule_type: string;
  inferred_identity_anchor: string;
  inferred_containment_type: string;
  confidence: string;
  reasoning: string;
}

function parseCSV(csvPath: string): AuditRow[] {
  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: AuditRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle CSV fields that may contain commas inside quotes
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row as unknown as AuditRow);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface ValidatedRow {
  entity_id: string;
  slug: string;
  name: string;
  location_type: string;
  schedule_type: string;
  identity_anchor_type: string;
  containment_type: string;
  confidence: number;
}

function validateRow(row: AuditRow, index: number): ValidatedRow | null {
  const confidence = parseFloat(row.confidence);
  if (isNaN(confidence)) {
    console.warn(`  ⚠ Row ${index}: invalid confidence "${row.confidence}" for ${row.slug} — skipping`);
    return null;
  }

  if (!row.entity_id || row.entity_id.length < 10) {
    console.warn(`  ⚠ Row ${index}: invalid entity_id "${row.entity_id}" — skipping`);
    return null;
  }

  if (!VALID_LOCATION_TYPES.has(row.inferred_location_type)) {
    console.warn(`  ⚠ Row ${index}: invalid location_type "${row.inferred_location_type}" for ${row.slug} — skipping`);
    return null;
  }
  if (!VALID_SCHEDULE_TYPES.has(row.inferred_schedule_type)) {
    console.warn(`  ⚠ Row ${index}: invalid schedule_type "${row.inferred_schedule_type}" for ${row.slug} — skipping`);
    return null;
  }
  if (!VALID_IDENTITY_ANCHORS.has(row.inferred_identity_anchor)) {
    console.warn(`  ⚠ Row ${index}: invalid identity_anchor "${row.inferred_identity_anchor}" for ${row.slug} — skipping`);
    return null;
  }
  if (!VALID_CONTAINMENT_TYPES.has(row.inferred_containment_type)) {
    console.warn(`  ⚠ Row ${index}: invalid containment_type "${row.inferred_containment_type}" for ${row.slug} — skipping`);
    return null;
  }

  return {
    entity_id: row.entity_id,
    slug: row.slug,
    name: row.name,
    location_type: row.inferred_location_type,
    schedule_type: row.inferred_schedule_type,
    identity_anchor_type: row.inferred_identity_anchor,
    containment_type: row.inferred_containment_type,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let apply = false;
  let limit = Infinity;
  let minConfidence = 0.5;
  let csvPath = resolve(__dirname, '..', 'entity-dimensions-audit.csv');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') apply = true;
    else if (args[i] === '--limit') limit = parseInt(args[++i] || '0', 10) || Infinity;
    else if (args[i] === '--min-confidence') minConfidence = parseFloat(args[++i] || '0.5') || 0.5;
    else if (args[i] === '--csv') csvPath = resolve(args[++i] || csvPath);
  }

  return { apply, limit, minConfidence, csvPath };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { apply, limit, minConfidence, csvPath } = parseArgs();

  console.log(`\n=== Entity Dimension Backfill ===`);
  console.log(`Mode: ${apply ? '🔴 APPLY (writing to database)' : '🟡 DRY RUN (no writes)'}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Min confidence: ${minConfidence}`);
  if (limit < Infinity) console.log(`Limit: ${limit}`);
  console.log('');

  // ── Load and validate CSV ──────────────────────────────────────────────
  const rawRows = parseCSV(csvPath);
  console.log(`CSV rows loaded: ${rawRows.length}`);

  const validated: ValidatedRow[] = [];
  let skippedValidation = 0;
  let skippedConfidence = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const v = validateRow(rawRows[i], i + 2); // +2 for 1-indexed + header
    if (!v) {
      skippedValidation++;
      continue;
    }
    if (v.confidence < minConfidence) {
      skippedConfidence++;
      continue;
    }
    validated.push(v);
  }

  console.log(`Validated rows: ${validated.length}`);
  if (skippedValidation > 0) console.log(`Skipped (validation): ${skippedValidation}`);
  if (skippedConfidence > 0) console.log(`Skipped (confidence < ${minConfidence}): ${skippedConfidence}`);
  console.log('');

  // ── Check current state ────────────────────────────────────────────────
  const alreadyBackfilled = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM entities
    WHERE location_type IS NOT NULL
       OR schedule_type IS NOT NULL
       OR identity_anchor_type IS NOT NULL
       OR containment_type IS NOT NULL
  `;
  const backfilledCount = alreadyBackfilled[0]?.count ?? 0;

  if (backfilledCount > 0) {
    console.log(`⚠️  ${backfilledCount} entities already have dimension fields populated.`);
    console.log('   This script only updates entities where ALL four dimension columns are NULL.');
    console.log('');
  }

  // ── Distribution summary ───────────────────────────────────────────────
  const distro = {
    location: {} as Record<string, number>,
    schedule: {} as Record<string, number>,
    anchor: {} as Record<string, number>,
    containment: {} as Record<string, number>,
  };

  for (const row of validated) {
    distro.location[row.location_type] = (distro.location[row.location_type] ?? 0) + 1;
    distro.schedule[row.schedule_type] = (distro.schedule[row.schedule_type] ?? 0) + 1;
    distro.anchor[row.identity_anchor_type] = (distro.anchor[row.identity_anchor_type] ?? 0) + 1;
    distro.containment[row.containment_type] = (distro.containment[row.containment_type] ?? 0) + 1;
  }

  console.log('Dimension distribution (from CSV):');
  for (const [dim, counts] of Object.entries(distro)) {
    console.log(`  ${dim}:`);
    for (const [val, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${val}: ${count}`);
    }
  }
  console.log('');

  if (!apply) {
    console.log('Dry run complete. Pass --apply to write changes.');
    await prisma.$disconnect();
    return;
  }

  // ── Apply backfill ─────────────────────────────────────────────────────
  let updated = 0;
  let skippedNotFound = 0;
  let skippedAlreadySet = 0;
  const capped = limit < Infinity ? validated.slice(0, limit) : validated;

  console.log(`Applying to ${capped.length} entities...\n`);

  for (const row of capped) {
    const result = await prisma.$executeRawUnsafe(`
      UPDATE entities
      SET
        location_type = '${row.location_type}'::"LocationType",
        schedule_type = '${row.schedule_type}'::"ScheduleType",
        identity_anchor_type = '${row.identity_anchor_type}'::"IdentityAnchorType",
        containment_type = '${row.containment_type}'::"ContainmentType"
      WHERE id = '${row.entity_id}'
        AND location_type IS NULL
        AND schedule_type IS NULL
        AND identity_anchor_type IS NULL
        AND containment_type IS NULL
    `);

    if (result > 0) {
      updated++;
      console.log(`  ✓ ${row.slug}: ${row.location_type} / ${row.schedule_type} / ${row.identity_anchor_type} / ${row.containment_type}`);
    } else {
      // Check if entity exists
      const exists = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM entities WHERE id = ${row.entity_id}
      `;
      if ((exists[0]?.count ?? 0) === 0) {
        skippedNotFound++;
        console.log(`  ⊘ ${row.slug}: entity not found in database`);
      } else {
        skippedAlreadySet++;
        // Already has values — idempotent skip
      }
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Updated: ${updated}`);
  if (skippedAlreadySet > 0) console.log(`Skipped (already set): ${skippedAlreadySet}`);
  if (skippedNotFound > 0) console.log(`Skipped (not found): ${skippedNotFound}`);

  // ── Verification ───────────────────────────────────────────────────────
  const verification = await prisma.$queryRaw<{
    location_type: string | null;
    schedule_type: string | null;
    identity_anchor_type: string | null;
    containment_type: string | null;
    count: number;
  }[]>`
    SELECT
      location_type::text,
      schedule_type::text,
      identity_anchor_type::text,
      containment_type::text,
      COUNT(*)::int AS count
    FROM entities
    GROUP BY location_type, schedule_type, identity_anchor_type, containment_type
    ORDER BY count DESC
  `;

  console.log('\nPost-backfill dimension distribution:');
  for (const row of verification) {
    const loc = row.location_type ?? 'NULL';
    const sch = row.schedule_type ?? 'NULL';
    const anc = row.identity_anchor_type ?? 'NULL';
    const con = row.containment_type ?? 'NULL';
    console.log(`  ${loc} / ${sch} / ${anc} / ${con}: ${row.count}`);
  }

  // Check for unmigrated
  const unmigrated = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM entities
    WHERE location_type IS NULL
  `;
  const unmigratedCount = unmigrated[0]?.count ?? 0;

  if (unmigratedCount > 0) {
    console.log(`\n⚠️  ${unmigratedCount} entities still have NULL dimension values.`);
  } else {
    console.log('\n✓ All entities have dimension values populated.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Backfill failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
