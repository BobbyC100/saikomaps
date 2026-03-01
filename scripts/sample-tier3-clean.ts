#!/usr/bin/env node
/**
 * Sample random Tier 3 places for final sanity check
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 TIER 3 SANITY CHECK (10 Random Samples)\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get all clean Tier 3 places (no editorial, but has full data)
  const allPlaces = await prisma.entities.findMany({
    where: {
      status: 'OPEN',
      latitude: { not: null },
      longitude: { not: null },
      latitude: { not: 0 },
      longitude: { not: 0 },
      address: { not: null },
      google_place_id: { not: null },
    },
    select: {
      id: true,
      name: true,
      address: true,
      neighborhood: true,
      category: true,
      website: true,
      google_place_id: true,
      google_types: true,
      editorial_sources: true,
    },
  });

  // Filter to Tier 3 (no editorial)
  const tier3 = allPlaces.filter(place => {
    if (!place.editorial_sources) return true;
    if (Array.isArray(place.editorial_sources) && place.editorial_sources.length === 0) return true;
    return false;
  });

  console.log(`Total clean Tier 3 places: ${tier3.length}\n`);

  // Get 10 random samples
  const samples = tier3
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);

  console.log('Random samples for review:\n');
  console.log('─'.repeat(60));

  for (let i = 0; i < samples.length; i++) {
    const place = samples[i];
    console.log(`\n${i + 1}. ${place.name}`);
    console.log(`   Address: ${place.address}`);
    console.log(`   Neighborhood: ${place.neighborhood || 'N/A'}`);
    console.log(`   Category: ${place.category || 'N/A'}`);
    console.log(`   Website: ${place.website || 'N/A'}`);
    console.log(`   Google Place ID: ${place.google_place_id}`);
    
    const types = place.google_types || [];
    const foodTypes = types.filter(t => 
      t.includes('restaurant') || t.includes('food') || 
      t.includes('bar') || t.includes('cafe') || 
      t.includes('bakery') || t.includes('meal')
    );
    const otherTypes = types.filter(t => !foodTypes.includes(t));
    
    console.log(`   Google Types:`);
    if (foodTypes.length > 0) {
      console.log(`     Food-related: ${foodTypes.join(', ')}`);
    }
    if (otherTypes.length > 0) {
      console.log(`     Other: ${otherTypes.slice(0, 3).join(', ')}`);
    }
  }

  // Analyze all Tier 3 for non-food types
  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log('TIER 3 TYPE ANALYSIS');
  console.log('════════════════════════════════════════════════════════════\n');

  const nonFoodKeywords = [
    'car_', 'automotive', 'gas_station', 'parking',
    'dentist', 'doctor', 'hospital', 'pharmacy', 'health',
    'bank', 'atm', 'insurance', 'lawyer', 'real_estate',
    'gym', 'spa', 'beauty_salon', 'hair_care',
    'school', 'university', 'library',
    'clothing_store', 'electronics_store', 'furniture_store',
    'hardware_store', 'home_goods_store'
  ];

  const suspiciousPlaces = tier3.filter(place => {
    const types = place.google_types || [];
    return types.some(type => 
      nonFoodKeywords.some(keyword => type.toLowerCase().includes(keyword))
    );
  });

  console.log(`Total Tier 3: ${tier3.length}`);
  console.log(`Suspicious (non-food types): ${suspiciousPlaces.length} (${((suspiciousPlaces.length / tier3.length) * 100).toFixed(1)}%)\n`);

  if (suspiciousPlaces.length > 0) {
    console.log('Sample of suspicious places:\n');
    for (const place of suspiciousPlaces.slice(0, 10)) {
      console.log(`  • ${place.name}`);
      console.log(`    Types: ${place.google_types?.join(', ') || 'N/A'}`);
      console.log('');
    }
  }

  // Food-related analysis
  const foodKeywords = [
    'restaurant', 'food', 'bar', 'cafe', 'bakery', 'meal', 
    'pizza', 'sushi', 'taco', 'burger'
  ];

  const definitelyFood = tier3.filter(place => {
    const types = place.google_types || [];
    return types.some(type => 
      foodKeywords.some(keyword => type.toLowerCase().includes(keyword))
    );
  });

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('FOOD vs NON-FOOD BREAKDOWN');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log(`Definitely food/drink: ${definitelyFood.length} (${((definitelyFood.length / tier3.length) * 100).toFixed(1)}%)`);
  console.log(`Suspicious non-food:   ${suspiciousPlaces.length} (${((suspiciousPlaces.length / tier3.length) * 100).toFixed(1)}%)`);
  console.log(`Unclear/other:         ${tier3.length - definitelyFood.length - suspiciousPlaces.length} (${(((tier3.length - definitelyFood.length - suspiciousPlaces.length) / tier3.length) * 100).toFixed(1)}%)`);

  if (suspiciousPlaces.length > 0) {
    console.log('\n⚠️  RECOMMENDATION: Review and remove suspicious non-food places');
  } else {
    console.log('\n✅ No suspicious non-food places detected');
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
