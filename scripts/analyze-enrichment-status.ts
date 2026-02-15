import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeEnrichmentStatus() {
  console.log('🔍 Analyzing Place Enrichment Status...\n');

  const places = await prisma.places.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      googlePlaceId: true,
      googlePhotos: true,
      placesDataCachedAt: true,
      neighborhood: true,
      cuisineType: true,
      tagline: true,
      taglineGenerated: true,
      taglinePattern: true,
      vibeTags: true,
      tips: true,
      pullQuote: true,
      map_places: {
        select: {
          lists: {
            select: { title: true }
          }
        }
      },
    },
  });

  // Categorize places by enrichment level
  let hasGooglePlaceId = 0;
  let hasPhotos = 0;
  let hasNeighborhood = 0;
  let hasCuisineType = 0;
  let hasTagline = 0;
  let hasVibeTags = 0;
  let hasTips = 0;
  let hasPullQuote = 0;
  let fullyEnriched = 0;

  const enrichmentLevels: Record<string, any[]> = {
    'Full Stack (All)': [],
    'Voice Engine + Google': [],
    'Google Only': [],
    'Minimal': [],
    'None': [],
  };

  places.forEach((place) => {
    const hasGPID = !!place.googlePlaceId;
    const hasGPhotos = place.googlePhotos !== null && 
                       Array.isArray(place.googlePhotos) && 
                       place.googlePhotos.length > 0;
    const hasNH = !!place.neighborhood;
    const hasCT = !!place.cuisineType;
    const hasTL = !!place.tagline;
    const hasVT = place.vibeTags.length > 0;
    const hasTI = place.tips.length > 0;
    const hasPQ = !!place.pullQuote;

    // Count enrichments
    if (hasGPID) hasGooglePlaceId++;
    if (hasGPhotos) hasPhotos++;
    if (hasNH) hasNeighborhood++;
    if (hasCT) hasCuisineType++;
    if (hasTL) hasTagline++;
    if (hasVT) hasVibeTags++;
    if (hasTI) hasTips++;
    if (hasPQ) hasPullQuote++;

    // Categorize
    const voiceEnriched = hasTL || hasVT || hasTI || hasPQ;
    const googleEnriched = hasGPID && hasGPhotos;

    if (googleEnriched && voiceEnriched) {
      fullyEnriched++;
      enrichmentLevels['Full Stack (All)'].push(place);
    } else if (voiceEnriched && !googleEnriched) {
      enrichmentLevels['Voice Engine + Google'].push(place);
    } else if (googleEnriched && !voiceEnriched) {
      enrichmentLevels['Google Only'].push(place);
    } else if (hasGPID || hasNH || hasCT) {
      enrichmentLevels['Minimal'].push(place);
    } else {
      enrichmentLevels['None'].push(place);
    }
  });

  // Display results
  console.log('📊 Overall Enrichment Coverage:');
  console.log('─'.repeat(80));
  console.log(`Total Places:                    ${places.length}`);
  console.log(`Google Place ID:                 ${hasGooglePlaceId} (${Math.round(hasGooglePlaceId * 100 / places.length)}%)`);
  console.log(`Photos:                          ${hasPhotos} (${Math.round(hasPhotos * 100 / places.length)}%)`);
  console.log(`Neighborhood:                    ${hasNeighborhood} (${Math.round(hasNeighborhood * 100 / places.length)}%)`);
  console.log(`Cuisine Type:                    ${hasCuisineType} (${Math.round(hasCuisineType * 100 / places.length)}%)`);
  console.log('');
  console.log('🎤 Voice Engine Enrichment:');
  console.log(`Tagline:                         ${hasTagline} (${Math.round(hasTagline * 100 / places.length)}%)`);
  console.log(`Vibe Tags:                       ${hasVibeTags} (${Math.round(hasVibeTags * 100 / places.length)}%)`);
  console.log(`Tips:                            ${hasTips} (${Math.round(hasTips * 100 / places.length)}%)`);
  console.log(`Pull Quote:                      ${hasPullQuote} (${Math.round(hasPullQuote * 100 / places.length)}%)`);
  console.log('');
  console.log(`🎯 Fully Enriched (All fields):  ${fullyEnriched} (${Math.round(fullyEnriched * 100 / places.length)}%)`);

  console.log('\n' + '─'.repeat(80));
  console.log('\n📈 Enrichment Level Breakdown:\n');

  Object.entries(enrichmentLevels).forEach(([level, levelPlaces]) => {
    const count = levelPlaces.length;
    const pct = Math.round(count * 100 / places.length);
    console.log(`${level.padEnd(30)} ${count.toString().padStart(3)} places (${pct}%)`);
  });

  // Show places researched with Voice Engine
  console.log('\n' + '─'.repeat(80));
  console.log('\n🎤 Places with Voice Engine Research:\n');

  const voiceEnrichedPlaces = places.filter(p => 
    p.tagline || p.vibeTags.length > 0 || p.tips.length > 0 || p.pullQuote
  ).sort((a, b) => (b.taglineGenerated?.getTime() || 0) - (a.taglineGenerated?.getTime() || 0));

  if (voiceEnrichedPlaces.length > 0) {
    console.log(`Found ${voiceEnrichedPlaces.length} places with Voice Engine enrichment:\n`);
    
    voiceEnrichedPlaces.slice(0, 20).forEach((place) => {
      const enrichments = [];
      if (place.tagline) enrichments.push(`tagline: "${place.tagline.substring(0, 40)}..."`);
      if (place.vibeTags.length > 0) enrichments.push(`vibeTags: ${place.vibeTags.length}`);
      if (place.tips.length > 0) enrichments.push(`tips: ${place.tips.length}`);
      if (place.pullQuote) enrichments.push('pull quote');
      
      console.log(`📍 ${place.name} (${place.slug})`);
      console.log(`   ${enrichments.join(', ')}`);
      if (place.taglineGenerated) {
        console.log(`   Generated: ${place.taglineGenerated.toISOString().split('T')[0]}`);
      }
      console.log('');
    });

    if (voiceEnrichedPlaces.length > 20) {
      console.log(`... and ${voiceEnrichedPlaces.length - 20} more\n`);
    }
  } else {
    console.log('No places with Voice Engine enrichment found.\n');
  }

  // Show places needing enrichment
  console.log('─'.repeat(80));
  console.log('\n⚠️  Places Needing Enrichment:\n');

  const needsGoogle = places.filter(p => 
    !p.googlePlaceId || !p.googlePhotos || 
    (Array.isArray(p.googlePhotos) && p.googlePhotos.length === 0)
  );

  const needsVoiceEngine = places.filter(p => 
    !p.tagline && p.vibeTags.length === 0 && p.tips.length === 0
  ).filter(p => p.map_places.length > 0); // Only places used in maps

  console.log(`📸 Need Google Places enrichment:  ${needsGoogle.length} places`);
  console.log(`🎤 Need Voice Engine enrichment:   ${needsVoiceEngine.length} places (in maps)`);

  if (needsVoiceEngine.length > 0) {
    console.log(`\n   Top 10 places needing Voice Engine enrichment:`);
    needsVoiceEngine.slice(0, 10).forEach(p => {
      console.log(`   • ${p.name} (${p.slug}) - Used in ${p.map_places.length} map(s)`);
    });
    if (needsVoiceEngine.length > 10) {
      console.log(`   ... and ${needsVoiceEngine.length - 10} more`);
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n💡 Recommended Actions:\n');
  
  if (needsGoogle.length > 0) {
    console.log(`1. Run backfill for ${needsGoogle.length} places missing Google data:`);
    console.log(`   npm run backfill:google`);
  }
  
  if (needsVoiceEngine.length > 0) {
    console.log(`\n2. Run Voice Engine enrichment for ${needsVoiceEngine.length} places in maps:`);
    console.log(`   npm run test:voice-engine`);
  }

  console.log('\n3. Check enrichment status regularly:');
  console.log(`   npm run analyze:enrichment`);
  
  console.log('─'.repeat(80));
}

analyzeEnrichmentStatus()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
