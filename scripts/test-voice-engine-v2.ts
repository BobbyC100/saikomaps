/**
 * Test script for Saiko Voice Engine v2.0
 * Tests tagline generation with sample identity signals
 */

import {
  enrichPlaceV2,
  type TaglineGenerationInputV2,
  type IdentitySignals,
  type PlaceContext,
} from '../lib/voice-engine-v2';

// ============================================
// TEST DATA
// ============================================

interface TestCase {
  name: string;
  signals: IdentitySignals;
  context: PlaceContext;
}

const TEST_CASES: TestCase[] = [
  // Test 1: Institution with signature dish
  {
    name: "Langer's Deli",
    signals: {
      cuisine_posture: 'protein-centric',
      service_model: 'counter',
      price_tier: '$$',
      wine_program_intent: 'none',
      place_personality: 'institution',
      signature_dishes: ['#19 pastrami sandwich'],
      key_producers: [],
      vibe_words: ['classic', 'no-frills'],
      origin_story_type: 'family-legacy',
      extraction_confidence: 0.85,
      confidence_tier: 'publish',
      input_quality: 'good',
    },
    context: {
      name: "Langer's Delicatessen",
      neighborhood: 'Westlake',
      street: 'Alvarado St',
      outdoor_seating: false,
      popularity_tier: 'institution',
      curator_note: null,
    },
  },
  
  // Test 2: Chef-driven with natural wine
  {
    name: 'Bacetti Trattoria',
    signals: {
      cuisine_posture: 'carb-forward',
      service_model: 'a-la-carte',
      price_tier: '$$',
      wine_program_intent: 'natural',
      place_personality: 'chef-driven',
      signature_dishes: ['cacio e pepe', 'oxtail ragu'],
      key_producers: [],
      vibe_words: ['intimate', 'unhurried', 'neighborhood'],
      origin_story_type: 'chef-journey',
      extraction_confidence: 0.78,
      confidence_tier: 'publish',
      input_quality: 'good',
    },
    context: {
      name: 'Bacetti',
      neighborhood: 'Echo Park',
      street: 'Sunset Blvd',
      outdoor_seating: true,
      popularity_tier: 'known',
      curator_note: null,
    },
  },
  
  // Test 3: Neighborhood spot with vibe words
  {
    name: 'Canyon Coffee',
    signals: {
      cuisine_posture: null,
      service_model: 'counter',
      price_tier: '$$',
      wine_program_intent: 'none',
      place_personality: 'neighborhood-spot',
      signature_dishes: [],
      key_producers: [],
      vibe_words: ['laid-back', 'natural light', 'unhurried'],
      origin_story_type: 'neighborhood-love',
      extraction_confidence: 0.72,
      confidence_tier: 'publish',
      input_quality: 'partial',
    },
    context: {
      name: 'Canyon Coffee',
      neighborhood: 'Mid-City',
      street: 'La Brea Ave',
      outdoor_seating: true,
      popularity_tier: 'known',
      curator_note: null,
    },
  },
  
  // Test 4: Hidden gem with minimal signals
  {
    name: 'Sticky Rice',
    signals: {
      cuisine_posture: 'balanced',
      service_model: 'a-la-carte',
      price_tier: '$',
      wine_program_intent: 'minimal',
      place_personality: 'hidden-gem',
      signature_dishes: [],
      key_producers: [],
      vibe_words: ['casual', 'neighborhood'],
      origin_story_type: null,
      extraction_confidence: 0.55,
      confidence_tier: 'review',
      input_quality: 'minimal',
    },
    context: {
      name: 'Sticky Rice',
      neighborhood: 'Echo Park',
      street: 'Sunset Blvd',
      outdoor_seating: false,
      popularity_tier: 'discovery',
      curator_note: null,
    },
  },
];

// ============================================
// TEST RUNNER
// ============================================

async function testVoiceEngineV2() {
  console.log('\n🎙️  Testing Saiko Voice Engine v2.0');
  console.log('==========================================\n');
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    const input: TaglineGenerationInputV2 = {
      signals: testCase.signals,
      context: testCase.context,
    };
    
    console.log(`\n[TEST ${i + 1}/${TEST_CASES.length}] ${testCase.context.name}`);
    console.log('─'.repeat(80));
    console.log(`Location: ${testCase.context.street}, ${testCase.context.neighborhood}`);
    console.log('');
    console.log('IDENTITY SIGNALS:');
    console.log(`  Place Personality: ${testCase.signals.place_personality || 'null'}`);
    console.log(`  Cuisine Posture: ${testCase.signals.cuisine_posture || 'null'}`);
    console.log(`  Service Model: ${testCase.signals.service_model || 'null'}`);
    console.log(`  Price Tier: ${testCase.signals.price_tier || 'null'}`);
    console.log(`  Wine Program: ${testCase.signals.wine_program_intent || 'none'}`);
    
    if (testCase.signals.signature_dishes.length > 0) {
      console.log(`  Signature Dishes: ${testCase.signals.signature_dishes.join(', ')}`);
    }
    if (testCase.signals.vibe_words.length > 0) {
      console.log(`  Vibe Words: ${testCase.signals.vibe_words.join(', ')}`);
    }
    
    console.log(`  Confidence: ${testCase.signals.extraction_confidence.toFixed(2)} (${testCase.signals.confidence_tier})`);
    console.log(`  Input Quality: ${testCase.signals.input_quality}`);
    console.log('');
    
    try {
      // Generate tagline
      const result = await enrichPlaceV2(input);
      
      console.log(`🏷️  SELECTED TAGLINE (Pattern: ${result.taglinePattern}):`);
      console.log(`   "${result.tagline}"`);
      console.log('');
      console.log('📝 All Candidates:');
      const patterns = ['food', 'neighborhood', 'vibe', 'authority'];
      result.taglineCandidates.forEach((candidate, idx) => {
        const marker = candidate === result.tagline ? '✅' : '  ';
        console.log(`   ${marker} [${patterns[idx]}] "${candidate}"`);
      });
      console.log('');
      console.log(`🎨 Ad Unit Type: ${result.adUnitType}`);
      console.log(`📊 Version: ${result.taglineVersion}`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      if (error instanceof Error) {
        console.error(`   Stack: ${error.stack}`);
      }
    }
    
    console.log('═'.repeat(80));
  }
  
  console.log('\n✅ Voice Engine v2.0 test complete!\n');
}

// ============================================
// RUN TEST
// ============================================

testVoiceEngineV2().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
