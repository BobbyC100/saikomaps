#!/usr/bin/env node
/**
 * Identity audit: read-only snapshot of places identity health.
 * - Total places, missing GPID, duplicate GPIDs (non-empty)
 * - Latest GPID dry-run CSV: status + reason counts (if CSV exists)
 * No DB writes.
 *
 * Usage: npm run identity:audit
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';

const LOGS_DIR = join(process.cwd(), 'data', 'logs');
const CANONICAL_CSV = join(LOGS_DIR, 'gpid_resolution_dryrun.csv');
const CSV_GLOB_PREFIX = join(LOGS_DIR, 'gpid_resolution_dryrun');

function parseDatabaseLabel(url: string | undefined): string {
  if (!url || typeof url !== 'string') return 'unknown';
  if (url.includes('neon.tech')) return 'neon';
  if (url.includes('localhost') || url.includes('127.0.0.1')) return 'local';
  return 'unknown';
}

function findCsvPath(): string | null {
  if (existsSync(CANONICAL_CSV)) return CANONICAL_CSV;
  try {
    const { readdirSync } = require('fs');
    const files = readdirSync(LOGS_DIR).filter((f: string) =>
      f.startsWith('gpid_resolution_dryrun') && f.endsWith('.csv')
    );
    if (files.length === 0) return null;
    const withPath = files.map((f: string) => ({
      path: join(LOGS_DIR, f),
      mtime: require('fs').statSync(join(LOGS_DIR, f)).mtime.getTime(),
    }));
    withPath.sort((a: { mtime: number }, b: { mtime: number }) => b.mtime - a.mtime);
    return withPath[0].path;
  } catch {
    return null;
  }
}

function parseCsv(csvPath: string): { status: string; reason: string }[] {
  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headerCols = parseCsvLine(lines[0]);
  const statusIdx = headerCols.findIndex((c) => c.replace(/^"|"$/g, '') === 'status');
  const reasonIdx = headerCols.findIndex((c) => c.replace(/^"|"$/g, '') === 'reason');

  if (statusIdx === -1 || reasonIdx === -1) return [];

  const rows: { status: string; reason: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = parseCsvLine(line);
    const status = (cols[statusIdx] ?? '').trim();
    const reason = (cols[reasonIdx] ?? '').trim();
    if (status || reason) rows.push({ status, reason });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else if (c !== '\n' && c !== '\r') {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL;
  const label = parseDatabaseLabel(url);

  if (!url) {
    console.log('IDENTITY AUDIT (no DB)');
    console.log('DATABASE_URL not set. Set it to run DB queries.');
    process.exit(1);
  }

  const prisma = db;

  let totalPlaces = 0;
  let missingGpid = 0;
  let duplicateGpids = 0;

  try {
    const [totalRow] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      'select count(*) as count from public.places'
    );
    totalPlaces = Number(totalRow?.count ?? 0);

    const [missingRow] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      "select count(*) as count from public.places where google_place_id is null or btrim(coalesce(google_place_id,'')) = ''"
    );
    missingGpid = Number(missingRow?.count ?? 0);

    const [dupRow] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `select count(*) as count from (
        select google_place_id from public.places
        where google_place_id is not null and btrim(google_place_id) <> ''
        group by 1 having count(*) > 1
      ) d`
    );
    duplicateGpids = Number(dupRow?.count ?? 0);
  } catch (e) {
    console.error('DB query error:', e);
    process.exit(1);
  }

  console.log(`IDENTITY AUDIT (${label})`);
  console.log(`Total places: ${totalPlaces}`);
  console.log(`Missing GPID: ${missingGpid}`);
  console.log(`Duplicate GPIDs (non-empty): ${duplicateGpids}`);
  console.log('');

  const csvPath = findCsvPath();
  if (!csvPath) {
    console.log('No dry-run CSV found.');
    return;
  }

  const rows = parseCsv(csvPath);
  if (rows.length === 0) {
    const header = readFileSync(csvPath, 'utf-8').split(/\r?\n/)[0] ?? '';
    if (!header.includes('status') || !header.includes('reason')) {
      console.log(`GPID Dry-Run CSV: ${csvPath}`);
      console.log('CSV has no status/reason columns (old format?). DB metrics above.');
      return;
    }
    console.log(`GPID Dry-Run CSV: ${csvPath}`);
    console.log('(no data rows)');
    return;
  }

  const byStatus: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  for (const r of rows) {
    const s = r.status || '(blank)';
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    const re = r.reason || '(blank)';
    byReason[re] = (byReason[re] ?? 0) + 1;
  }

  console.log(`GPID Dry-Run CSV: ${csvPath}`);
  console.log(`MATCH: ${byStatus['MATCH'] ?? 0}`);
  console.log(`AMBIGUOUS: ${byStatus['AMBIGUOUS'] ?? 0}`);
  console.log(`NO_MATCH: ${byStatus['NO_MATCH'] ?? 0}`);
  console.log(`ERROR: ${byStatus['ERROR'] ?? 0}`);
  console.log('');
  console.log('Top reasons:');
  const sortedReasons = Object.entries(byReason)
    .filter(([k]) => k !== '(blank)')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [reason, count] of sortedReasons) {
    console.log(`${reason}: ${count}`);
  }
  if (sortedReasons.length === 0 && (byReason['(blank)'] ?? 0) > 0) {
    console.log('(all reasons blank)');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
