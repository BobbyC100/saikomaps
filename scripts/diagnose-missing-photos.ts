import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PhotoIssue {
  placeId: string;
  placeName: string;
  slug: string;
  issue: string;
  googlePhotos: any;
  userPhotos: string[];
}

async function diagnoseMissingPhotos() {
  console.log('🔍 Diagnosing Photo Display Issues...\n');

  // Check API key configuration
  console.log('1️⃣ Checking API Key Configuration:');
  console.log('─'.repeat(70));
  const publicKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const serverKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!publicKey) {
    console.log('❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing!');
    console.log('   Photos will NOT display on client-side rendered pages.');
  } else {
    console.log(`✅ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY exists (${publicKey.substring(0, 10)}...)`);
  }
  
  if (!serverKey) {
    console.log('⚠️  GOOGLE_PLACES_API_KEY is missing (needed for server-side)');
  } else {
    console.log(`✅ GOOGLE_PLACES_API_KEY exists (${serverKey.substring(0, 10)}...)`);
  }
  console.log('');

  // Fetch all places with their photo data
  const places = await prisma.places.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      googlePhotos: true,
      googlePlaceId: true,
    },
  });

  const issues: PhotoIssue[] = [];
  let validPhotos = 0;
  let nullPhotos = 0;
  let emptyArrayPhotos = 0;
  let malformedPhotos = 0;
  let stringPhotos = 0;
  let objectPhotos = 0;

  console.log('2️⃣ Analyzing Photo Data Structure:');
  console.log('─'.repeat(70));

  places.forEach((place) => {
    const gPhotos = place.googlePhotos;

    // Case 1: null or undefined
    if (gPhotos === null || gPhotos === undefined) {
      nullPhotos++;
      if (place.googlePlaceId) {
        issues.push({
          placeId: place.id,
          placeName: place.name,
          slug: place.slug,
          issue: 'Has Place ID but googlePhotos is null',
          googlePhotos: null,
          userPhotos: [],
        });
      }
      return;
    }

    // Case 2: Check if it's an array
    if (Array.isArray(gPhotos)) {
      if (gPhotos.length === 0) {
        emptyArrayPhotos++;
        if (place.googlePlaceId) {
          issues.push({
            placeId: place.id,
            placeName: place.name,
            slug: place.slug,
            issue: 'Has Place ID but googlePhotos is empty array',
            googlePhotos: gPhotos,
            userPhotos: [],
          });
        }
        return;
      }

      // Check first photo structure
      const firstPhoto = gPhotos[0];
      if (typeof firstPhoto === 'object' && firstPhoto !== null) {
        const hasPhotoRef = 'photo_reference' in firstPhoto || 'photoReference' in firstPhoto;
        const hasName = 'name' in firstPhoto;
        
        if (hasPhotoRef || hasName) {
          validPhotos++;
        } else {
          malformedPhotos++;
          issues.push({
            placeId: place.id,
            placeName: place.name,
            slug: place.slug,
            issue: 'Photo object missing photo_reference/photoReference/name',
            googlePhotos: gPhotos,
            userPhotos: [],
          });
        }
      } else {
        malformedPhotos++;
        issues.push({
          placeId: place.id,
          placeName: place.name,
          slug: place.slug,
          issue: 'Photo array contains non-object data',
          googlePhotos: gPhotos,
          userPhotos: [],
        });
      }
    } else if (typeof gPhotos === 'string') {
      stringPhotos++;
      issues.push({
        placeId: place.id,
        placeName: place.name,
        slug: place.slug,
        issue: 'googlePhotos is a string (should be array)',
        googlePhotos: gPhotos,
        userPhotos: [],
      });
    } else if (typeof gPhotos === 'object') {
      objectPhotos++;
      issues.push({
        placeId: place.id,
        placeName: place.name,
        slug: place.slug,
        issue: 'googlePhotos is an object (should be array)',
        googlePhotos: gPhotos,
        userPhotos: [],
      });
    }
  });

  console.log(`Total places analyzed:     ${places.length}`);
  console.log(`✅ Valid photo data:       ${validPhotos} (${Math.round(validPhotos * 100 / places.length)}%)`);
  console.log(`❌ Null/undefined:         ${nullPhotos}`);
  console.log(`⚠️  Empty arrays:          ${emptyArrayPhotos}`);
  console.log(`❌ Malformed structures:   ${malformedPhotos}`);
  console.log(`❌ String type:            ${stringPhotos}`);
  console.log(`❌ Object type (non-arr):  ${objectPhotos}`);
  console.log('');

  // Show issues
  if (issues.length > 0) {
    console.log('3️⃣ Places with Photo Issues:');
    console.log('─'.repeat(70));
    
    // Group by issue type
    const groupedIssues = issues.reduce((acc, issue) => {
      if (!acc[issue.issue]) acc[issue.issue] = [];
      acc[issue.issue].push(issue);
      return acc;
    }, {} as Record<string, PhotoIssue[]>);

    Object.entries(groupedIssues).forEach(([issueType, places]) => {
      console.log(`\n📋 ${issueType} (${places.length} places):`);
      places.slice(0, 5).forEach((place) => {
        console.log(`   • ${place.placeName} (${place.slug})`);
        if (place.googlePhotos) {
          console.log(`     Data: ${JSON.stringify(place.googlePhotos).substring(0, 100)}...`);
        }
      });
      if (places.length > 5) {
        console.log(`   ... and ${places.length - 5} more`);
      }
    });
  } else {
    console.log('3️⃣ No photo data issues found! ✅');
  }

  console.log('\n');
  console.log('4️⃣ Sample Valid Photo Structure:');
  console.log('─'.repeat(70));
  
  const validPlace = places.find(p => {
    const gp = p.googlePhotos;
    return Array.isArray(gp) && gp.length > 0 && typeof gp[0] === 'object';
  });

  if (validPlace && Array.isArray(validPlace.googlePhotos)) {
    console.log(`Example from: ${validPlace.name}`);
    console.log(JSON.stringify(validPlace.googlePhotos[0], null, 2));
  }

  console.log('\n');
  console.log('5️⃣ Recommendations:');
  console.log('─'.repeat(70));
  
  if (!publicKey) {
    console.log('🔧 Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file');
  }
  
  if (nullPhotos > 0 || emptyArrayPhotos > 0) {
    console.log(`🔧 Run backfill script for ${nullPhotos + emptyArrayPhotos} places missing photo data`);
  }
  
  if (malformedPhotos > 0 || stringPhotos > 0 || objectPhotos > 0) {
    console.log(`🔧 Fix ${malformedPhotos + stringPhotos + objectPhotos} places with malformed data structures`);
  }

  console.log('─'.repeat(70));
}

diagnoseMissingPhotos()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
