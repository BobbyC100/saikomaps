import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listPlacesNeedingPhotos() {
  console.log('🔍 Finding places with Place IDs but no photos...\n');

  // Find places with googlePlaceId but null/empty googlePhotos using raw SQL
  const placesNeedingPhotos = await prisma.$queryRaw<Array<{
    id: string;
    slug: string;
    name: string;
    google_place_id: string;
    google_photos: any;
    places_data_cached_at: Date | null;
  }>>`
    SELECT id, slug, name, google_place_id, google_photos, places_data_cached_at
    FROM places
    WHERE google_place_id IS NOT NULL
      AND (google_photos IS NULL 
           OR google_photos::text = '[]' 
           OR google_photos::text = 'null')
    ORDER BY name ASC
  `;

  console.log(`Found ${placesNeedingPhotos.length} places with Place IDs but no photos:\n`);
  console.log('─'.repeat(80));
  console.log('Name'.padEnd(40), 'Slug'.padEnd(25), 'Cached?');
  console.log('─'.repeat(80));

  let needsBackfill = 0;
  let needsReBackfill = 0;

  placesNeedingPhotos.forEach((place) => {
    const cached = place.places_data_cached_at ? '✅ Yes' : '❌ No';
    console.log(
      place.name.substring(0, 38).padEnd(40),
      place.slug.substring(0, 23).padEnd(25),
      cached
    );
    
    if (!place.places_data_cached_at) {
      needsBackfill++;
    } else {
      needsReBackfill++;
    }
  });

  console.log('─'.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`  • ${needsBackfill} places never cached (will be picked up by normal backfill)`);
  console.log(`  • ${needsReBackfill} places cached but got no photos (need --force backfill)`);
  
  if (needsReBackfill > 0) {
    console.log(`\n💡 To re-fetch these ${needsReBackfill} places, you can:`);
    console.log(`   1. Run backfill with --force flag for all places`);
    console.log(`   2. Run backfill for specific slugs:`);
    
    const cachedWithoutPhotos = placesNeedingPhotos.filter(p => p.places_data_cached_at);
    cachedWithoutPhotos.slice(0, 3).forEach(p => {
      console.log(`      npm run backfill:google -- --slug ${p.slug}`);
    });
    if (cachedWithoutPhotos.length > 3) {
      console.log(`      ... and ${cachedWithoutPhotos.length - 3} more`);
    }
  }
}

listPlacesNeedingPhotos()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
