#!/usr/bin/env node
/**
 * run-surface-fetch.ts
 * SKAI-WO-FIELDS-SURFACE-FETCH-001
 *
 * Fetch pass for discovered merchant surfaces.
 * Selects rows with fetch_status = 'discovered' and converts them into
 * fully captured evidence rows (fetch_success or fetch_failed).
 *
 * Evidence rows are NEVER updated — each fetch is a new row.
 * Deduplication: identical content_hash + entity_id + surface_type → skip write.
 *
 * Usage:
 *   npx tsx scripts/run-surface-fetch.ts [--limit=N] [--surface-type=<type>] [--dry-run]
 *
 * --limit=N              Max rows to process (default: 50)
 * --surface-type=<type>  Only fetch a specific surface type (menu, about, contact, …)
 * --dry-run              Print what would be fetched without writing anything
 *
 * Surface types skipped automatically: instagram (requires auth/special handling)
 *
 * Pipeline placement:
 *   run-surface-discovery.ts → [this script] → future: extraction pass
 */

import { config } from 'dotenv';
config({ path: '.env' });
// Respect db-local.sh / db-neon.sh wrappers — do not clobber DATABASE_URL they set.
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import {
  findDiscoveredSurfaces,
  fetchAndCaptureSurface,
} from '../lib/merchant-surface-discovery';

type SurfaceRowCompat = {
  surfaceType?: string;
  surface_type?: string;
  sourceUrl?: string;
  source_url?: string;
};

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const isDryRun      = process.argv.includes('--dry-run');
const limitArg      = process.argv.find((a) => a.startsWith('--limit='));
const typeArg       = process.argv.find((a) => a.startsWith('--surface-type='));
const entityArg     = process.argv.find((a) => a.startsWith('--entity-id='));
const limit         = limitArg   ? parseInt(limitArg.split('=')[1], 10) : 50;
const surfaceType   = typeArg    ? typeArg.split('=')[1]                : undefined;
const entityId      = entityArg  ? entityArg.split('=')[1]             : undefined;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('📥 Merchant Surface Fetch Pass\n');

  if (isDryRun) console.log('🏃 DRY RUN — no rows will be written\n');
  if (surfaceType) console.log(`   surface type filter: ${surfaceType}\n`);

  const rows = await findDiscoveredSurfaces({ limit, surfaceType, entityId });

  if (rows.length === 0) {
    console.log('No discovered surfaces to fetch.');
    return;
  }

  console.log(`Found ${rows.length} discovered surface${rows.length !== 1 ? 's' : ''} to fetch\n`);

  let written = 0;
  let deduped = 0;
  let failed  = 0;

  for (const row of rows) {
    const compat = row as SurfaceRowCompat;
    const surfaceTypeLabel = compat.surfaceType ?? compat.surface_type ?? 'unknown';
    const sourceUrl = compat.sourceUrl ?? compat.source_url ?? '';
    const label = `  [${surfaceTypeLabel}] ${String(sourceUrl).slice(0, 72)}`;
    process.stdout.write(`${label} … `);

    if (isDryRun) {
      console.log('[dry-run skipped]');
      continue;
    }

    try {
      const result = await fetchAndCaptureSurface(row);
      switch (result) {
        case 'written': console.log('✓ captured');  written++; break;
        case 'deduped': console.log('↩ deduped');   deduped++; break;
        case 'failed':  console.log('✗ failed');    failed++;  break;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`✗ error — ${message}`);
      failed++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Fetch pass complete`);
  console.log(`   Surfaces processed : ${rows.length}`);
  console.log(`   Captured (new rows) : ${written}`);
  console.log(`   Deduped (skipped)   : ${deduped}`);
  console.log(`   Failed              : ${failed}`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
