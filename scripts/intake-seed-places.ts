/**
 * Fields v2: Seed Re-Intake — observed_claims from exports/seed-places.csv
 *
 * Creates observed_claims for every attribute present in the Phase 0 seed CSV,
 * establishing a clean v2 claim audit trail for the seed population.
 *
 * Run AFTER:
 *   1. seed-fields-v2-registries.ts
 *   2. populate-canonical-state.ts  (creates canonical_entity_state rows first;
 *      canonical_sanctions FKs to canonical_entity_state so CES must exist)
 *
 * Entities must already exist in the DB. This script does NOT create entities.
 *
 * Usage:
 *   npx tsx scripts/intake-seed-places.ts
 *   npx tsx scripts/intake-seed-places.ts --dry-run
 *   npx tsx scripts/intake-seed-places.ts --limit=10
 *   npx tsx scripts/intake-seed-places.ts --verbose
 */

import { PrismaClient } from '@prisma/client';
import { writeClaimAndSanction } from '../lib/fields-v2/write-claim';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

const db = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const LIMIT = (() => {
  const a = process.argv.find((x) => x.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1]) : undefined;
})();

const SOURCE_SEED = 'saiko_seed';
const SOURCE_GOOGLE = 'google_places';

interface SeedRow {
  id: string;
  slug: string;
  name: string;
  website: string;
  google_place_id: string;
  instagram: string;
  neighborhood: string;
}

async function main() {
  console.log(`\n[intake-seed-places] Starting${DRY_RUN ? ' (DRY RUN)' : ''}...`);
  if (LIMIT) console.log(`[intake-seed-places] Limit: ${LIMIT}`);

  const csvPath = path.join(process.cwd(), 'exports/seed-places.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`[intake-seed-places] FATAL: ${csvPath} not found`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse<SeedRow>(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    parsed.errors.slice(0, 3).forEach((e) => console.warn('[intake-seed-places] CSV warn:', e));
  }

  const rows = LIMIT ? parsed.data.slice(0, LIMIT) : parsed.data;
  console.log(`[intake-seed-places] ${rows.length} rows to process`);

  let skippedNoEntity = 0;
  let skippedNoCES = 0;
  let errored = 0;
  let claimsAttempted = 0;
  let claimsSanctioned = 0;
  let claimsStoredOnly = 0;
  let claimsConflicted = 0;
  const byAttr: Record<string, number> = {};
  let unknownSlugs = 0;

  for (const row of rows) {
    const { id, slug, name, website, google_place_id, instagram, neighborhood } = row;

    if (!id || !slug || !name) {
      errored++;
      continue;
    }

    if (slug.startsWith('unknown-')) unknownSlugs++;

    // Entity must exist
    const entity = await db.entities.findUnique({ where: { id }, select: { id: true } });
    if (!entity) {
      if (VERBOSE) console.log(`  [SKIP] no entity: ${slug}`);
      skippedNoEntity++;
      continue;
    }

    // canonical_entity_state must exist (canonical_sanctions FKs to it)
    const ces = await db.canonical_entity_state.findUnique({
      where: { entity_id: id },
      select: { entity_id: true },
    });
    if (!ces) {
      if (VERBOSE) console.log(`  [SKIP] no canonical_entity_state: ${slug} — run populate-canonical-state.ts first`);
      skippedNoCES++;
      continue;
    }

    if (VERBOSE) console.log(`  [PROCESS] ${slug}`);

    // Attribute list — name first so CES always exists before any sanction is created.
    const attrs: { key: string; val: string; src: string; method: 'IMPORT' | 'API'; conf: number; res: 'SLUG_EXACT' | 'GOOGLE_PLACE_ID_EXACT' }[] = [
      { key: 'name', val: name, src: SOURCE_SEED, method: 'IMPORT', conf: 0.99, res: 'SLUG_EXACT' },
    ];
    if (google_place_id) attrs.push({ key: 'google_place_id', val: google_place_id, src: SOURCE_GOOGLE, method: 'API', conf: 1.0, res: 'GOOGLE_PLACE_ID_EXACT' });
    if (website)         attrs.push({ key: 'website',         val: website,         src: SOURCE_SEED, method: 'IMPORT', conf: 0.85, res: 'SLUG_EXACT' });
    if (instagram)       attrs.push({ key: 'instagram',       val: instagram,       src: SOURCE_SEED, method: 'IMPORT', conf: 0.85, res: 'SLUG_EXACT' });
    if (neighborhood)    attrs.push({ key: 'neighborhood',    val: neighborhood,    src: SOURCE_SEED, method: 'IMPORT', conf: 0.85, res: 'SLUG_EXACT' });

    for (const a of attrs) {
      try {
        claimsAttempted++;
        byAttr[a.key] = (byAttr[a.key] ?? 0) + 1;

        const r = await writeClaimAndSanction(db, {
          entityId: id,
          attributeKey: a.key,
          rawValue: a.val,
          sourceId: a.src,
          extractionMethod: a.method,
          confidence: a.conf,
          resolutionMethod: a.res,
        }, { dryRun: DRY_RUN });

        if (r.sanctioned)    claimsSanctioned++;
        else if (r.conflict) claimsConflicted++;
        else                 claimsStoredOnly++;

        if (VERBOSE) console.log(`    [${r.sanctioned ? 'SANCTIONED:' + r.sanctionMethod : r.conflict ? 'CONFLICT' : 'STORED_ONLY'}] ${a.key}`);
      } catch (err) {
        errored++;
        console.error(`  [ERROR] ${slug}/${a.key}:`, err);
      }
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('  INTAKE-SEED-PLACES SUMMARY');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Rows read:                    ${rows.length}`);
  console.log(`  Skipped (no entity):          ${skippedNoEntity}`);
  console.log(`  Skipped (no canonical_state): ${skippedNoCES}`);
  console.log(`  Rows with unknown-* slug:     ${unknownSlugs}`);
  console.log(`  Errors:                       ${errored}`);
  console.log('');
  console.log(`  Claims attempted:             ${claimsAttempted}`);
  console.log(`  Claims sanctioned:            ${claimsSanctioned}`);
  console.log(`  Claims stored-only:           ${claimsStoredOnly}`);
  console.log(`  Claims conflicted:            ${claimsConflicted}`);
  console.log('');
  console.log('  Claims by attribute:');
  for (const [k, n] of Object.entries(byAttr).sort()) {
    console.log(`    ${k.padEnd(22)} ${n}`);
  }
  if (DRY_RUN) console.log('\n  *** DRY RUN — no data written ***');
  console.log('');
}

main()
  .catch((err) => { console.error('[intake-seed-places] Fatal:', err); process.exit(1); })
  .finally(() => db.$disconnect());
