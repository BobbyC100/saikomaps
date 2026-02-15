/**
 * All Ranked Places Sample
 * 
 * Purpose: Extract ALL ranked LA places for comprehensive taxonomy validation
 * Shows actual distribution of categories and cuisine types in production data
 * 
 * Output: CSV with all ranked places for manual classification
 * 
 * Usage: npx tsx scripts/debug/sample-all-ranked.ts
 */

import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { requireActiveCityId } from '@/lib/active-city';

interface RankedPlace {
  id: string;
  name: string;
  neighborhood: string | null;
  category: string | null;
  cuisineType: string | null;
  ranking_score: number | null;
  priceLevel: number | null;
}

function toCSV(rows: RankedPlace[]): string {
  const header = ['id', 'name', 'neighborhood', 'category', 'cuisineType', 'ranking_score', 'priceLevel', 'proposed_primary', 'proposed_secondary', 'notes'];
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
      '', // proposed_primary (for manual entry)
      '', // proposed_secondary (for manual entry)
      '', // notes (for manual entry)
    ];
    lines.push(row.join(','));
  }
  
  return lines.join('\n');
}

async function main() {
  console.log('📊 Sampling ALL ranked places for taxonomy validation...\n');
  
  const cityId = await requireActiveCityId();
  
  // Query: ALL ranked places
  const places = await db.$queryRawUnsafe<RankedPlace[]>(
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
    ORDER BY ranking_score DESC, name ASC
    `,
    cityId
  );
  
  console.log(`✅ Found ${places.length} ranked places\n`);
  
  // Stats
  const byCategory = new Map<string, number>();
  const byCuisine = new Map<string, number>();
  
  places.forEach(p => {
    const cat = p.category || 'NULL';
    const cui = p.cuisineType || 'NULL';
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
    byCuisine.set(cui, (byCuisine.get(cui) || 0) + 1);
  });
  
  console.log('📈 Distribution Summary:');
  console.log('─────────────────────────────────────');
  console.log('\nBy Category:');
  Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(20)}: ${count}`);
    });
  
  console.log('\nBy Cuisine Type (current):');
  Array.from(byCuisine.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([cui, count]) => {
      console.log(`  ${cui.padEnd(20)}: ${count}`);
    });
  
  // CSV output
  const outDir = path.join(process.cwd(), 'scripts', 'debug', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  
  const csvPath = path.join(outDir, 'all-ranked-places.csv');
  fs.writeFileSync(csvPath, toCSV(places), 'utf8');
  
  console.log('\n✅ Output saved:', csvPath);
  console.log('\n📋 CSV includes 3 empty columns for manual classification:');
  console.log('   - proposed_primary: Your canonical cuisine');
  console.log('   - proposed_secondary: Supporting cuisines (comma-separated)');
  console.log('   - notes: Any observations for inference rules\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
