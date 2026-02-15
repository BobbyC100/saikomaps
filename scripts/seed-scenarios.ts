/**
 * Database Seed Script
 * Seeds Scenario A, B, C using existing Prisma Place model
 */

import { db as prisma } from '../lib/db';
import {
  scenarioA_FullyCurated,
  scenarioB_EditorialLite,
  scenarioC_Baseline,
} from '../lib/mock-data';
import { MerchantData } from '../lib/types/merchant';

/**
 * Map MerchantData to Prisma Place fields
 */
function mapToPlaceData(data: MerchantData, scenarioSlug: string) {
  return {
    id: `${scenarioSlug}-${Date.now()}`, // Generate unique ID
    slug: scenarioSlug,
    name: data.name,
    updatedAt: new Date(), // Required field
    
    // Location
    address: data.address ? 
      `${data.address.street}, ${data.address.city}, ${data.address.state} ${data.address.zip}` 
      : null,
    latitude: data.coordinates?.lat,
    longitude: data.coordinates?.lng,
    neighborhood: data.vibeTags?.[0], // Use first vibe tag as neighborhood
    
    // Contact
    phone: data.phone,
    website: data.websiteUrl,
    instagram: data.instagramHandle,
    
    // Classification (mock values)
    category: 'restaurant',
    priceLevel: 2,
    googleTypes: ['restaurant', 'food', 'establishment'],
    
    // Media - combine hero + collage photos
    googlePhotos: {
      photos: [
        {
          id: data.heroPhoto.id,
          url: data.heroPhoto.url,
          alt: data.heroPhoto.alt,
          isHero: true,
        },
        ...(data.photos?.map(p => ({
          id: p.id,
          url: p.url,
          alt: p.alt,
          isHero: false,
        })) || [])
      ]
    },
    
    // Editorial sources as JSON
    editorialSources: data.coverageSources ? {
      sources: data.coverageSources.map(source => ({
        publication: source.publication,
        quote: source.quote,
        url: source.url,
        date: source.date,
      }))
    } : null,
    
    // Hours
    hours: data.hours ? {
      monday: data.hours.monday,
      tuesday: data.hours.tuesday,
      wednesday: data.hours.wednesday,
      thursday: data.hours.thursday,
      friday: data.hours.friday,
      saturday: data.hours.saturday,
      sunday: data.hours.sunday,
    } : null,
  };
}

async function seedPlace(data: MerchantData, scenarioSlug: string) {
  console.log(`Seeding: ${data.name} (${scenarioSlug})...`);

  try {
    const placeData = mapToPlaceData(data, scenarioSlug);
    
    const place = await prisma.places.create({
      data: placeData,
    });

    console.log(`✓ Seeded: ${data.name} → /place/${scenarioSlug}`);
  } catch (error) {
    console.error(`✗ Failed to seed ${data.name}:`, error);
  }
}

async function main() {
  console.log('🌱 Seeding database with test scenarios...\n');

  try {
    // Optional: Clear existing scenario places
    await prisma.places.deleteMany({
      where: {
        slug: {
          in: ['scenario-a', 'scenario-b', 'scenario-c']
        }
      }
    });
    
    // Seed the three scenarios
    await seedPlace(scenarioA_FullyCurated, 'scenario-a');
    await seedPlace(scenarioB_EditorialLite, 'scenario-b');
    await seedPlace(scenarioC_Baseline, 'scenario-c');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nVisit:');
    console.log('  /place/scenario-a  (Fully curated)');
    console.log('  /place/scenario-b  (Editorial lite)');
    console.log('  /place/scenario-c  (Baseline)');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
