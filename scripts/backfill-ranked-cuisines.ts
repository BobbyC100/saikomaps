/**
 * Backfill cuisineType for Ranked Places (P0 Fix)
 * 
 * Problem: 68% of ranked places have cuisineType = null or incorrect
 * Solution: Use existing Google Places metadata to deterministically assign cuisines
 * 
 * This is NOT algorithmic - it's data hygiene using existing structured data.
 * Only operates on ranked places (score > 0) to maintain EOS integrity.
 * 
 * Usage:
 *   npx tsx scripts/backfill-ranked-cuisines.ts          # Dry run
 *   npx tsx scripts/backfill-ranked-cuisines.ts --execute  # Execute
 */

import { db } from '@/lib/db';

// Deterministic mapping: Google Place Type → Cuisine Type
// Source: Google Places API primary_type and types[] fields
const CUISINE_TYPE_MAP: Record<string, string> = {
  // Asian Cuisines
  'chinese_restaurant': 'Chinese',
  'japanese_restaurant': 'Japanese',
  'sushi_restaurant': 'Sushi',
  'ramen_restaurant': 'Ramen',
  'korean_restaurant': 'Korean',
  'thai_restaurant': 'Thai',
  'vietnamese_restaurant': 'Vietnamese',
  'indian_restaurant': 'Indian',
  'asian_restaurant': 'Asian',
  
  // European Cuisines
  'italian_restaurant': 'Italian',
  'pizza_restaurant': 'Italian',
  'french_restaurant': 'French',
  'spanish_restaurant': 'Spanish',
  'greek_restaurant': 'Greek',
  'mediterranean_restaurant': 'Mediterranean',
  
  // American
  'american_restaurant': 'American',
  'hamburger_restaurant': 'American',
  'steak_house': 'American',
  'barbecue_restaurant': 'Barbecue',
  
  // Mexican & Latin
  'mexican_restaurant': 'Mexican',
  'taco_restaurant': 'Mexican',
  'latin_american_restaurant': 'Latin American',
  
  // Middle Eastern
  'middle_eastern_restaurant': 'Middle Eastern',
  'lebanese_restaurant': 'Lebanese',
  
  // Categories (not cuisines, but useful)
  'bar': 'Bar',
  'night_club': 'Bar',
  'wine_bar': 'Bar',
  'cocktail_bar': 'Bar',
  'cafe': 'Café',
  'coffee_shop': 'Café',
  'bakery': 'Bakery',
  'restaurant': 'Restaurant', // Generic fallback
};

// Name-based inference for obvious cases
// This is deterministic pattern matching, not ML
const NAME_PATTERNS: Array<{ pattern: RegExp; cuisine: string }> = [
  // Specific places (highest priority)
  { pattern: /jitlada/i, cuisine: 'Thai' },
  { pattern: /bestia/i, cuisine: 'Italian' },
  { pattern: /mozza/i, cuisine: 'Italian' },
  { pattern: /bianco/i, cuisine: 'Italian' },
  { pattern: /gwen/i, cuisine: 'American' },
  { pattern: /bavel/i, cuisine: 'Middle Eastern' },
  { pattern: /hayato/i, cuisine: 'Japanese' },
  { pattern: /n\/naka/i, cuisine: 'Japanese' },
  { pattern: /yang chow/i, cuisine: 'Chinese' },
  { pattern: /marouch/i, cuisine: 'Lebanese' },
  { pattern: /taste of tehran/i, cuisine: 'Persian' },
  { pattern: /dunsmoor/i, cuisine: 'American' },
  { pattern: /jon & vinny/i, cuisine: 'Italian' },
  { pattern: /manuela/i, cuisine: 'American' },
  { pattern: /otomisan/i, cuisine: 'Japanese' },
  { pattern: /ototo/i, cuisine: 'Japanese' },
  { pattern: /ronan/i, cuisine: 'Italian' },
  { pattern: /holbox/i, cuisine: 'Mexican' },
  { pattern: /chi spacca/i, cuisine: 'Italian' },
  { pattern: /jar/i, cuisine: 'American' },
  { pattern: /pearl river deli/i, cuisine: 'Chinese' },
  { pattern: /bridgetown roti/i, cuisine: 'Caribbean' },
  { pattern: /azay/i, cuisine: 'Mediterranean' },
  { pattern: /jade wok/i, cuisine: 'Chinese' },
  { pattern: /tsubaki/i, cuisine: 'Japanese' },
  
  // Generic patterns
  { pattern: /sushi/i, cuisine: 'Sushi' },
  { pattern: /ramen/i, cuisine: 'Ramen' },
  { pattern: /pizza/i, cuisine: 'Italian' },
  { pattern: /taco|tacos/i, cuisine: 'Mexican' },
  { pattern: /thai/i, cuisine: 'Thai' },
  { pattern: /korean|kbbq/i, cuisine: 'Korean' },
  { pattern: /chinese/i, cuisine: 'Chinese' },
  { pattern: /vietnamese|pho/i, cuisine: 'Vietnamese' },
  { pattern: /burger|burgers/i, cuisine: 'American' },
  { pattern: /bbq|barbecue/i, cuisine: 'Barbecue' },
  { pattern: /mediterranean/i, cuisine: 'Mediterranean' },
  { pattern: /indian/i, cuisine: 'Indian' },
  { pattern: /french/i, cuisine: 'French' },
  { pattern: /italian/i, cuisine: 'Italian' },
  { pattern: /mexican/i, cuisine: 'Mexican' },
  { pattern: /cafe|coffee/i, cuisine: 'Café' },
  { pattern: /bakery|boulangerie/i, cuisine: 'Bakery' },
  { pattern: /wine bar|wine shop/i, cuisine: 'Bar' },
  { pattern: /bar|tavern/i, cuisine: 'Bar' },
  { pattern: /brewery|brewing/i, cuisine: 'Bar' },
  { pattern: /oyster/i, cuisine: 'Seafood' },
  { pattern: /rotisserie/i, cuisine: 'American' },
  { pattern: /deli/i, cuisine: 'American' },
  { pattern: /taqueria/i, cuisine: 'Mexican' },
  { pattern: /tortilleria/i, cuisine: 'Mexican' },
];

