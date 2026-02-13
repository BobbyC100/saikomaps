#!/usr/bin/env node
/**
 * Verify Empty Places
 *
 * For places with no data at all, searches Google and shows results for manual review.
 */

import { PrismaClient } from '@prisma/client';
import { searchPlace, getPlaceDetails } from '@/lib/google-places';

const prisma = new PrismaClient();
const RATE_LIMIT_MS = 150;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// LA County cities for verification
const LA_COUNTY_CITIES = new Set([
  'los angeles', 'long beach', 'santa clarita', 'glendale', 'lancaster', 'palmdale',
  'pomona', 'torrance', 'pasadena', 'el monte', 'downey', 'inglewood', 'west covina',
  'norwalk', 'burbank', 'compton', 'carson', 'santa monica', 'whittier', 'hawthorne',
  'alhambra', 'lakewood', 'redondo beach', 'arcadia', 'manhattan beach', 'monterey park',
  'gardena', 'culver city', 'hermosa beach', 'southgate', 'la puente', 'paramount',
  'covina', 'glendora', 'la mirada', 'walnut', 'bellflower', 'diamond bar', 'baldwin park',
  'azusa', 'maywood', 'pico rivera', 'montebello', 'bell gardens', 'vernon', 'huntington park',
  'commerce', 'cudahy', 'lynwood', 'signal hill', 'hawaiian gardens', 'lawndale', 'rosemead',
  'temple city', 'south gate', 'west hollywood', 'beverly hills', 'calabasas', 'malibu',
  'rolling hills', 'rolling hills estates', 'palos verdes estates', 'rancho palos verdes',
  'san marino', 'sierra madre', 'south pasadena', 'san fernando', 'la cañada flintridge',
  'agoura hills', 'artesia', 'cerritos', 'claremont', 'duarte', 'el segundo', 'irwindale',
  'la verne', 'monrovia', 'san dimas', 'westlake village', 'hidden hills'
]);

async function verifyEmptyPlaces() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set');
    process.exit(1);
  }

  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  // Get places with NO data at all
  const emptyPlaces = await prisma.places.findMany({
    where: {
      id: { in: curatedIds },
      address: null,
      latitude: 0,
      longitude: 0,
      phone: null,
      website: null,
      neighborhood: null,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  // Get provenance data separately
  const provenanceData = await prisma.provenance.findMany({
    where: {
      place_id: { in: emptyPlaces.map(p => p.id) },
    },
    select: {
      place_id: true,
      source_name: true,
    },
  });

  // Map provenance to places
  const provenanceByPlace = provenanceData.reduce((acc, p) => {
    if (!acc[p.place_id]) acc[p.place_id] = [];
    acc[p.place_id].push(p.source_name || 'Unknown');
    return acc;
  }, {} as Record<string, string[]>);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('VERIFY EMPTY PLACES - LA COUNTY CHECK');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Found ${emptyPlaces.length} places with no data\n`);

  const results: Array<{
    name: string;
    slug: string;
    googleName?: string;
    address?: string;
    inLACounty: boolean;
    isDuplicate: boolean;
    duplicateOf?: string;
    notFound: boolean;
    sources: string[];
  }> = [];

  for (let i = 0; i < emptyPlaces.length; i++) {
    const place = emptyPlaces[i];
    const progress = `[${i + 1}/${emptyPlaces.length}]`;
    
    console.log(`${progress} ${place.name}...`);

    try {
      // Search for place
      const searchResults = await searchPlace(place.name, { maxResults: 3 });
      
      if (searchResults.length === 0) {
        console.log(`${progress}   ❌ Not found on Google`);
        results.push({
          name: place.name,
          slug: place.slug,
          inLACounty: false,
          isDuplicate: false,
          notFound: true,
          sources: provenanceByPlace[place.id] || ['Unknown'],
        });
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      const result = searchResults[0];
      
      // Check if Place ID already exists (duplicate)
      const existingPlace = await prisma.places.findUnique({
        where: { googlePlaceId: result.placeId },
        select: { slug: true, name: true },
      });

      // Get full details to check LA County
      const details = await getPlaceDetails(result.placeId);
      
      if (!details) {
        console.log(`${progress}   ⚠️  Could not get details`);
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      // Check if in LA County
      const addressLower = details.formattedAddress.toLowerCase();
      const inLACounty = Array.from(LA_COUNTY_CITIES).some(city => 
        addressLower.includes(city + ',') || addressLower.includes(city + ' ')
      );

      const isDuplicate = existingPlace && existingPlace.id !== place.id;

      console.log(`${progress}   ${details.displayName?.text || result.displayName}`);
      console.log(`${progress}   📍 ${details.formattedAddress}`);
      console.log(`${progress}   ${inLACounty ? '✅ LA County' : '❌ Outside LA County'}`);
      if (isDuplicate) {
        console.log(`${progress}   ⚠️  Duplicate of: ${existingPlace.name} (${existingPlace.slug})`);
      }
      console.log('');

      results.push({
        name: place.name,
        slug: place.slug,
        googleName: details.displayName?.text || result.displayName,
        address: details.formattedAddress,
        inLACounty,
        isDuplicate,
        duplicateOf: isDuplicate ? existingPlace?.slug : undefined,
        notFound: false,
        sources: provenanceByPlace[place.id] || ['Unknown'],
      });

    } catch (error) {
      console.log(`${progress}   ⚠️  Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 SUMMARY\n');
  
  const inLA = results.filter(r => r.inLACounty && !r.isDuplicate);
  const outsideLA = results.filter(r => !r.inLACounty && !r.notFound);
  const duplicates = results.filter(r => r.isDuplicate);
  const notFound = results.filter(r => r.notFound);

  console.log(`✅ IN LA County (not duplicate): ${inLA.length}`);
  console.log(`❌ OUTSIDE LA County: ${outsideLA.length}`);
  console.log(`⚠️  Duplicates: ${duplicates.length}`);
  console.log(`❓ Not found: ${notFound.length}`);

  if (outsideLA.length > 0) {
    console.log('\n❌ DELETE (Outside LA County):\n');
    outsideLA.forEach((r, i) => {
      console.log(`${i+1}. ${r.name} (${r.slug})`);
      console.log(`   ${r.address}`);
      console.log('');
    });
  }

  if (duplicates.length > 0) {
    console.log('\n❌ DELETE (Duplicates):\n');
    duplicates.forEach((r, i) => {
      console.log(`${i+1}. ${r.name} (${r.slug})`);
      console.log(`   Duplicate of: ${r.duplicateOf}`);
      console.log('');
    });
  }

  if (inLA.length > 0) {
    console.log('\n✅ RECOVER (In LA County, not duplicate):\n');
    inLA.forEach((r, i) => {
      console.log(`${i+1}. ${r.name} (${r.slug})`);
      console.log(`   ${r.address}`);
      console.log(`   Sources: ${r.sources.join(', ')}`);
      console.log('');
    });
  }

  if (notFound.length > 0) {
    console.log('\n❓ REVIEW (Not found on Google):\n');
    notFound.forEach((r, i) => {
      console.log(`${i+1}. ${r.name} (${r.slug})`);
      console.log(`   Sources: ${r.sources.join(', ')}`);
      console.log('');
    });
  }

  // Export to JSON
  const fs = require('fs');
  fs.writeFileSync(
    'verify-empty-places-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('Full results exported to verify-empty-places-results.json\n');
}

verifyEmptyPlaces()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
