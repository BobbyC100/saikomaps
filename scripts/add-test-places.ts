/**
 * Add Donna's and Churrería El Moro to golden_records for testing
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
    return {
      lat: data.results[0].geometry.location.lat,
      lng: data.results[0].geometry.location.lng,
    };
  }
  return null;
}

async function addTestPlaces() {
  console.log('\n🏪 Adding test places to golden_records...\n');

  // 1. Donna's
  // Coordinates for 1538 Sunset Blvd (verified from Google Maps)
  const donnasCoords = { lat: 34.0777, lng: -118.2605 };

  const donnasSlug = 'donnas-echo-park';
  
  const donnasExists = await prisma.golden_records.findUnique({
    where: { slug: donnasSlug },
  });

  if (donnasExists) {
    console.log('✓ Donna\'s already exists');
  } else {
    await prisma.golden_records.create({
      data: {
        canonical_id: randomUUID(),
        slug: donnasSlug,
        name: "Donna's",
        lat: donnasCoords.lat,
        lng: donnasCoords.lng,
        address_street: '1538 Sunset Blvd',
        address_city: 'Los Angeles',
        address_state: 'CA',
        address_zip: '90026',
        neighborhood: 'Echo Park',
        category: 'eat',
        cuisines: ['Italian-American'],
        website: 'https://www.donnasla.com/',
        phone: null,
        county: 'Los Angeles',
        business_status: 'operational',
        source_attribution: {
          name: 'manual_add',
          added_by: 'bobby',
          date: new Date().toISOString(),
        },
        data_completeness: 0.75,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log('✓ Added Donna\'s');
  }

  // 2. Churrería El Moro
  // Coordinates for Sunset & Laveta (former Patra Burgers, verified from articles)
  const elMoroCoords = { lat: 34.0785, lng: -118.2602 };

  const elMoroSlug = 'churreria-el-moro-echo-park';
  
  const elMoroExists = await prisma.golden_records.findUnique({
    where: { slug: elMoroSlug },
  });

  if (elMoroExists) {
    console.log('✓ Churrería El Moro already exists');
  } else {
    await prisma.golden_records.create({
      data: {
        canonical_id: randomUUID(),
        slug: elMoroSlug,
        name: 'Churrería El Moro',
        lat: elMoroCoords.lat,
        lng: elMoroCoords.lng,
        address_street: 'Sunset Blvd & Laveta Terrace',
        address_city: 'Los Angeles',
        address_state: 'CA',
        address_zip: '90026',
        neighborhood: 'Echo Park',
        category: 'coffee',
        cuisines: ['Mexican', 'Dessert'],
        website: 'https://elmoro.mx/',
        phone: null,
        county: 'Los Angeles',
        business_status: 'operational',
        source_attribution: {
          name: 'manual_add',
          added_by: 'bobby',
          date: new Date().toISOString(),
          note: 'Mexico City churro institution, opened Echo Park Jan 2026',
        },
        data_completeness: 0.75,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log('✓ Added Churrería El Moro');
  }

  console.log('\n✅ Done!\n');
  await prisma.$disconnect();
}

addTestPlaces().catch(async (error) => {
  console.error('\n❌ Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
