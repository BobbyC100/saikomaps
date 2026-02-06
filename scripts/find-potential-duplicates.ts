import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findPotentialDuplicates() {
  console.log('🔍 Searching for potential duplicate places...\n');

  // 1. Check for duplicate google_place_ids
  console.log('1️⃣ Checking for duplicate Google Place IDs...');
  const duplicatePlaceIds = await prisma.$queryRaw<Array<{
    google_place_id: string;
    count: bigint;
  }>>`
    SELECT google_place_id, COUNT(*) as count
    FROM places
    WHERE google_place_id IS NOT NULL
    GROUP BY google_place_id
    HAVING COUNT(*) > 1
  `;

  if (duplicatePlaceIds.length > 0) {
    console.log(`   ❌ Found ${duplicatePlaceIds.length} duplicate Google Place ID(s)`);
    duplicatePlaceIds.forEach(d => {
      console.log(`      • ${d.google_place_id}: ${d.count} places`);
    });
  } else {
    console.log(`   ✅ No duplicate Google Place IDs found`);
  }

  // 2. Check for duplicate slugs
  console.log('\n2️⃣ Checking for duplicate slugs...');
  const duplicateSlugs = await prisma.$queryRaw<Array<{
    slug: string;
    count: bigint;
  }>>`
    SELECT slug, COUNT(*) as count
    FROM places
    GROUP BY slug
    HAVING COUNT(*) > 1
  `;

  if (duplicateSlugs.length > 0) {
    console.log(`   ❌ Found ${duplicateSlugs.length} duplicate slug(s)`);
    duplicateSlugs.forEach(d => {
      console.log(`      • ${d.slug}: ${d.count} places`);
    });
  } else {
    console.log(`   ✅ No duplicate slugs found`);
  }

  // 3. Check for similar names at same location
  console.log('\n3️⃣ Checking for similar names at same location...');
  const placesWithCoords = await prisma.place.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
      googlePlaceId: true,
      address: true,
    },
  });

  const nearDuplicates: Array<{
    place1: any;
    place2: any;
    distance: number;
    nameSimilarity: number;
  }> = [];

  for (let i = 0; i < placesWithCoords.length; i++) {
    for (let j = i + 1; j < placesWithCoords.length; j++) {
      const p1 = placesWithCoords[i];
      const p2 = placesWithCoords[j];

      if (!p1.latitude || !p2.latitude || !p1.longitude || !p2.longitude) continue;

      const distance = calculateDistance(
        Number(p1.latitude),
        Number(p1.longitude),
        Number(p2.latitude),
        Number(p2.longitude)
      );

      // If within 50 meters
      if (distance < 0.05) {
        const nameSim = calculateNameSimilarity(p1.name, p2.name);
        
        // If name is >70% similar or exact match
        if (nameSim > 0.7) {
          nearDuplicates.push({
            place1: p1,
            place2: p2,
            distance,
            nameSimilarity: nameSim,
          });
        }
      }
    }
  }

  if (nearDuplicates.length > 0) {
    console.log(`   ⚠️  Found ${nearDuplicates.length} potential duplicate(s) (same location + similar name):`);
    nearDuplicates.forEach(dup => {
      console.log(`\n      • "${dup.place1.name}" (${dup.place1.slug})`);
      console.log(`        vs "${dup.place2.name}" (${dup.place2.slug})`);
      console.log(`        Distance: ${(dup.distance * 1000).toFixed(1)}m, Name similarity: ${(dup.nameSimilarity * 100).toFixed(0)}%`);
      console.log(`        Place ID 1: ${dup.place1.googlePlaceId || 'none'}`);
      console.log(`        Place ID 2: ${dup.place2.googlePlaceId || 'none'}`);
    });
  } else {
    console.log(`   ✅ No near-duplicate places found`);
  }

  // 4. Check for places without place IDs that failed backfill
  console.log('\n4️⃣ Checking places that couldn\'t get Google Place IDs...');
  const placesWithoutIds = await prisma.place.findMany({
    where: {
      placesDataCachedAt: null,
      googlePlaceId: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  });

  if (placesWithoutIds.length > 0) {
    console.log(`   ⚠️  Found ${placesWithoutIds.length} place(s) without Google Place IDs:`);
    placesWithoutIds.slice(0, 5).forEach(p => {
      console.log(`      • ${p.name} (${p.slug})`);
      console.log(`        Address: ${p.address || 'none'}`);
    });
    if (placesWithoutIds.length > 5) {
      console.log(`      ... and ${placesWithoutIds.length - 5} more`);
    }
  } else {
    console.log(`   ✅ All places have been processed`);
  }

  // 5. Summary
  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   Duplicate Google Place IDs: ${duplicatePlaceIds.length}`);
  console.log(`   Duplicate Slugs: ${duplicateSlugs.length}`);
  console.log(`   Near-duplicate locations: ${nearDuplicates.length}`);
  console.log(`   Places without Google IDs: ${placesWithoutIds.length}`);

  if (duplicatePlaceIds.length > 0) {
    console.log(`\n💡 Next step: Run cleanup script to merge duplicates`);
    console.log(`   npm run cleanup:duplicates`);
  }
  
  if (nearDuplicates.length > 0) {
    console.log(`\n💡 Review near-duplicates manually - they may be different places or duplicates`);
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Haversine formula to calculate distance in kilometers
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateNameSimilarity(name1: string, name2: string): number {
  // Simple Levenshtein-based similarity
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(s1, s2);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

findPotentialDuplicates()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
