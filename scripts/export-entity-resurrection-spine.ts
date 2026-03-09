#!/usr/bin/env node
/**
 * WO-DATA-001 — Resurrection Spine Export
 *
 * Exports the minimum identity spine needed to rebuild the Saiko dataset
 * after catastrophic loss. Six columns only: the anchors that let all
 * enrichment, derivation, and editorial layers be replayed from scratch.
 *
 * Source: entities table (authoritative upstream; golden_records and
 * canonical_entity_state are derived from it, not the other way around).
 *
 * Excludes PERMANENTLY_CLOSED entities — they are not recoverable places
 * and add noise to a recovery artifact.
 *
 * Usage:
 *   npx tsx scripts/export-entity-resurrection-spine.ts
 *
 * Output:
 *   data/cold-storage/entity_resurrection_spine.csv
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const OUTPUT_DIR = join(process.cwd(), 'data', 'cold-storage');
const OUTPUT_FILE = join(OUTPUT_DIR, 'entity_resurrection_spine.csv');

function escapeCsv(value: string | null | undefined): string {
  // Prisma $queryRaw can surface PostgreSQL NULLs as JS null or the string "null" depending
  // on the driver version. Guard both cases explicitly.
  if (value === null || value === undefined || (value as unknown) === 'null') return '';
  const str = String(value);
  if (!str || str === 'null') return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}


async function main() {
  console.log('WO-DATA-001 — Resurrection Spine Export');
  console.log('═'.repeat(50));
  console.log('');
  console.log('Source:  entities (authoritative upstream table)');
  console.log('Filter:  excluding PERMANENTLY_CLOSED');
  console.log(`Output:  ${OUTPUT_FILE}`);
  console.log('');

  // Raw query avoids Prisma enum type mismatch (DB has EntityStatus, schema has PlaceStatus).
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      google_place_id: string | null;
      website: string | null;
      latitude: string | null;
      longitude: string | null;
    }>
  >(Prisma.sql`
    SELECT id, name, google_place_id, website,
           latitude::text, longitude::text
    FROM entities
    WHERE status::text <> 'PERMANENTLY_CLOSED'
    ORDER BY name ASC
  `);

  // Stats
  let missingGpid = 0;
  let missingWebsite = 0;
  let missingCoords = 0;

  const lines: string[] = ['entity_id,name,google_place_id,website,latitude,longitude'];

  for (const row of rows) {
    const hasGpid = row.google_place_id && row.google_place_id !== 'null';
    const hasWebsite = row.website && row.website !== 'null';
    const hasCoords =
      row.latitude && row.latitude !== 'null' && row.longitude && row.longitude !== 'null';

    if (!hasGpid) missingGpid++;
    if (!hasWebsite) missingWebsite++;
    if (!hasCoords) missingCoords++;

    lines.push(
      [
        escapeCsv(row.id),
        escapeCsv(row.name),
        escapeCsv(row.google_place_id),
        escapeCsv(row.website),
        escapeCsv(row.latitude),
        escapeCsv(row.longitude),
      ].join(',')
    );
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n', 'utf-8');

  console.log('Summary');
  console.log('─'.repeat(50));
  console.log(`rows exported:         ${rows.length}`);
  console.log(`missing GPID count:    ${missingGpid}`);
  console.log(`missing website count: ${missingWebsite}`);
  console.log(`missing coords count:  ${missingCoords}`);
  console.log('');
  console.log(`Spine written to: ${OUTPUT_FILE}`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
