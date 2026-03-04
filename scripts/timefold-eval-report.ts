#!/usr/bin/env node
/**
 * timefold-eval-report.ts — TimeFOLD v1 Test Harness & Calibration Report
 *
 * Runs evaluateTimeFOLD() across a curated seed set and writes a JSON + CSV
 * inspection report. Read-only: never writes to DB, never upserts traces.
 *
 * Usage:
 *   npx tsx scripts/timefold-eval-report.ts
 *   npx tsx scripts/timefold-eval-report.ts --generate-seed
 *   npx tsx scripts/timefold-eval-report.ts --seed data/timefold/timefold_eval_seed.json
 *   npx tsx scripts/timefold-eval-report.ts --outdir data/reports --limit 40
 *
 * Flags:
 *   --seed <path>         Seed file path (default: data/timefold/timefold_eval_seed.json)
 *   --outdir <path>       Output directory (default: data/reports)
 *   --limit <n>           Max rows to evaluate (default: 40)
 *   --generate-seed       Generate a starter seed file from DB heuristics, then exit
 */

import { db } from '@/lib/db';
import { evaluateTimeFOLD } from '@/lib/timefold';
import { TIMEFOLD_CONFIG } from '@/lib/timefold/config';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getFlag(name: string, fallback: string): string {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1]!;
  return fallback;
}

const SEED_PATH = getFlag('--seed', 'data/timefold/timefold_eval_seed.json');
const OUT_DIR = getFlag('--outdir', 'data/reports');
const LIMIT = parseInt(getFlag('--limit', '40'), 10);
const GENERATE_SEED = args.includes('--generate-seed');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedEntry {
  canonicalId: string;
  entityId: string | null;
  label: string | null;
  [key: string]: unknown;
}

interface ReportRow {
  canonicalId: string;
  entityId: string | null;
  hadEntityId: boolean;
  name: string | null;
  outputClass: string | null;
  outputText: string | null;
  approvalGate: 'AUTO' | 'EDITORIAL' | null;
  inputsUsed: string[];
  notes: string | null;
}

interface Report {
  generatedAt: string;
  config: typeof TIMEFOLD_CONFIG;
  rows: ReportRow[];
}

// ---------------------------------------------------------------------------
// Generate-seed mode
// ---------------------------------------------------------------------------

