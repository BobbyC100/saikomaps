#!/usr/bin/env node
/**
 * Tag LA County Places
 * 
 * Sets county = 'Los Angeles' for all places in LA County.
 * This enables selective enrichment (only enrich LA places).
 * 
 * Usage: npm run tag:la-county
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// LA County neighborhoods/cities
const LA_COUNTY_AREAS = [
  // Central LA
  'Central LA', 'Downtown', 'DTLA', 'Arts District', 'Little Tokyo', 'Chinatown',
  'Historic Core', 'Financial District',
  
  // Westside
  'Santa Monica', 'Venice', 'Marina del Rey', 'Culver City', 'Westwood', 'Brentwood',
  'Pacific Palisades', 'West LA', 'Palms', 'Mar Vista', 'Playa Vista',
  
  // Hollywood/Central
  'Hollywood', 'West Hollywood', 'Los Feliz', 'Silver Lake', 'Echo Park',
  'Highland Park', 'Eagle Rock', 'Atwater Village',
  
  // South Bay
  'Manhattan Beach', 'Hermosa Beach', 'Redondo Beach', 'El Segundo', 'Hawthorne',
  'Torrance', 'Gardena', 'Inglewood', 'Lawndale',
  
  // South LA
  'South LA', 'Watts', 'Compton', 'Lynwood', 'South Gate', 'Huntington Park',
  
  // Southeast LA
  'Boyle Heights', 'East LA', 'Lincoln Heights', 'El Sereno', 'Montebello',
  'Monterey Park', 'Alhambra', 'San Gabriel', 'Rosemead', 'Temple City',
  
  // San Gabriel Valley
  'Pasadena', 'South Pasadena', 'Arcadia', 'Monrovia', 'Sierra Madre',
  'San Marino', 'Glendale', 'La Cañada Flintridge',
  
  // San Fernando Valley
  'Sherman Oaks', 'Studio City', 'North Hollywood', 'Burbank', 'Van Nuys',
  'Encino', 'Tarzana', 'Reseda', 'Northridge', 'Granada Hills', 'Porter Ranch',
  'Woodland Hills', 'Canoga Park', 'Chatsworth', 'Pacoima', 'San Fernando',
  'Toluca Lake', 'Valley Village', 'Panorama City', 'Tujunga',
  
  // Harbor Area
  'San Pedro', 'Wilmington', 'Harbor City', 'Long Beach',
];

async function tagLACounty() {
  console.log('🗺️  TAGGING LA COUNTY PLACES');
  console.log('═'.repeat(60));
  console.log('');

  // Find places in LA County areas
  const laPlaces = await prisma.golden_records.findMany({
    where: {
      OR: [
        { neighborhood: { in: LA_COUNTY_AREAS } },
        { address_city: { in: LA_COUNTY_AREAS } },
      ]
    },
    select: {
      canonical_id: true,
      name: true,
      neighborhood: true,
      county: true,
    }
  });

  console.log(`Found ${laPlaces.length} places in LA County areas\n`);

  const needsUpdate = laPlaces.filter(p => p.county !== 'Los Angeles');
  console.log(`${needsUpdate.length} need county tag\n`);

  if (needsUpdate.length === 0) {
    console.log('✅ All LA places already tagged!');
    return;
  }

  // Update in batches
  for (const place of needsUpdate) {
    await prisma.golden_records.update({
      where: { canonical_id: place.canonical_id },
      data: { county: 'Los Angeles' }
    });
  }

  console.log(`✅ Tagged ${needsUpdate.length} places as Los Angeles County\n`);

  // Stats
  const totalLA = await prisma.golden_records.count({
    where: { county: 'Los Angeles' }
  });
  
  const total = await prisma.golden_records.count();

  console.log('📊 County Distribution:');
  console.log(`   Los Angeles: ${totalLA} / ${total} (${Math.round(totalLA/total*100)}%)`);
  console.log('');
  console.log('✅ Enrichment script will now only process LA County places!');
}

async function main() {
  try {
    await tagLACounty();
  } catch (error) {
    console.error('Error tagging counties:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
