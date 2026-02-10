/**
 * Saiko Maps - Provenance Backfill
 * 
 * Creates provenance records for all existing places based on their import batch.
 * Run ONCE after adding the provenance table.
 * 
 * Usage: npx ts-node scripts/backfill-provenance.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map import batches to provenance metadata
const BATCH_METADATA: Record<string, {
  addedBy: string;
  sourceType: string;
  sourceName: string;
  notes: string;
}> = {
  // Initial imports - Bobby's Google Saves
  'initial_import': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'google_saves',
    sourceName: 'Bobby Google Saves',
    notes: 'Original Saiko Maps seed data from personal Google Maps saves'
  },
  'google_saves': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'google_saves',
    sourceName: 'Bobby Google Saves',
    notes: 'Imported from personal Google Maps saves'
  },
  'saiko_seed': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'google_saves',
    sourceName: 'Bobby Google Saves',
    notes: 'Original Saiko Maps seed data'
  },
  'seed_record': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'google_saves',
    sourceName: 'Bobby Google Saves',
    notes: 'Original Saiko Maps seed data'
  },
  
  // Regional expansions - Editorial research compiled by Claude, approved by Bobby
  'sgv_expansion': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Multi-source editorial (Eater, Infatuation, LA Times)',
    notes: 'SGV expansion - editorial sources researched and compiled, imported by Bobby'
  },
  'westside_expansion': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Multi-source editorial (Eater, Infatuation, LA Times)',
    notes: 'Westside expansion - editorial sources researched and compiled, imported by Bobby'
  },
  'south_la_expansion': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Multi-source editorial (Eater, Infatuation, LA Times)',
    notes: 'South LA expansion - editorial sources researched and compiled, imported by Bobby'
  },
  'beach_cities_expansion': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Multi-source editorial (Eater, Infatuation, Time Out)',
    notes: 'Beach Cities expansion - editorial sources researched and compiled, imported by Bobby'
  },
  'southeast_la_expansion': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Multi-source editorial (Eater, Infatuation, LA Times)',
    notes: 'Southeast LA expansion - editorial sources researched and compiled, imported by Bobby'
  },
  'harbor_area_expansion': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Multi-source editorial (Eater, Infatuation, LA Times)',
    notes: 'Harbor Area expansion - editorial sources researched and compiled, imported by Bobby'
  },
  'sfv_expansion': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Multi-source editorial (Infatuation, Eater, Time Out, Viva The Valley)',
    notes: 'San Fernando Valley expansion - editorial sources researched and compiled, imported by Bobby'
  },
  'downtown_expansion': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Multi-source editorial (Eater, Infatuation, LA Times)',
    notes: 'Downtown LA expansion - editorial sources researched and compiled, imported by Bobby'
  },
  'eastside_expansion': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Multi-source editorial (Eater, Infatuation, LA Times)',
    notes: 'Eastside expansion - editorial sources researched and compiled, imported by Bobby'
  },
  
  // Instagram backfill
  'saiko_instagram_test': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Instagram backfill - AI-assisted search approved by Bobby',
    notes: 'Instagram handles found via multi-strategy search (AI + patterns), approved and imported by Bobby'
  },
  'saiko_instagram_demo': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Instagram backfill - AI-assisted search approved by Bobby',
    notes: 'Instagram handles found via multi-strategy search (AI + patterns), approved and imported by Bobby'
  },
  
  // Test records
  'editorial_test': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Test data',
    notes: 'Test records for resolver system - approved by Bobby'
  },
  'editorial_review_test': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Test data',
    notes: 'Test records for review queue - approved by Bobby'
  },
  'editorial_queue_test': {
    addedBy: 'bobby_bulk_import',
    sourceType: 'editorial',
    sourceName: 'Test data',
    notes: 'Test records for review queue - approved by Bobby'
  },
};

// Default for unknown batches
const DEFAULT_METADATA = {
  addedBy: 'bobby_bulk_import',
  sourceType: 'unknown',
  sourceName: 'Unknown - needs review',
  notes: 'Provenance backfilled - original source not recorded'
};

async function backfillProvenance() {
  console.log('🔍 Starting provenance backfill...\n');
  
  // Get all golden records
  const places = await prisma.golden_records.findMany({
    select: {
      canonical_id: true,
      name: true,
      created_at: true,
    }
  });
  
  console.log(`Found ${places.length} golden records to process\n`);
  
  // Check for existing provenance records
  const existingProvenance = await prisma.provenance.findMany({
    select: { place_id: true }
  });
  const existingPlaceIds = new Set(existingProvenance.map(p => p.place_id));
  
  console.log(`${existingPlaceIds.size} places already have provenance records\n`);
  
  // Filter to places needing provenance
  const placesNeedingProvenance = places.filter(p => !existingPlaceIds.has(p.canonical_id));
  
  if (placesNeedingProvenance.length === 0) {
    console.log('✅ All places already have provenance records!');
    return;
  }
  
  console.log(`Creating provenance for ${placesNeedingProvenance.length} places...\n`);
  
  // Get entity_links to determine import batch
  const entityLinks = await prisma.entity_links.findMany({
    where: {
      canonical_id: {
        in: placesNeedingProvenance.map(p => p.canonical_id)
      }
    },
    include: {
      raw_record: {
        select: {
          source_name: true
        }
      }
    }
  });
  
  // Map canonical_id to import batch
  const batchByCanonicalId = new Map<string, string>();
  entityLinks.forEach(link => {
    if (!batchByCanonicalId.has(link.canonical_id)) {
      batchByCanonicalId.set(link.canonical_id, link.raw_record.source_name);
    }
  });
  
  // Group by batch for reporting
  const byBatch: Record<string, number> = {};
  
  // Create provenance records
  const provenanceRecords = placesNeedingProvenance.map(place => {
    const batch = batchByCanonicalId.get(place.canonical_id) || 'unknown';
    const metadata = BATCH_METADATA[batch] || DEFAULT_METADATA;
    
    byBatch[batch] = (byBatch[batch] || 0) + 1;
    
    return {
      place_id: place.canonical_id,
      added_by: metadata.addedBy,
      source_type: metadata.sourceType,
      source_name: metadata.sourceName,
      notes: metadata.notes,
      import_batch: batch,
      created_at: place.created_at, // Preserve original timestamp
    };
  });
  
  // Batch insert
  const result = await prisma.provenance.createMany({
    data: provenanceRecords,
    skipDuplicates: true,
  });
  
  console.log(`✅ Created ${result.count} provenance records\n`);
  
  // Report by batch
  console.log('Breakdown by import batch:');
  console.log('─'.repeat(50));
  Object.entries(byBatch)
    .sort((a, b) => b[1] - a[1])
    .forEach(([batch, count]) => {
      const metadata = BATCH_METADATA[batch];
      const status = metadata ? '✓' : '⚠️';
      console.log(`  ${status} ${batch}: ${count} places`);
    });
  
  // Flag any unknowns
  const unknowns = byBatch['unknown'] || 0;
  if (unknowns > 0) {
    console.log(`\n⚠️  ${unknowns} places have unknown provenance - review needed`);
  }
}

async function main() {
  try {
    await backfillProvenance();
  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
