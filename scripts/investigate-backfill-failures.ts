import { PrismaClient } from '@prisma/client';
import { searchPlace, getPlaceDetails } from '@/lib/google-places';

const prisma = new PrismaClient();

const FAILED_PLACES = [
  'olivia-restaurant',
  'tacos-estilo-tijuana',
  'helens-wines',
];

const LA_CENTER = { latitude: 34.0522, longitude: -118.2437 };

async function investigateBackfillFailures() {
  console.log('🔍 Investigating places that failed during backfill...\n');

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found');
    process.exit(1);
  }

  for (const slug of FAILED_PLACES) {
    console.log('─'.repeat(80));
    
    const place = await prisma.places.findUnique({
      where: { slug },
      include: {
        map_places: {
          include: {
            map: {
              select: { title: true, slug: true }
            }
          }
        }
      }
    });

    if (!place) {
      console.log(`❌ Place not found: ${slug}`);
      continue;
    }

    console.log(`\n📍 ${place.name} (${place.slug})`);
    console.log(`   Current Google Place ID: ${place.googlePlaceId || 'none'}`);
    console.log(`   Address: ${place.address || 'none'}`);
    console.log(`   Used in ${place.map_places.length} map(s)`);

    if (place.map_places.length > 0) {
      console.log(`   Maps:`);
      place.map_places.forEach(mp => {
        console.log(`      • ${mp.map.title} (${mp.map.slug})`);
      });
    }

    // Try to find in Google Places
    try {
      console.log(`\n   Searching Google Places...`);
      const searchQuery = place.address 
        ? `${place.name}, ${place.address}`
        : `${place.name}, Los Angeles`;

      const results = await searchPlace(searchQuery, {
        maxResults: 3,
        locationBias: LA_CENTER,
      });

      if (results.length === 0) {
        console.log(`   ❌ No results found`);
        continue;
      }

      console.log(`   Found ${results.length} result(s):`);

      for (const result of results) {
        console.log(`\n      📌 ${result.name}`);
        console.log(`         Place ID: ${result.placeId}`);
        console.log(`         Address: ${result.address || 'none'}`);

        // Check if this Place ID is already used
        const existingPlace = await prisma.places.findUnique({
          where: { googlePlaceId: result.placeId },
          select: {
            id: true,
            name: true,
            slug: true,
            map_places: {
              include: {
                map: { select: { title: true } }
              }
            }
          }
        });

        if (existingPlace) {
          console.log(`         ⚠️  ALREADY USED BY: "${existingPlace.name}" (${existingPlace.slug})`);
          console.log(`            Used in ${existingPlace.map_places.length} map(s)`);
          
          if (existingPlace.id === place.id) {
            console.log(`            (same place record)`);
          } else {
            console.log(`            💡 SUGGESTION: These appear to be duplicate places`);
            console.log(`               Option 1: Delete "${place.name}" (${place.slug})`);
            console.log(`               Option 2: Keep both if they're actually different places`);
          }
        } else {
          console.log(`         ✅ Available - can use this Place ID`);
        }
      }

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error) {
      console.log(`   ❌ Error searching: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   These places likely share the same physical location as existing places.`);
  console.log(`   Review the suggestions above and decide whether to:`);
  console.log(`   1. Delete the duplicate place`);
  console.log(`   2. Manually assign a different Google Place ID`);
  console.log(`   3. Keep without Google Place ID if they're different locations`);
}

investigateBackfillFailures()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
