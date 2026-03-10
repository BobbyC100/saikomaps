#!/usr/bin/env node
/**
 * run-surface-parse.ts
 * SKAI-WO-FIELDS-SURFACE-PARSE-001
 *
 * Parse pass for fetched merchant surfaces.
 * Reads rows with fetch_status = 'fetch_success' + parse_status = 'parse_pending'
 * and converts them into structured parse artifacts in merchant_surface_artifacts.
 *
 * No network calls are made. Operates purely on stored raw_html / raw_text.
 * Deterministic and replay-safe: duplicate artifacts are silently skipped.
 *
 * Usage:
 *   npx tsx scripts/run-surface-parse.ts [--limit=N] [--surface-type=<type>] [--dry-run]
 *
 * --limit=N              Max rows to process (default: 100)
 * --surface-type=<type>  Only parse a specific surface type (homepage, menu, about, …)
 * --dry-run              Print what would be parsed without writing anything
 *
 * Pipeline placement:
 *   run-surface-discovery.ts → run-surface-fetch.ts → [this script] → future: extraction pass
 */

import { config } from 'dotenv';
config({ path: '.env' });
// Respect db-local.sh / db-neon.sh wrappers — do not clobber DATABASE_URL they set.
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import {
  findSurfacesToParse,
  parseAndCaptureSurface,
  ARTIFACT_TYPE,
  ARTIFACT_VERSION,
} from '../lib/merchant-surface-parse';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const isDryRun    = process.argv.includes('--dry-run');
const limitArg    = process.argv.find((a) => a.startsWith('--limit='));
const typeArg     = process.argv.find((a) => a.startsWith('--surface-type='));
const limit       = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;
const surfaceType = typeArg  ? typeArg.split('=')[1] : undefined;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🔍 Merchant Surface Parse Pass\n');
  console.log(`   artifact_type    : ${ARTIFACT_TYPE}`);
  console.log(`   artifact_version : ${ARTIFACT_VERSION}\n`);

  if (isDryRun)    console.log('🏃 DRY RUN — no rows will be written\n');
  if (surfaceType) console.log(`   surface type filter: ${surfaceType}\n`);

  const rows = await findSurfacesToParse({ limit, surfaceType });

  if (rows.length === 0) {
    console.log('No surfaces pending parse (fetch_success + parse_pending).');
    return;
  }

  console.log(`Found ${rows.length} surface${rows.length !== 1 ? 's' : ''} to parse\n`);

  let written = 0;
  let deduped = 0;
  let failed  = 0;

  for (const row of rows) {
    const label = `  [${row.surface_type.padEnd(11)}] ${row.source_url.slice(0, 68)}`;
    process.stdout.write(`${label} … `);

    if (isDryRun) {
      const hasHtml = !!(row.raw_html ?? row.raw_text);
      console.log(`[dry-run] ${hasHtml ? 'has HTML' : 'no HTML content'}`);
      continue;
    }

    try {
      const outcome = await parseAndCaptureSurface(row);
      switch (outcome) {
        case 'written': console.log('✓ parsed');   written++; break;
        case 'deduped': console.log('↩ deduped');  deduped++; break;
        case 'failed':  console.log('✗ failed');   failed++;  break;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ error — ${msg}`);
      failed++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Parse pass complete');
  console.log(`   Surfaces processed : ${rows.length}`);
  console.log(`   Parsed (artifacts) : ${written}`);
  console.log(`   Deduped (skipped)  : ${deduped}`);
  console.log(`   Failed             : ${failed}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
