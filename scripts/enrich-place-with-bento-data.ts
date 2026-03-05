/**
 * Example: Enrich place with tips (and optionally tagline/pull_quote)
 * 
 * Demonstrates how to add tips to places for the merchant page bento grid layout.
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

  // Example tips (practical visitor advice)
  const tips = generateTips(place);

  await prisma.place.update({
    where: { slug: placeSlug },
    data: {
      tips,
    },
  });

  console.log(`✅ Updated ${place.name}`);
  console.log(`   Tips: ${tips.length} items`);
}

/**
 * Generate helpful tips based on place data
 * These should be actionable visitor advice
 */
function generateTips(place: { priceLevel?: number | null; category?: string | null; hours?: unknown }): string[] {
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
      tips.push("Ask for the chef's tasting menu");
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
  // Example: Enrich all places in a specific category that lack tips
  const places = await prisma.place.findMany({
    where: {
      category: 'Coffee',
      tips: { isEmpty: true },
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
      tips: ['Go early for a seat', 'Cash only', 'Try the flat white'],
    },
    update: {
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
      tips: ['Book the Circle Room', 'Dress code enforced', 'Valet parking available'],
    },
    update: {
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
      tips: ['Reservations recommended', 'Try the old fashioned', 'Arrive early to avoid wait'],
    },
    update: {
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
