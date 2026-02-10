#!/usr/bin/env node
/**
 * Merge Instagram Handles to Golden Records
 * 
 * Updates golden_records with Instagram handles from linked raw_records
 * using simple survivorship: prefer non-null values
 * 
 * Usage: npm run merge:instagram
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔗 Merging Instagram handles to golden_records\n');
  
  // Get all golden_records missing Instagram
  const goldenRecords = await prisma.golden_records.findMany({
    where: {
      instagram_handle: null,
    },
    include: {
      entity_links: {
        where: { is_active: true },
        include: {
          raw_record: true,
        },
      },
    },
  });
  
  console.log(`Found ${goldenRecords.length} golden_records without Instagram\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const golden of goldenRecords) {
    // Find any linked raw_record with Instagram
    const rawWithInstagram = golden.entity_links.find(link => {
      const rawJson = link.raw_record.raw_json as any;
      return rawJson?.instagram_handle;
    });
    
    if (rawWithInstagram) {
      const rawJson = rawWithInstagram.raw_record.raw_json as any;
      const instagram = rawJson.instagram_handle;
      
      // Remove @ prefix if present
      const cleanHandle = instagram.startsWith('@') ? instagram.slice(1) : instagram;
      
      await prisma.golden_records.update({
        where: { canonical_id: golden.canonical_id },
        data: {
          instagram_handle: cleanHandle,
          updated_at: new Date(),
        },
      });
      
      updated++;
      console.log(`✓ ${golden.name} → @${cleanHandle}`);
      
      if (updated % 25 === 0) {
        console.log(`Progress: ${updated} updated...`);
      }
    } else {
      skipped++;
    }
  }
  
  console.log(`\n✅ Merge complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (no Instagram in raw): ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
