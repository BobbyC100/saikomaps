#!/usr/bin/env node
/**
 * import-seed-la-places.ts
 *
 * Imports LA-area places from data/exports/seed-places.csv into the entities table.
 * Filters to rows whose google_place_id contains 'woAR' (Los Angeles region).
 * Skips rows already present (matched by googlePlaceId or slug).
 *
 * Usage:
 *   npx tsx scripts/import-seed-la-places.ts [--apply] [--limit=N]
 *
 * --apply   Write to DB (default: dry-run)
 * --limit=N Max rows to import (default: all)
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { readFileSync } from 'fs';
import { parse } from 'papaparse';
import { randomUUID } from 'crypto';
import { db } from '../lib/db';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const apply    = process.argv.includes('--apply');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit    = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

const CSV_PATH = 'data/exports/seed-places.csv';
const LA_REGION_TOKEN = 'woAR';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CsvRow {
  id: string;
  slug: string;
  name: string;
  website: string;
  google_place_id: string;
  instagram: string;
  neighborhood: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`📦 Import seed LA places — ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  const raw = readFileSync(CSV_PATH, 'utf-8');
  const parsed = parse<CsvRow>(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    console.error('CSV parse errors:', parsed.errors);
    process.exit(1);
  }

  const all = parsed.data;

  // Filter to LA area
  const laRows = all.filter((r) => r.google_place_id?.includes(LA_REGION_TOKEN));
  console.log(`Total CSV rows    : ${all.length}`);
  console.log(`LA-area rows      : ${laRows.length}`);

  // Load existing entity identifiers
  const existingByGpid = new Set<string>();
  const existingBySlug = new Set<string>();
  const existing = await db.entities.findMany({ select: { slug: true, googlePlaceId: true } });
  for (const e of existing) {
    if (e.googlePlaceId) existingByGpid.add(e.googlePlaceId);
    existingBySlug.add(e.slug);
  }

  const toImport = laRows.filter((r) => {
    if (existingByGpid.has(r.google_place_id)) return false;
    if (existingBySlug.has(r.slug)) return false;
    return true;
  });

  console.log(`Already in DB     : ${laRows.length - toImport.length}`);
  console.log(`To import         : ${toImport.length}`);
  if (limitArg) console.log(`Limit applied     : ${limit}`);
  console.log('');

  const batch = toImport.slice(0, limit === Infinity ? undefined : limit);

  let created = 0;
  let errored = 0;

  for (const row of batch) {
    const label = `  ${row.slug.padEnd(40)} ${row.google_place_id}`;

    if (!apply) {
      console.log(`${label} [dry-run]`);
      created++;
      continue;
    }

    try {
      await db.entities.create({
        data: {
          id:             row.id || randomUUID(),
          slug:           row.slug,
          name:           row.name,
          googlePlaceId:  row.google_place_id || undefined,
          website:        row.website        || undefined,
          instagram:      row.instagram      || undefined,
          neighborhood:   row.neighborhood   || undefined,
          primary_vertical: 'EAT',
          createdAt:      new Date(),
          updatedAt:      new Date(),
        },
      });
      console.log(`${label} ✓`);
      created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${label} ✗ ${msg}`);
      errored++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(apply ? '✅ Import complete' : '🏃 Dry run complete');
  console.log(`   Created  : ${created}`);
  console.log(`   Errors   : ${errored}`);
  if (!apply) {
    console.log('\n   Run with --apply to write to DB.');
  }
}

main()
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
