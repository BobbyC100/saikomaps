/**
 * Cuisine Backfill Script
 * 
 * Backfills cuisinePrimary for ranked places using deterministic rules.
 * 
 * Rules:
 * - Only operates on ranked places (rankingScore > 0)
 * - Uses name-based patterns + category signals
 * - Deterministic, no ML
 * - Preserves existing cuisinePrimary if set
 * 
 * Usage:
 *   npx tsx scripts/backfill-cuisine-primary.ts          # Dry run
 *   npx tsx scripts/backfill-cuisine-primary.ts --execute # Execute
 */

import { db } from '@/lib/db';
import { requireActiveCityId } from '@/lib/active-city';
import { inferPrimary, isValidPrimary, CUISINE_PRIMARY } from '@/lib/taxonomy/cuisine';

interface Place {
  id: string;
  name: string;
  category: string | null;
  cuisineType: string | null;
  cuisinePrimary: string | null;
  rankingScore: number | null;
}

async function main() {
  const execute = process.argv.includes('--execute');
  
  console.log('🍽️  Backfilling cuisinePrimary for ranked places...');
  console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY RUN'}\n`);
  
  const cityId = await requireActiveCityId();
  
  // Fetch ranked places
  const places = await db.places.findMany({
    where: {
      cityId,
      rankingScore: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      category: true,
      cuisineType: true,
      cuisinePrimary: true,
      rankingScore: true,
    },
    orderBy: {
      rankingScore: 'desc',
    },
  });
  
  console.log(`Total ranked places: ${places.length}\n`);
  
  let updated = 0;
  let alreadySet = 0;
  let noInference = 0;
  let skipped = 0;
  
  const cuisineDistribution = new Map<string, number>();
  
  for (const place of places) {
    // Skip if already has cuisinePrimary
    if (place.cuisinePrimary) {
      console.log(`⏭️  ${place.name}: Already set (${place.cuisinePrimary})`);
      alreadySet++;
      cuisineDistribution.set(place.cuisinePrimary, (cuisineDistribution.get(place.cuisinePrimary) || 0) + 1);
      continue;
    }
    
    // Try to infer
    const inferred = inferPrimary({
      name: place.name,
      category: place.category,
      cuisineType: place.cuisineType,
    });
    
    if (!inferred) {
      console.log(`⚠️  ${place.name}: Could not infer (score: ${place.rankingScore})`);
      noInference++;
      continue;
    }
    
    // Validate
    if (!isValidPrimary(inferred)) {
      console.log(`❌ ${place.name}: Invalid inference "${inferred}" (skipping)`);
      skipped++;
      continue;
    }
    
    console.log(`✅ ${place.name}: ${inferred} (score: ${place.rankingScore})`);
    cuisineDistribution.set(inferred, (cuisineDistribution.get(inferred) || 0) + 1);
    
    if (execute) {
      await db.places.update({
        where: { id: place.id },
        data: { cuisinePrimary: inferred },
      });
      updated++;
    } else {
      updated++; // Count what would be updated
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ To update: ${updated}`);
  console.log(`⏭️  Already set: ${alreadySet}`);
  console.log(`⚠️  No inference: ${noInference}`);
  console.log(`❌ Skipped (invalid): ${skipped}`);
  console.log(`📊 Total: ${places.length}`);
  
  console.log(`\n=== Cuisine Distribution (Primary) ===`);
  const sortedCuisines = Array.from(cuisineDistribution.entries())
    .sort((a, b) => b[1] - a[1]);
  
  for (const [cuisine, count] of sortedCuisines) {
    const bar = '█'.repeat(Math.min(count, 50));
    console.log(`${cuisine.padEnd(20)}: ${bar} (${count})`);
  }
  
  console.log(`\n=== Coverage ===`);
  const totalClassified = alreadySet + updated;
  const coveragePercent = Math.round((totalClassified / places.length) * 100);
  console.log(`Classified: ${totalClassified}/${places.length} (${coveragePercent}%)`);
  console.log(`Unclassified: ${noInference}/${places.length} (${Math.round((noInference / places.length) * 100)}%)`);
  
  if (!execute) {
    console.log('\n⚠️  DRY RUN - Use --execute to save changes');
  } else {
    console.log('\n✅ Cuisine primaries saved to database');
  }
  
  console.log(`\n📋 Next Steps:`);
  console.log(`   1. Review unclassified places (${noInference} places)`);
  console.log(`   2. Add inference rules or manual classification as needed`);
  console.log(`   3. Wire cuisinePrimary into search logic`);
  console.log(`   4. Update EOS diversity to use cuisinePrimary`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
