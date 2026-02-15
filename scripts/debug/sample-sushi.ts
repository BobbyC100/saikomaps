/**
 * Sushi Sample Script
 * 
 * Purpose: Extract real LA sushi/Japanese places for manual taxonomy validation
 * before implementing full cuisine backfill logic.
 * 
 * Query: Ranked places matching Japanese/sushi keywords
 * Output: Console table + CSV for spreadsheet analysis
 * 
 * Usage: npx tsx scripts/debug/sample-sushi.ts
 */

import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { requireActiveCityId } from '@/lib/active-city';

interface SushiPlace {
  id: string;
  name: string;
  neighborhood: string | null;
  category: string | null;
  cuisineType: string | null;
  ranking_score: number | null;
  priceLevel: number | null;
}

function toCSV(rows: SushiPlace[]): string {
  const header = ['id', 'name', 'neighborhood', 'category', 'cuisineType', 'ranking_score', 'priceLevel'];
  const lines = [header.join(',')];
  
  for (const r of rows) {
    const row = [
      r.id,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.neighborhood || '').replace(/"/g, '""')}"`,
      `"${(r.category || '').replace(/"/g, '""')}"`,
      `"${(r.cuisineType || '').replace(/"/g, '""')}"`,
      r.ranking_score || '',
      r.priceLevel || '',
    ];
    lines.push(row.join(','));
  }
  
  return lines.join('\n');
}

function formatTable(rows: SushiPlace[]): void {
  console.log('\n┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ SUSHI/JAPANESE PLACES SAMPLE — Ranked Places Only (ranking_score > 0)                                                          │');
  console.log('└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');
  
  // Header
  console.log(
    'ID'.padEnd(8) +
    'NAME'.padEnd(35) +
    'NEIGHBORHOOD'.padEnd(25) +
    'CATEGORY'.padEnd(15) +
    'CUISINE_TYPE'.padEnd(15) +
    'SCORE'.padEnd(8) +
    'PRICE'
  );
  console.log('─'.repeat(140));
  
  // Rows
  for (const place of rows) {
    const id = place.id.substring(0, 8);
    const name = (place.name || '').substring(0, 33);
    const neighborhood = (place.neighborhood || '—').substring(0, 23);
    const category = (place.category || '—').substring(0, 13);
    const cuisineType = (place.cuisineType || '—').substring(0, 13);
    const score = place.ranking_score?.toFixed(1) || '—';
    const price = place.priceLevel ? '$'.repeat(place.priceLevel) : '—';
    
    console.log(
      id.padEnd(8) +
      name.padEnd(35) +
      neighborhood.padEnd(25) +
      category.padEnd(15) +
      cuisineType.padEnd(15) +
      score.padEnd(8) +
      price
    );
  }
  
  console.log('─'.repeat(140));
  console.log(`\nTotal: ${rows.length} places\n`);
}

async function main() {
  console.log('🍣 Sampling sushi/Japanese places from database...\n');
  
  const cityId = await requireActiveCityId();
  
  // Query: ranked places matching Japanese/sushi keywords
  const places = await db.$queryRawUnsafe<SushiPlace[]>(
    `
    SELECT 
      id,
      name,
      neighborhood,
      category,
      cuisine_type as "cuisineType",
      ranking_score,
      price_level as "priceLevel"
    FROM places
    WHERE city_id = $1
      AND ranking_score > 0
      AND (
        category ILIKE '%japanese%' 
        OR category ILIKE '%sushi%'
        OR cuisine_type ILIKE '%sushi%'
        OR cuisine_type ILIKE '%japanese%'
        OR name ILIKE '%sushi%'
        OR name ILIKE '%ramen%'
      )
    ORDER BY ranking_score DESC
    LIMIT 25
    `,
    cityId
  );
  
  if (places.length === 0) {
    console.log('❌ No sushi/Japanese places found matching criteria');
    return;
  }
  
  // Console output
  formatTable(places);
  
  // CSV output
  const outDir = path.join(process.cwd(), 'scripts', 'debug', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  
  const csvPath = path.join(outDir, 'sushi-sample.csv');
  fs.writeFileSync(csvPath, toCSV(places), 'utf8');
  
  console.log('✅ Output saved:', csvPath);
  console.log('\n📋 Next steps:');
  console.log('   1. Review the sample data above');
  console.log('   2. Open CSV in spreadsheet for manual classification');
  console.log('   3. Draft inference rules based on patterns');
  console.log('   4. Implement cuisine backfill logic\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
