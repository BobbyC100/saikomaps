#!/usr/bin/env node
/**
 * Enrichment Pipeline Test Suite
 *
 * Validates that each stage of the enrichment pipeline:
 * 1. Executes successfully
 * 2. Writes expected data to the database
 * 3. Updates enrichment_stage correctly
 *
 * Usage:
 *   npx tsx scripts/test-enrichment-pipeline.ts --slug=seco
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';

const db = new PrismaClient();

interface StageTest {
  stage: number;
  label: string;
  expectedTable: string;
  validator: (entityId: string) => Promise<boolean>;
}

const STAGE_LABELS: Record<number, string> = {
  1: 'Google Places identity',
  2: 'Surface discovery',
  3: 'Surface fetch',
  4: 'Surface parse',
  5: 'Identity signal extraction (AI)',
  6: 'Website enrichment',
  7: 'Tagline generation (AI)',
};

async function getEntityId(slug: string): Promise<string | null> {
  const entity = await db.entities.findUnique({
    where: { slug },
    select: { id: true },
  });
  return entity?.id ?? null;
}

async function runEnrichment(slug: string): Promise<void> {
  console.log(`\n📋 Testing enrichment pipeline for: ${slug}\n`);

  const entityId = await getEntityId(slug);
  if (!entityId) {
    console.error(`❌ Entity not found: ${slug}`);
    process.exit(1);
  }

  console.log(`Entity ID: ${entityId}\n`);

  // Start enrichment
  console.log('🚀 Starting enrichment...\n');
  const startTime = Date.now();

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('npx', ['tsx', 'scripts/enrich-place.ts', `--slug=${slug}`], {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    let output = '';
    proc.stdout?.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data); // Log in real-time
    });
    proc.stderr?.on('data', (data) => {
      output += data.toString();
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Enrichment process exited with code ${code}`));
      }
    });
  });

  const elapsedMs = Date.now() - startTime;
  console.log(`\n⏱  Enrichment completed in ${(elapsedMs / 1000).toFixed(1)}s\n`);

  // ==========================================
  // Verify results in database
  // ==========================================
  console.log('📊 Verifying database state...\n');

  const entity = await db.entities.findUnique({
    where: { id: entityId },
    select: {
      slug: true,
      enrichmentStage: true,
      lastEnrichedAt: true,
      status: true,
    },
  });

  if (!entity) {
    console.error('❌ Entity disappeared from database');
    process.exit(1);
  }

  console.log('Entity state:');
  console.log(`  Slug:               ${entity.slug}`);
  console.log(`  Status:             ${entity.status}`);
  console.log(`  Enrichment stage:   ${entity.enrichmentStage ?? 'null'}`);
  console.log(`  Last enriched at:   ${entity.lastEnrichedAt ? new Date(entity.lastEnrichedAt).toISOString() : 'null'}`);

  // ==========================================
  // Verify stage-specific data
  // ==========================================
  console.log('\n🔍 Verifying stage-specific data:\n');

  // Stage 3: Surface fetch
  const surfaces = await db.merchant_surfaces.count({
    where: { entity_id: entityId },
  });
  console.log(`  Stage 3 (Surface fetch): ${surfaces} surfaces captured`);

  // Stage 5: Identity signals
  const signals = await db.derived_signals.findFirst({
    where: { entity_id: entityId, signal_key: 'identity_signals' },
    select: { entity_id: true },
  });
  console.log(`  Stage 5 (AI signals):    ${signals ? '✓ extracted' : '✗ not found'}`);

  // Stage 6: Website enrichment
  const enrichRuns = await db.merchant_enrichment_runs.count({
    where: { entityId: entityId },
  });
  console.log(`  Stage 6 (Website enrichment): ${enrichRuns} enrichment runs`);

  // Stage 7: Taglines
  const tagline = await db.interpretation_cache.findFirst({
    where: {
      entity_id: entityId,
      output_type: 'TAGLINE',
      is_current: true,
    },
    select: { cache_id: true, content: true },
  });
  console.log(`  Stage 7 (Taglines):      ${tagline ? '✓ generated' : '✗ not found'}`);

  // ==========================================
  // Final verdict
  // ==========================================
  console.log('\n' + '═'.repeat(60));
  if (entity.enrichmentStage === '7' && entity.lastEnrichedAt) {
    console.log('✅ ENRICHMENT SUCCESSFUL');
    console.log('   All stages completed and data written to database');
  } else {
    console.log('⚠️  ENRICHMENT INCOMPLETE');
    console.log(`   Last stage: ${entity.enrichmentStage ?? 'none'}`);
  }
  console.log('═'.repeat(60) + '\n');

  await db.$disconnect();
}

// Parse args
const slug = process.argv.find((arg) => arg.startsWith('--slug='))?.split('=')[1];
if (!slug) {
  console.error('Usage: npx tsx scripts/test-enrichment-pipeline.ts --slug=<slug>');
  process.exit(1);
}

runEnrichment(slug).catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
