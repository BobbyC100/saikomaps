/**
 * Test script for Saiko Voice Engine v1.1
 * Tests tagline generation with sample restaurant data
 */

import { enrichPlace, extractSignalsAndAttributes } from '../lib/voice-engine';
import type { GooglePlaceData } from '../lib/voice-engine';

// Sample test data
const TEST_RESTAURANTS: GooglePlaceData[] = [
  {
    displayName: 'Guisados',
    formattedAddress: '2100 E Cesar E Chavez Ave, Los Angeles, CA 90033',
    addressComponents: [
      { long_name: 'Boyle Heights', types: ['neighborhood'] },
      { long_name: 'Los Angeles', types: ['locality'] },
    ],
    primaryType: 'mexican_restaurant',
    types: ['mexican_restaurant', 'restaurant', 'food'],
    priceLevel: 1,
    userRatingCount: 2847,
    outdoorSeating: false,
    servesBeer: true,
    servesWine: false,
    servesCocktails: false,
    servesBreakfast: true,
    servesBrunch: false,
    servesDinner: true,
    liveMusic: false,
    dineIn: true,
    takeout: true,
    delivery: false,
  },
  {
    displayName: 'Canyon Coffee',
    formattedAddress: '615 N La Brea Ave, Los Angeles, CA 90036',
    addressComponents: [
      { long_name: 'Mid-City', types: ['neighborhood'] },
      { long_name: 'Los Angeles', types: ['locality'] },
    ],
    primaryType: 'coffee_shop',
    types: ['coffee_shop', 'cafe', 'food'],
    priceLevel: 2,
    userRatingCount: 456,
    outdoorSeating: true,
    servesBeer: false,
    servesWine: false,
    servesCocktails: false,
    servesBreakfast: true,
    servesBrunch: true,
    liveMusic: false,
    dineIn: true,
    takeout: true,
    delivery: false,
  },
  {
    displayName: 'Lowboy',
    formattedAddress: '4000 Sunset Blvd, Los Angeles, CA 90029',
    addressComponents: [
      { long_name: 'Silver Lake', types: ['neighborhood'] },
      { long_name: 'Los Angeles', types: ['locality'] },
    ],
    primaryType: 'american_restaurant',
    types: ['american_restaurant', 'bar', 'restaurant'],
    priceLevel: 2,
    userRatingCount: 789,
    outdoorSeating: true,
    servesBeer: true,
    servesWine: true,
    servesCocktails: true,
    servesBreakfast: false,
    servesBrunch: false,
    servesDinner: true,
    liveMusic: false,
    dineIn: true,
    takeout: false,
    delivery: false,
  },
  {
    displayName: 'Tacos El Gordo',
    formattedAddress: '689 H St, Chula Vista, CA 91910',
    addressComponents: [
      { long_name: 'National City', types: ['neighborhood'] },
      { long_name: 'Chula Vista', types: ['locality'] },
    ],
    primaryType: 'mexican_restaurant',
    types: ['mexican_restaurant', 'restaurant', 'food'],
    priceLevel: 1,
    userRatingCount: 2400,
    outdoorSeating: false,
    servesBeer: true,
    servesWine: false,
    servesCocktails: false,
    servesBreakfast: false,
    servesBrunch: false,
    servesDinner: true,
    liveMusic: false,
    dineIn: true,
    takeout: true,
    delivery: false,
  },
];

async function testVoiceEngine() {
  console.log('🎙️  Testing Saiko Voice Engine v1.1\n');
  console.log('=' .repeat(80));
  
  for (const restaurant of TEST_RESTAURANTS) {
    console.log(`\n📍 ${restaurant.displayName}`);
    console.log(`   ${restaurant.formattedAddress}`);
    console.log(`   Category: ${restaurant.primaryType}`);
    console.log(`   Reviews: ${restaurant.userRatingCount}`);
    console.log('-'.repeat(80));
    
    try {
      // Extract signals
      const { signals, derived } = extractSignalsAndAttributes(restaurant);
      
      console.log(`   Popularity Tier: ${derived.popularityTier}`);
      console.log(`   Vibe: ${derived.vibe}`);
      console.log(`   Time of Day: ${derived.timeOfDay}`);
      console.log();
      
      // Generate tagline
      const result = await enrichPlace({ signals, derived });
      
      console.log(`   🏷️  SELECTED TAGLINE (Pattern: ${result.taglinePattern}):`);
      console.log(`   "${result.tagline}"`);
      console.log();
      console.log('   📝 All Candidates:');
      result.taglineCandidates.forEach((candidate, i) => {
        const patterns = ['food', 'neighborhood', 'vibe', 'authority'];
        const marker = i === result.taglineCandidates.indexOf(result.tagline) ? '✅' : '  ';
        console.log(`   ${marker} [${patterns[i]}] "${candidate}"`);
      });
      console.log();
      console.log(`   🎨 Ad Unit Type: ${result.adUnitType}`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
    
    console.log('=' .repeat(80));
  }
  
  console.log('\n✅ Voice Engine test complete!\n');
}

// Run test
testVoiceEngine().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
