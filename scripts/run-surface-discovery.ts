#!/usr/bin/env node
/**
 * run-surface-discovery.ts
 * SKAI-WO-FIELDS-INGESTION-FOUNDATION-001
 *
 * Runs merchant surface discovery for entities that have a website but
 * no homepage surface row yet. Writes append-only rows to merchant_surfaces.
 *
 * Pipeline placement:
 *   raw_records → resolver → canonical entity created → this script
 *
 * Usage:
 *   npx tsx scripts/run-surface-discovery.ts [--limit=N] [--entity-id=<id>] [--dry-run]
 *
 * --limit=N        Process at most N entities (default: 50)
 * --entity-id=<id> Target a single entity by ID
 * --dry-run        Print what would be discovered without writing anything
 */

import { config } from 'dotenv';
config({ path: '.env' });
// Respect db-local.sh / db-neon.sh wrappers: if SAIKO_DB_FROM_WRAPPER is set,
// the wrapper has already exported DATABASE_URL — do not let .env.local clobber it.
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import {
  discoverEntitySurfaces,
  findEntitiesNeedingDiscovery,
} from '../lib/merchant-surface-discovery';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const isDryRun   = process.argv.includes('--dry-run');
const limitArg   = process.argv.find((a) => a.startsWith('--limit='));
const entityArg  = process.argv.find((a) => a.startsWith('--entity-id='));
const limit      = limitArg  ? parseInt(limitArg.split('=')[1], 10)  : 50;
const entityId   = entityArg ? entityArg.split('=')[1]               : undefined;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🔍 Merchant Surface Discovery\n');

  if (isDryRun) {
    console.log('🏃 DRY RUN — no rows will be written\n');
  }

  const entities = await findEntitiesNeedingDiscovery({ limit, entityId });

  if (entities.length === 0) {
    console.log('No entities need surface discovery (all already have a homepage surface row).');
    return;
  }

  console.log(`Found ${entities.length} entities needing discovery\n`);

  let succeeded = 0;
  let failed    = 0;
  let totalSurfaces = 0;

  for (const entity of entities) {
    process.stdout.write(`  ${entity.name} (${entity.id.slice(0, 8)}…) ${entity.website} … `);

    if (isDryRun) {
      console.log('[dry-run skipped]');
      continue;
    }

    try {
      const result = await discoverEntitySurfaces(entity.id, entity.website);

      if (result.homepageStatus === 'fetch_success') {
        const found = result.discoveredSurfaces.length;
        const types = [...new Set(result.discoveredSurfaces.map((s) => s.surfaceType))].join(', ');
        console.log(`✓ homepage fetched · ${found} surface${found !== 1 ? 's' : ''} discovered${types ? `: ${types}` : ''}`);
        succeeded++;
        totalSurfaces += found + 1; // +1 for homepage
      } else {
        console.log(`✗ fetch failed — ${result.error ?? 'unknown'}`);
        failed++;
        totalSurfaces += 1; // failed homepage row still written
      }
    } catch (err: any) {
      console.log(`✗ unexpected error — ${err?.message ?? err}`);
      failed++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Discovery complete`);
  console.log(`   Entities processed : ${entities.length}`);
  console.log(`   Homepage succeeded  : ${succeeded}`);
  console.log(`   Homepage failed     : ${failed}`);
  console.log(`   Surface rows written: ${totalSurfaces}`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
