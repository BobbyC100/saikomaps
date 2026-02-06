import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  googlePlaceId: string;
  places: Array<{
    id: string;
    slug: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    hasPhotos: boolean;
    mapCount: number;
    bookmarkCount: number;
    hasNeighborhood: boolean;
    hasCuisineType: boolean;
    hasTagline: boolean;
  }>;
}

async function findDuplicatePlaces() {
  console.log('🔍 Searching for duplicate places...\n');

  // Find google_place_ids that appear more than once
  const duplicates = await prisma.$queryRaw<Array<{
    google_place_id: string;
    count: bigint;
  }>>`
    SELECT google_place_id, COUNT(*) as count
    FROM places
    WHERE google_place_id IS NOT NULL
    GROUP BY google_place_id
    HAVING COUNT(*) > 1
    ORDER BY count DESC, google_place_id
  `;

  if (duplicates.length === 0) {
    console.log('✅ No duplicate places found!');
    return;
  }

  console.log(`Found ${duplicates.length} Google Place IDs with duplicates:\n`);

  const duplicateGroups: DuplicateGroup[] = [];

  for (const dup of duplicates) {
    const placeId = dup.google_place_id;
    
    // Get all places with this google_place_id
    const places = await prisma.place.findMany({
      where: { googlePlaceId: placeId },
      include: {
        mapPlaces: {
          include: {
            map: {
              select: { title: true, slug: true }
            }
          }
        },
        viewerBookmarks: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const placeDetails = places.map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      hasPhotos: p.googlePhotos !== null && 
                 Array.isArray(p.googlePhotos) && 
                 p.googlePhotos.length > 0,
      mapCount: p.mapPlaces.length,
      bookmarkCount: p.viewerBookmarks.length,
      hasNeighborhood: p.neighborhood !== null,
      hasCuisineType: p.cuisineType !== null,
      hasTagline: p.tagline !== null,
    }));

    duplicateGroups.push({
      googlePlaceId: placeId,
      places: placeDetails,
    });
  }

  // Display duplicates
  console.log('─'.repeat(80));
  duplicateGroups.forEach((group, index) => {
    console.log(`\n${index + 1}. Google Place ID: ${group.googlePlaceId}`);
    console.log(`   Found ${group.places.length} places:\n`);

    group.places.forEach((place, i) => {
      const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      console.log(`   ${emoji} "${place.name}" (${place.slug})`);
      console.log(`      ID: ${place.id}`);
      console.log(`      Created: ${place.createdAt.toISOString().split('T')[0]}`);
      console.log(`      Used in ${place.mapCount} map(s), ${place.bookmarkCount} bookmark(s)`);
      
      const enrichment = [];
      if (place.hasPhotos) enrichment.push('photos');
      if (place.hasNeighborhood) enrichment.push('neighborhood');
      if (place.hasCuisineType) enrichment.push('cuisine');
      if (place.hasTagline) enrichment.push('tagline');
      
      console.log(`      Enrichment: ${enrichment.length > 0 ? enrichment.join(', ') : 'none'}`);
      console.log('');
    });

    // Recommend which to keep
    const recommended = recommendPlaceToKeep(group.places);
    console.log(`   💡 Recommendation: Keep "${recommended.name}" (${recommended.slug})`);
    console.log(`      Reason: ${getRecommendationReason(group.places, recommended)}`);
    console.log('');
    console.log('─'.repeat(80));
  });

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total duplicate groups: ${duplicateGroups.length}`);
  console.log(`   Total places to clean up: ${duplicateGroups.reduce((sum, g) => sum + g.places.length - 1, 0)}`);
  
  console.log(`\n💡 Next Steps:`);
  console.log(`   1. Review the recommendations above`);
  console.log(`   2. Run the cleanup script to merge duplicates:`);
  console.log(`      npm run cleanup:duplicates -- --execute`);
  console.log(`   3. Or manually delete specific duplicates`);
}

function recommendPlaceToKeep(places: DuplicateGroup['places']) {
  // Score each place based on:
  // - Number of maps it's used in (highest priority)
  // - Number of bookmarks
  // - Amount of enrichment data
  // - Oldest created date (tie-breaker)
  
  let bestPlace = places[0];
  let bestScore = 0;

  for (const place of places) {
    let score = 0;
    
    // Maps usage is most important (100 points per map)
    score += place.mapCount * 100;
    
    // Bookmarks (10 points per bookmark)
    score += place.bookmarkCount * 10;
    
    // Enrichment data (5 points each)
    if (place.hasPhotos) score += 5;
    if (place.hasNeighborhood) score += 5;
    if (place.hasCuisineType) score += 5;
    if (place.hasTagline) score += 5;
    
    // Older places get slight preference (1 point per day older, max 365)
    const daysOld = Math.min(
      Math.floor((Date.now() - place.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      365
    );
    score += daysOld / 365;

    if (score > bestScore) {
      bestScore = score;
      bestPlace = place;
    }
  }

  return bestPlace;
}

function getRecommendationReason(places: DuplicateGroup['places'], recommended: DuplicateGroup['places'][0]) {
  const reasons = [];
  
  if (recommended.mapCount > 0) {
    const othersWithMaps = places.filter(p => p.id !== recommended.id && p.mapCount > 0).length;
    if (othersWithMaps === 0) {
      reasons.push(`only one used in maps (${recommended.mapCount})`);
    } else {
      reasons.push(`used in most maps (${recommended.mapCount})`);
    }
  }
  
  if (recommended.bookmarkCount > 0) {
    reasons.push(`has ${recommended.bookmarkCount} bookmark(s)`);
  }
  
  const enrichmentCount = [
    recommended.hasPhotos,
    recommended.hasNeighborhood,
    recommended.hasCuisineType,
    recommended.hasTagline,
  ].filter(Boolean).length;
  
  if (enrichmentCount > 0) {
    reasons.push(`most enriched (${enrichmentCount} fields)`);
  }
  
  if (reasons.length === 0) {
    reasons.push('oldest entry');
  }
  
  return reasons.join(', ');
}

findDuplicatePlaces()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
