#!/usr/bin/env node
/**
 * Audit entities below the description minimum-data gate.
 *
 * Produces:
 * - terminal summary
 * - JSON report with per-entity missing inputs
 * - CSV report for operational backlog tracking
 *
 * Usage:
 *   npx tsx scripts/audit-description-below-gate.ts --limit=500
 *   npx tsx scripts/audit-description-below-gate.ts --place="Buvons"
 *   npx tsx scripts/audit-description-below-gate.ts --reprocess --limit=1000
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  loadEnv({ path: '.env.local', override: true });
}

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  fetchRecordsForDescriptionGeneration,
  selectTier,
  type EntityDescriptionRecord,
} from '../lib/voice-engine-v2/description-extraction';

interface CliArgs {
  limit: number;
  placeName: string | null;
  reprocess: boolean;
  allowCategoryOnly: boolean;
}

interface BacklogRow {
  entityId: string;
  name: string;
  missing_surfaces: boolean;
  missing_identity_signals: boolean;
  missing_category_context: boolean;
  has_category: boolean;
  has_neighborhood: boolean;
  missing_inputs: string[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | null => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.split('=').slice(1).join('=') : null;
  };

  const limitRaw = Number.parseInt(getArg('limit') ?? '', 10);

  return {
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 500,
    placeName: getArg('place'),
    reprocess: args.includes('--reprocess'),
    allowCategoryOnly: args.includes('--allow-category-only'),
  };
}

function hasSurfaceText(record: EntityDescriptionRecord): boolean {
  return record.surfaces.some((s) => Array.isArray(s.textBlocks) && s.textBlocks.length > 0);
}

function hasIdentitySignals(record: EntityDescriptionRecord): boolean {
  return !!record.identitySignals && Object.keys(record.identitySignals).length > 0;
}

function hasCategoryContext(record: EntityDescriptionRecord): boolean {
  return !!(record.category && record.neighborhood);
}

function toBacklogRow(record: EntityDescriptionRecord): BacklogRow {
  const hasSurfaces = hasSurfaceText(record);
  const hasIdentity = hasIdentitySignals(record);
  const hasContext = hasCategoryContext(record);

  const missing: string[] = [];
  if (!hasSurfaces) missing.push('merchant_surfaces');
  if (!hasIdentity) missing.push('identity_signals');
  if (!hasContext) {
    if (!record.category) missing.push('category');
    if (!record.neighborhood) missing.push('neighborhood');
  }

  return {
    entityId: record.id,
    name: record.name,
    missing_surfaces: !hasSurfaces,
    missing_identity_signals: !hasIdentity,
    missing_category_context: !hasContext,
    has_category: !!record.category,
    has_neighborhood: !!record.neighborhood,
    missing_inputs: missing,
  };
}

function writeReports(rows: BacklogRow[]) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(process.cwd(), 'data', 'reports');
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, `description-below-gate-${ts}.json`);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: rows.length,
        rows,
      },
      null,
      2
    )
  );

  const csvPath = path.join(outDir, `description-below-gate-${ts}.csv`);
  const header = [
    'entity_id',
    'name',
    'missing_surfaces',
    'missing_identity_signals',
    'missing_category_context',
    'has_category',
    'has_neighborhood',
    'missing_inputs',
  ];
  const lines = rows.map((r) =>
    [
      r.entityId,
      `"${r.name.replace(/"/g, '""')}"`,
      String(r.missing_surfaces),
      String(r.missing_identity_signals),
      String(r.missing_category_context),
      String(r.has_category),
      String(r.has_neighborhood),
      `"${r.missing_inputs.join('|')}"`,
    ].join(',')
  );
  fs.writeFileSync(csvPath, [header.join(','), ...lines].join('\n'));

  return { jsonPath, csvPath };
}

async function main() {
  const args = parseArgs();
  const prisma = new PrismaClient();

  try {
    console.log('\n🧪 Description Below-Gate Audit');
    console.log('==========================================');
    console.log(`🔸 Limit: ${args.limit}`);
    if (args.placeName) console.log(`🔸 Place filter: ${args.placeName}`);
    if (args.reprocess) console.log('🔸 Reprocess mode enabled');
    if (args.allowCategoryOnly) console.log('🔸 Category-only fallback: enabled');
    console.log('');

    const records = await fetchRecordsForDescriptionGeneration(prisma, {
      limit: args.limit,
      placeName: args.placeName ?? undefined,
      reprocess: args.reprocess,
    });

    const belowGate = records
      .filter((r) => {
        const tier = selectTier(r).tier;
        if (tier !== null) return false;
        if (!args.allowCategoryOnly) return true;
        // Mirrors generate-descriptions --allow-category-only behavior:
        // if no tier selected, but category exists and identity is empty, Tier 3 can still run.
        const hasNoIdentity = !r.identitySignals || Object.keys(r.identitySignals).length === 0;
        return !(hasNoIdentity && !!r.category);
      })
      .map(toBacklogRow)
      .sort((a, b) => a.name.localeCompare(b.name));

    const byMissing = {
      merchant_surfaces: belowGate.filter((r) => r.missing_surfaces).length,
      identity_signals: belowGate.filter((r) => r.missing_identity_signals).length,
      category_context: belowGate.filter((r) => r.missing_category_context).length,
      missing_category_only: belowGate.filter((r) => !r.has_category).length,
      missing_neighborhood_only: belowGate.filter((r) => !r.has_neighborhood).length,
    };

    const { jsonPath, csvPath } = writeReports(belowGate);

    console.log('==========================================');
    console.log('Below-Gate Summary');
    console.log('==========================================');
    console.log(`Records evaluated:          ${records.length}`);
    console.log(`Below minimum data gate:    ${belowGate.length}`);
    console.log('');
    console.log('Missing-input counts:');
    console.log(`  merchant_surfaces:        ${byMissing.merchant_surfaces}`);
    console.log(`  identity_signals:         ${byMissing.identity_signals}`);
    console.log(`  category_context:         ${byMissing.category_context}`);
    console.log(`  missing category:         ${byMissing.missing_category_only}`);
    console.log(`  missing neighborhood:     ${byMissing.missing_neighborhood_only}`);
    console.log('');
    console.log(`JSON report: ${jsonPath}`);
    console.log(`CSV report:  ${csvPath}`);

    if (belowGate.length > 0) {
      console.log('\nSample (first 10):');
      for (const row of belowGate.slice(0, 10)) {
        console.log(`  - ${row.name} [${row.entityId}] :: missing ${row.missing_inputs.join(', ')}`);
      }
    }

    console.log('\n==========================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

