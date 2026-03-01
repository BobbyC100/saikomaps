/**
 * Production Place Seed Script
 * 
 * Seeds a curated set of real LA places for production testing.
 * Run manually only: DATABASE_URL="<prod-url>" npx tsx scripts/seed-prod-places.ts
 * 
 * Idempotent: uses upsert by slug
 */

import { db } from '../lib/db';

interface SeedPlace {
  slug: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  instagram?: string;
  category?: string;
  neighborhood?: string;
  cuisineType?: string;
  priceLevel?: number;
  description?: string;
  vibeTags?: string[];
  googlePlaceId?: string;
}

/**
 * Curated seed places - real LA restaurants
 * Note: These are placeholder examples. Replace with actual places from your dataset.
 */
const SEED_PLACES: SeedPlace[] = [
  {
    slug: 'seco',
    name: 'Seco',
    address: '2705 Sawtelle Blvd, Los Angeles, CA 90064',
    latitude: 34.035877,
    longitude: -118.449692,
    neighborhood: 'Sawtelle',
    category: 'Restaurant',
    cuisineType: 'Latin American',
    priceLevel: 2,
    instagram: 'secolosangeles',
    description: 'Modern Latin American restaurant with natural wine focus.',
    vibeTags: ['Date Night', 'Lively', 'Cozy'],
  },
  {
    slug: 'budonoki',
    name: 'Budonoki',
    address: '2506 Sawtelle Blvd, Los Angeles, CA 90064',
    latitude: 34.034123,
    longitude: -118.449512,
    neighborhood: 'Sawtelle',
    category: 'Restaurant',
    cuisineType: 'Ramen',
    priceLevel: 1,
    description: 'Neighborhood ramen spot with house-made noodles.',
  },
  {
    slug: 'tacos-1986',
    name: 'Tacos 1986',
    address: '3643 S Grand Ave, Los Angeles, CA 90007',
    latitude: 34.004321,
    longitude: -118.270987,
    neighborhood: 'Downtown',
    category: 'Restaurant',
    cuisineType: 'Mexican',
    priceLevel: 1,
    description: 'Tijuana-style tacos with handmade tortillas.',
    vibeTags: ['Casual', 'Quick Bites'],
  },
  {
    slug: 'redbird-downtown-los-angeles',
    name: 'Redbird',
    address: '114 E 2nd St, Los Angeles, CA 90012',
    latitude: 34.050876,
    longitude: -118.245123,
    neighborhood: 'Downtown',
    category: 'Restaurant',
    cuisineType: 'California',
    priceLevel: 3,
    description: 'California cuisine in a converted parish hall.',
    vibeTags: ['Date Night', 'Special Occasion', 'Patio'],
  },
  {
    slug: 'republique',
    name: 'Republique',
    address: '624 S La Brea Ave, Los Angeles, CA 90036',
    latitude: 34.063412,
    longitude: -118.344567,
    neighborhood: 'Mid-City',
    category: 'Restaurant',
    cuisineType: 'French',
    priceLevel: 3,
    description: 'French bistro and bakery in a historic building.',
    vibeTags: ['Brunch', 'Bakery', 'Date Night'],
  },
];

async function seedPlace(place: SeedPlace) {
  console.log(`Seeding: ${place.name} (${place.slug})...`);

  try {
    await db.entities.upsert({
      where: { slug: place.slug },
      create: {
        id: `place_${place.slug}_${Date.now()}`,
        slug: place.slug,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        phone: place.phone || null,
        website: place.website || null,
        instagram: place.instagram || null,
        category: place.category || null,
        neighborhood: place.neighborhood || null,
        cuisineType: place.cuisineType || null,
        priceLevel: place.priceLevel || null,
        description: place.description || null,
        vibeTags: place.vibeTags || [],
        googlePlaceId: place.googlePlaceId || null,
        hours: null,
        googlePhotos: null,
        googleTypes: [],
        placesDataCachedAt: null,
        editorialSources: null,
        adUnitOverride: false,
        adUnitType: null,
        pullQuote: null,
        pullQuoteAuthor: null,
        pullQuoteSource: null,
        pullQuoteType: null,
        pullQuoteUrl: null,
        tagline: null,
        tips: [],
        intentProfile: null,
        intentProfileOverride: false,
        reservationUrl: null,
        placeType: 'venue',
        categoryId: null,
        marketSchedule: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        phone: place.phone || null,
        website: place.website || null,
        instagram: place.instagram || null,
        category: place.category || null,
        neighborhood: place.neighborhood || null,
        cuisineType: place.cuisineType || null,
        priceLevel: place.priceLevel || null,
        description: place.description || null,
        vibeTags: place.vibeTags || [],
        updatedAt: new Date(),
      },
    });

    console.log(`✓ Seeded: ${place.name} → /place/${place.slug}`);
  } catch (error) {
    console.error(`✗ Failed to seed ${place.name}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🌱 Seeding production database with curated places...\n');
  console.log(`DATABASE: ${process.env.DATABASE_URL?.substring(0, 40)}...\n`);

  // Safety check
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }

  try {
    // Seed all places
    for (const place of SEED_PLACES) {
      await seedPlace(place);
    }

    // Verify
    const count = await db.entities.count();
    console.log(`\n✅ Seed complete! Total places: ${count}`);
    console.log('\nTest URLs:');
    for (const place of SEED_PLACES) {
      console.log(`  https://saikomaps.vercel.app/place/${place.slug}`);
    }
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
