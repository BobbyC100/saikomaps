#!/usr/bin/env node
/**
 * Spot check Tier 3 places (no editorial sources)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 TIER 3 SPOT CHECK (No Editorial Sources)\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get all Tier 3 places - we'll filter in memory since Json field queries are tricky
  const allPlaces = await prisma.places.findMany({
    where: {
      status: 'OPEN',
      latitude: { not: null },
      longitude: { not: null },
      latitude: { not: 0 },
      longitude: { not: 0 },
    },
    select: {
      id: true,
      name: true,
      address: true,
      neighborhood: true,
      category: true,
      website: true,
      google_types: true,
    },
  });

  // Filter to only those without editorial sources
  const tier3Places = allPlaces.filter(place => {
    if (!place.editorial_sources) return true;
    if (Array.isArray(place.editorial_sources) && place.editorial_sources.length === 0) return true;
    return false;
  });

  console.log(`Total Tier 3 places: ${tier3Places.length}\n`);

  // Analyze by category
  const byCategory = new Map<string, number>();
  for (const place of tier3Places) {
    const category = place.category || 'Uncategorized';
    byCategory.set(category, (byCategory.get(category) || 0) + 1);
  }

  console.log('BY CATEGORY:\n');
  const sortedCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  for (const [category, count] of sortedCategories) {
    const percentage = ((count / tier3Places.length) * 100).toFixed(1);
    console.log(`  ${category}: ${count} (${percentage}%)`);
  }

  // Analyze by Google types (find non-food places)
  console.log('\n\nNON-FOOD PLACES (Potential Noise):\n');
  console.log('─'.repeat(60));

  const nonFoodTypes = [
    'store', 'retail', 'gym', 'spa', 'hotel', 'lodging',
    'school', 'hospital', 'dentist', 'doctor', 'pharmacy',
    'bank', 'atm', 'post_office', 'gas_station', 'car_',
    'real_estate', 'lawyer', 'accounting', 'insurance',
    'beauty_salon', 'hair_care', 'clothing_store',
  ];

  const nonFoodPlaces = tier3Places.filter(place => {
    const types = place.google_types || [];
    return types.some(type => 
      nonFoodTypes.some(nf => type.toLowerCase().includes(nf))
    );
  });

  console.log(`\nFound ${nonFoodPlaces.length} potential non-food places (${((nonFoodPlaces.length / tier3Places.length) * 100).toFixed(1)}%)\n`);

  for (const place of nonFoodPlaces.slice(0, 20)) {
    console.log(`• ${place.name} (${place.neighborhood || 'N/A'})`);
    console.log(`  Types: ${place.google_types?.join(', ') || 'N/A'}`);
    console.log(`  Category: ${place.category || 'N/A'}`);
    console.log('');
  }

  // Random sample for manual review
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('RANDOM SAMPLE (20 places for manual review)');
  console.log('════════════════════════════════════════════════════════════\n');

  const randomSample = tier3Places
    .sort(() => Math.random() - 0.5)
    .slice(0, 20);

  for (const place of randomSample) {
    console.log(`${place.name}`);
    console.log(`  Address: ${place.address || 'N/A'}`);
    console.log(`  Neighborhood: ${place.neighborhood || 'N/A'}`);
    console.log(`  Category: ${place.category || 'N/A'}`);
    console.log(`  Website: ${place.website || 'N/A'}`);
    console.log(`  Types: ${place.google_types?.slice(0, 3).join(', ') || 'N/A'}`);
    console.log('');
  }

  // Check for restaurants specifically
  const restaurantTypes = ['restaurant', 'food', 'cafe', 'bakery', 'bar', 'meal_'];
  const definitelyFood = tier3Places.filter(place => {
    const types = place.google_types || [];
    return types.some(type => 
      restaurantTypes.some(rt => type.toLowerCase().includes(rt))
    );
  });

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log(`Total Tier 3 places:        ${tier3Places.length}`);
  console.log(`Likely food/dining:         ${definitelyFood.length} (${((definitelyFood.length / tier3Places.length) * 100).toFixed(1)}%)`);
  console.log(`Potential non-food noise:   ${nonFoodPlaces.length} (${((nonFoodPlaces.length / tier3Places.length) * 100).toFixed(1)}%)`);
  console.log(`Uncategorized:              ${tier3Places.length - definitelyFood.length - nonFoodPlaces.length}`);

  console.log('\n💡 RECOMMENDATION:');
  if (nonFoodPlaces.length > tier3Places.length * 0.1) {
    console.log(`   ⚠️  ${nonFoodPlaces.length} non-food places detected (${((nonFoodPlaces.length / tier3Places.length) * 100).toFixed(1)}%)`);
    console.log('   Consider filtering out non-food Google types before launch');
  } else {
    console.log('   ✅ Most Tier 3 places appear to be food/dining related');
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
