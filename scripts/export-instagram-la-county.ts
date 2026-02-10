#!/usr/bin/env node
/**
 * Export LA County Places Missing Instagram
 * 
 * Creates a CSV of LA County places without Instagram handles
 * for AI-assisted backfill.
 * 
 * Usage: npm run export:instagram:la
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function exportLAInstagram() {
  console.log('📸 Exporting LA County places missing Instagram...\n');
  
  const places = await prisma.golden_records.findMany({
    where: {
      county: 'Los Angeles',
      instagram_handle: null, // Only truly missing (not marked as NONE)
      google_place_id: { not: null }, // Need Google ID for auto-linking
      lifecycle_status: 'ACTIVE', // Only active places
    },
    select: {
      name: true,
      neighborhood: true,
      address_street: true,
      category: true,
      google_place_id: true,
    },
    orderBy: { name: 'asc' }
  });
  
  console.log(`Found ${places.length} LA County places missing Instagram\n`);
  
  if (places.length === 0) {
    console.log('✅ All LA County places have Instagram handles!');
    return;
  }
  
  // Generate CSV
  const headers = 'Name,Neighborhood,Category,Address,GooglePlaceID';
  const rows = places.map(p => {
    const name = (p.name || '').replace(/"/g, '""');
    const neighborhood = (p.neighborhood || '').replace(/"/g, '""');
    const category = (p.category || '').replace(/"/g, '""');
    const address = (p.address_street || '').replace(/"/g, '""');
    const gid = p.google_place_id || '';
    
    return `"${name}","${neighborhood}","${category}","${address}",${gid}`;
  });
  
  const csv = [headers, ...rows].join('\n');
  const outputPath = 'data/instagram-la-county-missing.csv';
  
  writeFileSync(outputPath, csv, 'utf-8');
  
  console.log(`✅ Exported to: ${outputPath}\n`);
  console.log('📝 Next steps:');
  console.log('   1. npm run find:instagram:la');
  console.log('   2. Review suggestions in data/instagram-la-suggestions.csv');
  console.log('   3. Approve and import via npm run ingest:csv');
}

async function main() {
  try {
    await exportLAInstagram();
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
