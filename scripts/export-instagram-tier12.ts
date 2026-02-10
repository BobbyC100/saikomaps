#!/usr/bin/env node
/**
 * Export Tier 1/2 Places Missing Instagram (LA County)
 * 
 * Focuses on high-quality sources only:
 * - Tier 1: Founder picks, Eater lists, verified sources
 * - Tier 2: Editorial sources, established guides
 * 
 * Usage: npm run export:instagram:tier12
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function exportTier12Instagram() {
  console.log('📸 Exporting Tier 1/2 places missing Instagram (LA County)\n');
  
  // Get Tier 1/2 places in LA County without Instagram
  const places = await prisma.golden_records.findMany({
    where: {
      county: 'Los Angeles',
      instagram_handle: null, // Only truly missing (not marked as NONE)
      google_place_id: { not: null }, // Need for auto-linking
      lifecycle_status: 'ACTIVE', // Only active places
      provenance: {
        some: {
          source_tier: {
            in: [1, 2] // Tier 1 or 2 only
          }
        }
      }
    },
    select: {
      name: true,
      neighborhood: true,
      address_street: true,
      category: true,
      google_place_id: true,
      provenance: {
        select: {
          source_tier: true,
          source_name: true,
        },
        orderBy: {
          source_tier: 'asc' // Best tier first
        },
        take: 1
      }
    },
    orderBy: { name: 'asc' }
  });
  
  console.log(`Found ${places.length} Tier 1/2 LA County places missing Instagram\n`);
  
  if (places.length === 0) {
    console.log('✅ All Tier 1/2 places have Instagram handles!');
    return;
  }
  
  // Generate CSV
  const headers = 'Name,Neighborhood,Category,Address,GooglePlaceID,SourceTier,SourceName';
  const rows = places.map(p => {
    const name = (p.name || '').replace(/"/g, '""');
    const neighborhood = (p.neighborhood || '').replace(/"/g, '""');
    const category = (p.category || '').replace(/"/g, '""');
    const address = (p.address_street || '').replace(/"/g, '""');
    const gid = p.google_place_id || '';
    const tier = p.provenance[0]?.source_tier || '';
    const source = (p.provenance[0]?.source_name || '').replace(/"/g, '""');
    
    return `"${name}","${neighborhood}","${category}","${address}",${gid},${tier},"${source}"`;
  });
  
  const csv = [headers, ...rows].join('\n');
  const outputPath = 'data/instagram-tier12-missing.csv';
  
  writeFileSync(outputPath, csv, 'utf-8');
  
  console.log(`✅ Exported to: ${outputPath}\n`);
  
  // Show tier breakdown
  const tier1 = places.filter(p => p.provenance[0]?.source_tier === 1).length;
  const tier2 = places.filter(p => p.provenance[0]?.source_tier === 2).length;
  
  console.log('📊 Breakdown:');
  console.log(`   Tier 1 (founder/verified): ${tier1}`);
  console.log(`   Tier 2 (editorial): ${tier2}`);
  console.log(`   Total: ${places.length}`);
  
  console.log('\n📝 Next steps:');
  console.log('   1. npm run find:instagram:tier12');
  console.log('   2. Review data/instagram-tier12-suggestions.csv');
  console.log('   3. Ingest via npm run ingest:csv');
}

async function main() {
  try {
    await exportTier12Instagram();
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