async function generateSeed(): Promise<void> {
  console.log('Generating starter seed from DB heuristics (max 40 entries)...\n');

  const perBucket = 10;

  // Bucket 1: golden_records with recent traces (ENTITY_CREATED, STATUS_CHANGED)
  const recentTraceIds = await db.traces
    .findMany({
      where: { event_type: { in: ['ENTITY_CREATED', 'STATUS_CHANGED'] } },
      orderBy: { observed_at: 'desc' },
      take: perBucket * 3,
      select: { entity_id: true },
    })
    .then((rows) => {
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const r of rows) {
        if (r.entity_id && !seen.has(r.entity_id)) {
          seen.add(r.entity_id);
          ids.push(r.entity_id);
          if (ids.length >= perBucket) break;
        }
      }
      return ids;
    });

  // Bucket 2: actor relationship traces (IDENTITY_ATTACHED for actor_relationship)
  const actorTraceIds = await db.traces
    .findMany({
      where: { event_type: 'IDENTITY_ATTACHED', field_name: 'actor_relationship' },
      orderBy: { observed_at: 'desc' },
      take: perBucket * 3,
      select: { entity_id: true },
    })
    .then((rows) => {
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const r of rows) {
        if (r.entity_id && !seen.has(r.entity_id)) {
          seen.add(r.entity_id);
          ids.push(r.entity_id);
          if (ids.length >= perBucket) break;
        }
      }
      return ids;
    });

  // Bucket 3: oldest golden_records (continuity candidates — large trace horizon)
  const oldIds = await db.golden_records
    .findMany({
      where: { lifecycle_status: { in: ['ACTIVE', 'LEGACY_FAVORITE'] } },
      orderBy: { created_at: 'asc' },
      take: perBucket,
      select: { canonical_id: true },
    })
    .then((rows) => rows.map((r) => r.canonical_id));

  // Bucket 4: newest golden_records (new/recently opened candidates)
  const newIds = await db.golden_records
    .findMany({
      where: { lifecycle_status: 'ACTIVE' },
      orderBy: { created_at: 'desc' },
      take: perBucket,
      select: { canonical_id: true },
    })
    .then((rows) => rows.map((r) => r.canonical_id));

  // Merge and deduplicate across buckets
  const allIds = new Map<string, { label: string | null }>([
    ...recentTraceIds.map((id) => [id, { label: null }] as [string, { label: string | null }]),
    ...actorTraceIds.map((id) => [id, { label: 'change_transition' }] as [string, { label: string | null }]),
    ...oldIds.map((id) => [id, { label: 'continuity_established' }] as [string, { label: string | null }]),
    ...newIds.map((id) => [id, { label: 'new_recently_opened' }] as [string, { label: string | null }]),
  ]);

  const entries: SeedEntry[] = [];
  for (const [canonicalId, meta] of allIds) {
    if (entries.length >= 40) break;
    if (canonicalId === '__PLACEHOLDER__') continue;
    entries.push({
      canonicalId,
      entityId: null,
      label: meta.label,
    });
  }

  if (entries.length === 0) {
    console.warn('No golden_records or traces found. Seed will be empty.');
  }

  const seedPath = path.resolve(SEED_PATH);
  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  fs.writeFileSync(seedPath, JSON.stringify(entries, null, 2));
  console.log(`Wrote ${entries.length} entries to ${seedPath}`);
  console.log('\nNote: entityId is null for all generated entries.');
  console.log('Enrich manually if actor relationship / appearance signals are needed.\n');
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function csvEscape(val: string | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToCsv(row: ReportRow): string {
  return [
    csvEscape(row.canonicalId),
    csvEscape(row.entityId),
    csvEscape(String(row.hadEntityId)),
    csvEscape(row.name),
    csvEscape(row.outputClass),
    csvEscape(row.outputText),
    csvEscape(row.approvalGate),
    csvEscape(row.inputsUsed.join(';')),
    csvEscape(row.notes),
  ].join(',');
}

const CSV_HEADER =
  'canonicalId,entityId,hadEntityId,name,outputClass,outputText,approvalGate,inputsUsed,notes';

// ---------------------------------------------------------------------------
// Main evaluation
// ---------------------------------------------------------------------------

async function runReport(): Promise<void> {
  // Read seed
  const seedPath = path.resolve(SEED_PATH);
  if (!fs.existsSync(seedPath)) {
    console.error(`Seed file not found: ${seedPath}`);
    console.error('Run with --generate-seed to create one first.');
    process.exit(1);
  }

  const rawSeed: SeedEntry[] = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const seed = rawSeed
    .filter((e) => e.canonicalId && e.canonicalId !== '__PLACEHOLDER__')
    .slice(0, LIMIT);

  if (seed.length === 0) {
    console.error('Seed file is empty or contains only placeholders. Run --generate-seed first.');
    process.exit(1);
  }

  console.log(`TimeFOLD v1 — Evaluation Report`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`Seed: ${seedPath}  (${seed.length} entries, limit ${LIMIT})`);
  console.log(`Config: continuityWindow=${TIMEFOLD_CONFIG.continuityWindowDays}d  newWindow=${TIMEFOLD_CONFIG.newWindowDays}d  autoThreshold=${TIMEFOLD_CONFIG.autoConfidenceThreshold}  changeWindow=${TIMEFOLD_CONFIG.changeTransitionWindowDays}d`);
  console.log();

  const rows: ReportRow[] = [];

  for (const entry of seed) {
    process.stdout.write(`  Evaluating ${entry.canonicalId.slice(0, 8)}… `);

    // Fetch entity name from entities table if entityId is available
    let entityName: string | null = null;
    let notes: string | null = null;

    if (entry.entityId) {
      const entity = await db.entities.findUnique({
        where: { id: entry.entityId },
        select: { name: true },
      });
      entityName = entity?.name ?? null;
      if (!entity) notes = 'entityId not found in entities table';
    }

    // If no entityId, try golden_records for a name fallback
    if (!entityName) {
      const golden = await db.golden_records.findUnique({
        where: { canonical_id: entry.canonicalId },
        select: { name: true },
      });
      entityName = golden?.name ?? null;
      if (!golden) {
        notes = [notes, 'canonicalId not found in golden_records'].filter(Boolean).join('; ');
      }
    }

    // Check trace existence (informational — log but do not skip)
    const traceCount = await db.traces.count({
      where: { entity_id: entry.canonicalId },
    });
    if (traceCount === 0) {
      notes = [notes, 'no traces found for canonicalId'].filter(Boolean).join('; ');
    }

    // Evaluate
    let output: Awaited<ReturnType<typeof evaluateTimeFOLD>> = null;
    try {
      output = await evaluateTimeFOLD({
        canonicalId: entry.canonicalId,
        entityId: entry.entityId ?? undefined,
      });
    } catch (err) {
      notes = [notes, `evaluator error: ${(err as Error).message}`].filter(Boolean).join('; ');
    }

    const row: ReportRow = {
      canonicalId: entry.canonicalId,
      entityId: entry.entityId,
      hadEntityId: entry.entityId != null,
      name: entityName,
      outputClass: output?.outputClass ?? null,
      outputText: output?.exampleCopies?.[0] ?? output?.outputClass ?? null,
      approvalGate: output?.approvalGate
        ? (output.approvalGate.toUpperCase() as 'AUTO' | 'EDITORIAL')
        : null,
      inputsUsed: output?.inputsUsed ?? [],
      notes,
    };

    rows.push(row);

    const label = output?.outputClass ?? 'silence';
    const gate = output ? `[${row.approvalGate}]` : '';
    const hint = entry.label ? `  (expected: ${entry.label})` : '';
    console.log(`${label} ${gate}${hint}`);
  }

  // ---------------------------------------------------------------------------
  // Write reports
  // ---------------------------------------------------------------------------

  fs.mkdirSync(path.resolve(OUT_DIR), { recursive: true });

  const report: Report = {
    generatedAt: new Date().toISOString(),
    config: { ...TIMEFOLD_CONFIG },
    rows,
  };

  const jsonPath = path.resolve(OUT_DIR, 'timefold_eval_report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const csvLines = [CSV_HEADER, ...rows.map(rowToCsv)];
  const csvPath = path.resolve(OUT_DIR, 'timefold_eval_report.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const classCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.outputClass ?? 'silence';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const autoCount = rows.filter((r) => r.approvalGate === 'AUTO').length;
  const editorialCount = rows.filter((r) => r.approvalGate === 'EDITORIAL').length;
  const silenceCount = rows.filter((r) => r.outputClass === null).length;
  const withNotes = rows.filter((r) => r.notes).length;

  console.log();
  console.log(`${'─'.repeat(50)}`);
  console.log(`Results  (${rows.length} evaluated)`);
  console.log();
  for (const [cls, count] of Object.entries(classCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cls.padEnd(28)} ${count}`);
  }
  console.log();
  console.log(`  Auto gate                    ${autoCount}`);
  console.log(`  Editorial gate               ${editorialCount}`);
  console.log(`  Silence                      ${silenceCount}`);
  console.log(`  Rows with notes              ${withNotes}`);
  console.log();
  console.log(`Reports written:`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${csvPath}`);
  console.log();
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (GENERATE_SEED) {
    await generateSeed();
  } else {
    await runReport();
  }
}

main()
  .catch((err) => {
    console.error('\nFatal error:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