function inferCuisineFromName(name: string): string | null {
  for (const { pattern, cuisine } of NAME_PATTERNS) {
    if (pattern.test(name)) {
      return cuisine;
    }
  }
  return null;
}

async function backfillRankedCuisines(options: { execute?: boolean }) {
  const { execute = false } = options;

  console.log('🍽️  Backfilling cuisineType for ranked places...');
  console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY RUN'}\n`);

  // Fetch all ranked places
  const places = await db.places.findMany({
    where: {
      rankingScore: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      cuisineType: true,
      googleTypes: true,
      googlePlacesAttributes: true,
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

  const cuisineDistribution = new Map<string, number>();

  for (const place of places) {
    // Skip if already has cuisineType (but not generic "Restaurant" or "Bar")
    if (place.cuisineType && 
        place.cuisineType !== 'Restaurant' && 
        place.cuisineType !== 'Bar' && 
        place.cuisineType !== 'Café') {
      console.log(`⏭️  ${place.name}: Already has cuisine (${place.cuisineType})`);
      alreadySet++;
      cuisineDistribution.set(place.cuisineType, (cuisineDistribution.get(place.cuisineType) || 0) + 1);
      continue;
    }

    // Try to infer from Google types array
    let inferredCuisine: string | null = null;
    
    if (Array.isArray(place.googleTypes) && place.googleTypes.length > 0) {
      for (const type of place.googleTypes) {
        const cuisine = CUISINE_TYPE_MAP[type];
        if (cuisine && cuisine !== 'Restaurant' && cuisine !== 'Bar' && cuisine !== 'Café') {
          inferredCuisine = cuisine;
          break;
        }
      }
    }

    // Try googlePlacesAttributes if available
    if (!inferredCuisine && place.googlePlacesAttributes) {
      const attrs = place.googlePlacesAttributes as any;
      if (attrs?.types && Array.isArray(attrs.types)) {
        for (const type of attrs.types) {
          const cuisine = CUISINE_TYPE_MAP[type];
          if (cuisine && cuisine !== 'Restaurant' && cuisine !== 'Bar' && cuisine !== 'Café') {
            inferredCuisine = cuisine;
            break;
          }
        }
      }
    }

    // Fallback to name-based inference
    if (!inferredCuisine) {
      inferredCuisine = inferCuisineFromName(place.name);
    }

    if (!inferredCuisine) {
      console.log(`⚠️  ${place.name}: Could not infer cuisine (score: ${place.rankingScore})`);
      noInference++;
      continue;
    }

    console.log(`✅ ${place.name}: ${inferredCuisine} (score: ${place.rankingScore})`);
    cuisineDistribution.set(inferredCuisine, (cuisineDistribution.get(inferredCuisine) || 0) + 1);

    if (execute) {
      await db.places.update({
        where: { id: place.id },
        data: { cuisineType: inferredCuisine },
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
  console.log(`📊 Total: ${places.length}`);

  console.log(`\n=== Cuisine Distribution ===`);
  const sortedCuisines = Array.from(cuisineDistribution.entries())
    .sort((a, b) => b[1] - a[1]);

  for (const [cuisine, count] of sortedCuisines) {
    const bar = '█'.repeat(Math.min(count, 50));
    console.log(`${cuisine.padEnd(20)}: ${bar} (${count})`);
  }

  if (!execute) {
    console.log('\n⚠️  DRY RUN - Use --execute to save changes');
  } else {
    console.log('\n✅ Cuisine types saved to database');
  }
}

// CLI execution
const execute = process.argv.includes('--execute');

backfillRankedCuisines({ execute })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
