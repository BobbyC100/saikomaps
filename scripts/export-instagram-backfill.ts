#!/usr/bin/env node
/**
 * Instagram Backfill Export Script
 * 
 * Exports all places missing Instagram handles to a CSV file
 * with Google Place IDs for exact matching during ingestion.
 * 
 * Usage:
 *   npm run export:instagram
 *   npm run export:instagram -- data/custom-filename.csv
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function main() {
  const outputPath = process.argv[2] || 'data/instagram-backfill.csv';
  
  console.log('📥 Exporting places missing Instagram handles...\n');
  
  // Find all places without Instagram but with Google Place ID
  const places = await prisma.entities.findMany({
    where: {
      instagram: null,
      google_place_id: { not: null },
    },
    select: {
      id: true,
      name: true,
      google_place_id: true,
      latitude: true,
      longitude: true,
      address: true,
      neighborhood: true,
      phone: true,
      website: true,
    },
    orderBy: { name: 'asc' },
  });
  
  console.log(`Found ${places.length} places missing Instagram handles\n`);
  
  if (places.length === 0) {
    console.log('✅ All places have Instagram handles!');
    return;
  }
  
  // Generate CSV
  const headers = [
    'Name',
    'Instagram',
    'GooglePlaceID',
    'Latitude',
    'Longitude',
    'Address',
    'Neighborhood',
    'Phone',
    'Website',
  ];
  
  const rows = places.map((place) => [
    place.name,
    '', // Empty Instagram column to be filled in
    place.google_place_id,
    place.latitude?.toString() || '',
    place.longitude?.toString() || '',
    place.address || '',
    place.neighborhood || '',
    place.phone || '',
    place.website || '',
  ]);
  
  // Create CSV content
  const csv = [
    headers.join(','),
    ...rows.map((row) => 
      row.map((cell) => {
        // Escape cells containing commas or quotes
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ),
  ].join('\n');
  
  // Write to file
  writeFileSync(outputPath, csv, 'utf-8');
  
  console.log(`✅ Exported to: ${outputPath}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Open ${outputPath} in Excel/Sheets`);
  console.log(`   2. Fill in the Instagram column (with or without @)`);
  console.log(`   3. Save the file`);
  console.log(`   4. Run: npm run ingest:csv -- ${outputPath} saiko_instagram`);
  console.log(`   5. Run: npm run resolver:run`);
  console.log(`\n💡 Expected result: ${places.length}/${places.length} auto-linked at 100% confidence via Google Place ID`);
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
