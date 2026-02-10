/**
 * Fix County Tags for Mis-Categorized Records
 * 
 * Corrects the 43 records marked as "Los Angeles" but actually in:
 * - Denver, Colorado
 * - Hawaii
 * - Baja California, Mexico
 * - Santa Barbara County
 * - Palm Beach, Florida
 * 
 * Usage:
 *   npx tsx scripts/fix-county-tags.ts --dry-run
 *   npx tsx scripts/fix-county-tags.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

interface CountyFix {
  county: string;
  condition: any;
  description: string;
}

const fixes: CountyFix[] = [
  {
    county: 'Denver',
    condition: {
      lat: { gte: 39.6, lte: 39.9 },
      lng: { gte: -105.1, lte: -104.8 },
    },
    description: 'Denver, Colorado restaurants',
  },
  {
    county: 'Honolulu',
    condition: {
      lat: { gte: 21.2, lte: 21.7 },
      lng: { gte: -158.2, lte: -157.7 },
    },
    description: 'Hawaii (Honolulu/Oahu) restaurants',
  },
  {
    county: 'Baja California',
    condition: {
      lat: { gte: 31.8, lte: 32.2 },
      lng: { gte: -116.8, lte: -116.5 },
    },
    description: 'Baja California, Mexico (Valle de Guadalupe/Ensenada)',
  },
  {
    county: 'Santa Barbara',
    condition: {
      lat: { gte: 34.4, lte: 34.8 },
      lng: { gte: -120.3, lte: -119.2 },
    },
    description: 'Santa Barbara County (Ojai, Los Alamos)',
  },
  {
    county: 'Palm Beach',
    condition: {
      lat: { gte: 26.6, lte: 26.8 },
      lng: { gte: -80.1, lte: -80.0 },
    },
    description: 'Palm Beach, Florida',
  },
  {
    county: 'Riverside',
    condition: {
      lat: { gte: 33.8, lte: 33.9 },
      lng: { gte: -116.6, lte: -116.4 },
    },
    description: 'Palm Springs area (Riverside County)',
  },
  {
    county: 'Orange',
    condition: {
      lat: { gte: 33.6, lte: 33.8 },
      lng: { gte: -117.9, lte: -117.7 },
    },
    description: 'Orange County (border area)',
  },
];

async function fixCountyTags() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       SAIKO MAPS — COUNTY TAG CORRECTOR                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE — No database updates will be made\n');
  }

  let totalFixed = 0;

  for (const fix of fixes) {
    console.log(`\n📍 ${fix.description}`);
    console.log(`   Target county: ${fix.county}`);

    // Find records matching this condition
    const records = await prisma.golden_records.findMany({
      where: {
        county: 'Los Angeles',
        lat: { not: 0 },
        lng: { not: 0 },
        ...fix.condition,
      },
      select: {
        canonical_id: true,
        name: true,
        lat: true,
        lng: true,
      },
    });

    console.log(`   Found: ${records.length} records`);

    if (records.length > 0) {
      // Show first few
      records.slice(0, 3).forEach(r => {
        console.log(`      - ${r.name} (${r.lat}, ${r.lng})`);
      });
      if (records.length > 3) {
        console.log(`      ... and ${records.length - 3} more`);
      }

      // Update
      if (!isDryRun) {
        const result = await prisma.golden_records.updateMany({
          where: {
            canonical_id: { in: records.map(r => r.canonical_id) },
          },
          data: {
            county: fix.county,
            updated_at: new Date(),
          },
        });
        console.log(`   ✅ Updated ${result.count} records`);
        totalFixed += result.count;
      } else {
        console.log(`   🔍 Would update ${records.length} records`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('                         SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   ${isDryRun ? 'Would fix' : 'Fixed'}: ${totalFixed} records`);
  console.log('═'.repeat(60) + '\n');

  await prisma.$disconnect();
}

fixCountyTags().catch(async (error) => {
  console.error('\n❌ Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
