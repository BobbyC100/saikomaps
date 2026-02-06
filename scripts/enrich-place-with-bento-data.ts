/**
 * Example: Enrich place with vibe tags and tips
 * 
 * This script demonstrates how to add vibeTags and tips to places
 * for the merchant page bento grid layout.
 * 
 * Usage:
 *   ts-node scripts/enrich-place-with-bento-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enrichPlace(placeSlug: string) {
  console.log(`\n🎨 Enriching place: ${placeSlug}`);

  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
  });

  if (!place) {
    console.error(`❌ Place not found: ${placeSlug}`);
    return;
  }

  // Example vibe tags (3-5 words that capture the atmosphere)
  const vibeTags = generateVibeTags(place);

  // Example tips (practical visitor advice)
  const tips = generateTips(place);

  await prisma.place.update({
    where: { slug: placeSlug },
    data: {
      vibeTags,
      tips,
    },
  });

  console.log(`✅ Updated ${place.name}`);
  console.log(`   Vibe Tags: ${vibeTags.join(' · ')}`);
  console.log(`   Tips: ${tips.length} items`);
}

/**
 * Generate vibe tags based on place data
 * These should be short, evocative descriptors
 */
function generateVibeTags(place: any): string[] {
  const tags: string[] = [];

  // Example logic - you can make this smarter with AI
  if (place.category === 'Coffee') {
    tags.push('Minimalist', 'Third wave', 'Laptop-friendly');
  } else if (place.category === 'Eat') {
    if (place.priceLevel && place.priceLevel >= 3) {
      tags.push('Upscale', 'Date night', 'Reservations recommended');
    } else {
      tags.push('Casual', 'Family-friendly', 'Walk-in');
    }
  } else if (place.category === 'Drinks') {
    tags.push('Low-lit', 'Cocktail-focused', 'After work');
  }

  // Add neighborhood-specific vibes
  if (place.neighborhood === 'Silver Lake') {
    tags.push('Local crowd');
  } else if (place.neighborhood === 'Venice') {
    tags.push('Beach vibes');
  }

  return tags.slice(0, 4); // Max 4 tags
}

/**
 * Generate helpful tips based on place data
 * These should be actionable visitor advice
 */
function generateTips(place: any): string[] {
  const tips: string[] = [];

  // Example logic - you can make this smarter with AI or manual curation
  if (place.priceLevel && place.priceLevel <= 2) {
    tips.push('Cash friendly');
  }

  if (place.category === 'Coffee') {
    tips.push('Go early to avoid crowds');
    tips.push('Try the pour-over');
  } else if (place.category === 'Eat') {
    tips.push('Reservations recommended on weekends');
    if (place.priceLevel && place.priceLevel >= 3) {
      tips.push('Ask for the chef's tasting menu');
    }
  }

  // Add generic tips based on hours
  if (place.hours) {
    // You can parse hours and add relevant tips
    tips.push('Check hours before visiting');
  }

  return tips.slice(0, 3); // Max 3 tips
}

/**
 * Batch enrich multiple places
 */
async function batchEnrich() {
  // Example: Enrich all places in a specific category
  const places = await prisma.place.findMany({
    where: {
      category: 'Coffee',
      vibeTags: { isEmpty: true }, // Only places without vibe tags
    },
    take: 10,
  });

  console.log(`\n📦 Batch enriching ${places.length} places...`);

  for (const place of places) {
    await enrichPlace(place.slug);
  }
}

/**
 * Example manual enrichment with specific data
 */
async function manualEnrich() {
  // Example: Coffee shop
  await prisma.place.upsert({
    where: { slug: 'biarritz-coffee-club' },
    create: {
      slug: 'biarritz-coffee-club',
      name: 'Biarritz Coffee Club',
      category: 'Coffee',
      neighborhood: 'Silver Lake',
      vibeTags: ['Low-key', 'Surf crowd', 'Standing room'],
      tips: ['Go early for a seat', 'Cash only', 'Try the flat white'],
    },
    update: {
      vibeTags: ['Low-key', 'Surf crowd', 'Standing room'],
      tips: ['Go early for a seat', 'Cash only', 'Try the flat white'],
    },
  });

  console.log('✅ Manually enriched Biarritz Coffee Club');

  // Example: Upscale restaurant
  await prisma.place.upsert({
    where: { slug: 'the-breakers-palm-beach' },
    create: {
      slug: 'the-breakers-palm-beach',
      name: 'The Breakers Palm Beach',
      category: 'Eat',
      priceLevel: 3,
      vibeTags: ['Old-money Florida', 'Ocean views', 'Sunday brunch'],
      tips: ['Book the Circle Room', 'Dress code enforced', 'Valet parking available'],
    },
    update: {
      vibeTags: ['Old-money Florida', 'Ocean views', 'Sunday brunch'],
      tips: ['Book the Circle Room', 'Dress code enforced', 'Valet parking available'],
    },
  });

  console.log('✅ Manually enriched The Breakers Palm Beach');

  // Example: Bar
  await prisma.place.upsert({
    where: { slug: 'bar-leather-apron' },
    create: {
      slug: 'bar-leather-apron',
      name: 'Bar Leather Apron',
      category: 'Drinks',
      priceLevel: 4,
      vibeTags: ['Speakeasy', 'Craft cocktails', 'No sign on door'],
      tips: ['Reservations recommended', 'Try the old fashioned', 'Arrive early to avoid wait'],
    },
    update: {
      vibeTags: ['Speakeasy', 'Craft cocktails', 'No sign on door'],
      tips: ['Reservations recommended', 'Try the old fashioned', 'Arrive early to avoid wait'],
    },
  });

  console.log('✅ Manually enriched Bar Leather Apron');
}

// Main execution
async function main() {
  console.log('🎨 Bento Grid Data Enrichment Script\n');

  const mode = process.argv[2] || 'manual';

  if (mode === 'batch') {
    await batchEnrich();
  } else if (mode === 'manual') {
    await manualEnrich();
  } else {
    await enrichPlace(mode); // Treat argument as slug
  }

  console.log('\n✅ Done!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
