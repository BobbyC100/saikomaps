#!/usr/bin/env node
/**
 * Backfill Source Tiers for Provenance Records
 * 
 * Assigns tier 1-4 based on source quality:
 * - Tier 1: Bobby's personal Google Saves (highest trust)
 * - Tier 2: Top editorial sources (Eater, Infatuation, LA Times)
 * - Tier 3: Secondary editorial (Time Out, local blogs)
 * - Tier 4: Community/unverified sources
 * 
 * Usage: npm run backfill:tiers
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Source tier mapping
const SOURCE_TIERS: Record<string, number> = {
  // Tier 1: Bobby's personal curation (highest trust)
  'google_saves': 1,
  'Bobby Google Saves': 1,
  'bobby': 1,
  
  // Tier 2: Premium editorial (established, reputable)
  'editorial': 2,
  'Eater LA': 2,
  'The Infatuation': 2,
  'LA Times': 2,
  'Jonathan Gold': 2,
  
  // Tier 3: Secondary editorial (good but less rigorous)
  'Time Out LA': 3,
  'Viva The Valley': 3,
  'local': 3,
  
  // Tier 4: Unverified or community sources
  'community': 4,
  'unverified': 4,
};

// Batch-based tier assignments (for bulk imports)
const BATCH_TIERS: Record<string, number> = {
  'saiko_seed': 1,                    // Original Google Saves
  'google_saves': 1,
  'initial_import': 1,
  
  'sgv_expansion': 2,                 // Editorial research batches
  'westside_expansion': 2,
  'south_la_expansion': 2,
  'beach_cities_expansion': 2,
  'southeast_la_expansion': 2,
  'harbor_area_expansion': 2,
  'sfv_expansion': 2,
  'downtown_expansion': 2,
  'eastside_expansion': 2,
  
  'saiko_instagram_test': 2,          // Instagram backfill (AI-assisted but Bobby-approved)
  'saiko_instagram_demo': 2,
  
  'editorial_test': 3,                // Test data
  'editorial_review_test': 3,
  'editorial_queue_test': 3,
};

function inferTier(record: { source_type: string | null; source_name: string | null; import_batch: string | null }): number {
  // Try batch first
  if (record.import_batch && BATCH_TIERS[record.import_batch]) {
    return BATCH_TIERS[record.import_batch];
  }
  
  // Try source name
  if (record.source_name && SOURCE_TIERS[record.source_name]) {
    return SOURCE_TIERS[record.source_name];
  }
  
  // Try source type
  if (record.source_type && SOURCE_TIERS[record.source_type]) {
    return SOURCE_TIERS[record.source_type];
  }
  
  // Default to Tier 3 (needs review)
  return 3;
}

async function backfillTiers() {
  console.log('🔢 Backfilling source tiers for provenance records...\n');
  
  // Get all provenance records without tiers
  const records = await prisma.provenance.findMany({
    where: {
      OR: [
        { source_tier: null },
        { source_tier: 0 },
      ]
    },
    select: {
      id: true,
      source_type: true,
      source_name: true,
      import_batch: true,
    }
  });
  
  console.log(`Found ${records.length} records needing tier assignment\n`);
  
  if (records.length === 0) {
    console.log('✅ All records already have tiers assigned!');
    return;
  }
  
  // Group by tier for reporting
  const byTier: Record<number, number> = {};
  
  // Update each record
  for (const record of records) {
    const tier = inferTier(record);
    byTier[tier] = (byTier[tier] || 0) + 1;
    
    await prisma.provenance.update({
      where: { id: record.id },
      data: { source_tier: tier }
    });
  }
  
  console.log(`✅ Updated ${records.length} provenance records\n`);
  
  // Report by tier
  console.log('Breakdown by tier:');
  console.log('─'.repeat(50));
  [1, 2, 3, 4].forEach(tier => {
    const count = byTier[tier] || 0;
    if (count > 0) {
      const label = tier === 1 ? 'Tier 1 (Bobby curated)' :
                    tier === 2 ? 'Tier 2 (Premium editorial)' :
                    tier === 3 ? 'Tier 3 (Secondary editorial)' :
                    'Tier 4 (Community/unverified)';
      console.log(`  ${label}: ${count}`);
    }
  });
}

async function main() {
  try {
    await backfillTiers();
  } catch (error) {
    console.error('Error during tier backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
