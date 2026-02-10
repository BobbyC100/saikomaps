/**
 * Export 10-20 golden_records with websites for testing menu/wine scraper
 * 
 * Usage:
 *   npx tsx scripts/export-test-websites.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function exportTestWebsites() {
  console.log('\n📊 Exporting test websites from golden_records...\n');

  // Fetch records with websites, prioritizing variety
  const records = await prisma.golden_records.findMany({
    where: {
      website: { not: null },
      county: 'Los Angeles',
      lifecycle_status: 'ACTIVE',
    },
    select: {
      canonical_id: true,
      name: true,
      slug: true,
      website: true,
      category: true,
      neighborhood: true,
      instagram_handle: true,
      vibe_tags: true,
      data_completeness: true,
    },
    orderBy: [
      { data_completeness: 'desc' },
      { name: 'asc' },
    ],
    take: 25, // Get a few extra to cherry-pick
  });

  console.log(`   Found ${records.length} records with websites\n`);

  // Look for Donna's specifically
  const donnas = records.find(r => 
    r.name.toLowerCase().includes("donna") || 
    r.slug.includes("donna")
  );

  if (donnas) {
    console.log(`   ✨ Found Donna's: ${donnas.name}\n`);
  }

  // Select diverse test set (prioritize Donna's if found)
  const testSet = [
    donnas,
    ...records.filter(r => r.canonical_id !== donnas?.canonical_id).slice(0, 19),
  ].filter(Boolean).slice(0, 20);

  // Export as JSON
  const jsonOutput = {
    exported_at: new Date().toISOString(),
    count: testSet.length,
    records: testSet,
  };

  fs.writeFileSync(
    'data/test-websites.json',
    JSON.stringify(jsonOutput, null, 2)
  );

  // Export as CSV for easy viewing
  const csvLines = [
    'name,slug,website,category,neighborhood,instagram_handle',
    ...testSet.map(r => 
      `"${r.name}","${r.slug}","${r.website}","${r.category || ''}","${r.neighborhood || ''}","${r.instagram_handle || ''}"`
    ),
  ];

  fs.writeFileSync('data/test-websites.csv', csvLines.join('\n'));

  console.log('─'.repeat(60));
  console.log('                    TEST DATASET');
  console.log('─'.repeat(60));
  
  for (const record of testSet) {
    const marker = record === donnas ? '✨' : '  ';
    console.log(`${marker} ${record.name.padEnd(35)} ${record.website?.substring(0, 40)}`);
  }

  console.log('\n📁 Exported to:');
  console.log('   - data/test-websites.json (full data)');
  console.log('   - data/test-websites.csv (spreadsheet view)');
  console.log('\n✅ Done!\n');

  await prisma.$disconnect();
}

exportTestWebsites().catch(async (error) => {
  console.error('\n❌ Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
