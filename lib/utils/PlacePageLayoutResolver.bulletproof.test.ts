/**
 * Test bulletproof validation and defensive rendering
 */

import {
  resolvePlacePageLayout,
  validateLayout,
  buildSafeFallbackLayout,
  debugLayout,
  type PlaceData,
  type RowConfig,
} from './PlacePageLayoutResolver';

console.log('='.repeat(60));
console.log('BULLETPROOF VALIDATION TESTS');
console.log('='.repeat(60));

// ============================================================================
// TEST 1: Normal Valid Layout
// ============================================================================

console.log('\n[TEST 1] Normal Valid Layout');
console.log('-'.repeat(60));

const validData: PlaceData = {
  hours: {},
  details: {},
  coverage: {
    quote: "Long quote over 120 characters to trigger standard variant. This should create a full-width coverage card.",
    source: "Test Source"
  },
  curator: null,
  gallery: null,
  tips: ["Tip 1", "Tip 2"],
  menu: null,
  wine: null,
  vibe: ["Tag 1", "Tag 2"],
  alsoOn: [{ id: '1', title: 'Test Map', slug: 'test', creatorName: 'tester', placeCount: 10 }]
};

const validLayout = resolvePlacePageLayout(validData);
const isValidLayout = validateLayout(validLayout);

console.log(debugLayout(validLayout));
console.log(`\n✓ Validation result: ${isValidLayout ? 'PASS' : 'FAIL'}`);

if (!isValidLayout) {
  console.error('❌ TEST 1 FAILED: Valid data should produce valid layout');
  process.exit(1);
}

// ============================================================================
// TEST 2: Safe Fallback Layout
// ============================================================================

console.log('\n[TEST 2] Safe Fallback Layout');
console.log('-'.repeat(60));

const fallbackLayout = buildSafeFallbackLayout(validData);
const isFallbackValid = validateLayout(fallbackLayout);

console.log(debugLayout(fallbackLayout));
console.log(`\n✓ Fallback validation: ${isFallbackValid ? 'PASS' : 'FAIL'}`);

if (!isFallbackValid) {
  console.error('❌ TEST 2 FAILED: Fallback layout should always be valid');
  process.exit(1);
}

if (fallbackLayout.length !== 1) {
  console.error(`❌ TEST 2 FAILED: Fallback should have exactly 1 row, got ${fallbackLayout.length}`);
  process.exit(1);
}

if (fallbackLayout[0].cards.length !== 2) {
  console.error(`❌ TEST 2 FAILED: Fallback should have 2 cards, got ${fallbackLayout[0].cards.length}`);
  process.exit(1);
}

// ============================================================================
// TEST 3: Manually Create Invalid Layout (Span-1 Non-Quiet)
// ============================================================================

console.log('\n[TEST 3] Invalid Layout Detection (Span-1 Non-Quiet)');
console.log('-'.repeat(60));

const invalidLayout: RowConfig[] = [
  {
    rowNumber: 1,
    cards: [
      { type: 'hours', span: 3, data: {} },
      { type: 'details', span: 3, data: {} }
    ]
  },
  {
    rowNumber: 2,
    cards: [
      { type: 'tips', span: 1, data: [] }, // INVALID: span-1 non-quiet
      { type: 'menu', span: 3, data: [] },
      { type: 'quiet', span: 2 }
    ]
  }
];

const isInvalidLayoutDetected = !validateLayout(invalidLayout);

console.log(debugLayout(invalidLayout));
console.log(`\n✓ Invalid layout detected: ${isInvalidLayoutDetected ? 'PASS' : 'FAIL'}`);

if (!isInvalidLayoutDetected) {
  console.error('❌ TEST 3 FAILED: Validator should catch span-1 non-quiet cards');
  process.exit(1);
}

// ============================================================================
// TEST 4: Row Sum Validation
// ============================================================================

console.log('\n[TEST 4] Row Sum Validation (Should Detect != 6)');
console.log('-'.repeat(60));

const wrongSumLayout: RowConfig[] = [
  {
    rowNumber: 1,
    cards: [
      { type: 'hours', span: 3, data: {} },
      { type: 'details', span: 2, data: {} } // Sum = 5, should fail
    ]
  }
];

const isWrongSumDetected = !validateLayout(wrongSumLayout);

console.log(debugLayout(wrongSumLayout));
console.log(`\n✓ Wrong sum detected: ${isWrongSumDetected ? 'PASS' : 'FAIL'}`);

if (!isWrongSumDetected) {
  console.error('❌ TEST 4 FAILED: Validator should catch rows that don\'t sum to 6');
  process.exit(1);
}

// ============================================================================
// TEST 5: Max Quiet Per Page
// ============================================================================

console.log('\n[TEST 5] Max Quiet Per Page Validation (Should Detect > 4)');
console.log('-'.repeat(60));

const tooManyQuietLayout: RowConfig[] = [
  {
    rowNumber: 1,
    cards: [
      { type: 'hours', span: 3, data: {} },
      { type: 'details', span: 3, data: {} }
    ]
  },
  {
    rowNumber: 2,
    cards: [
      { type: 'coverage', span: 4, data: {} },
      { type: 'quiet', span: 2 }
    ]
  },
  {
    rowNumber: 3,
    cards: [
      { type: 'quiet', span: 2 },
      { type: 'quiet', span: 2 },
      { type: 'quiet', span: 2 } // Total = 6 quiet units, exceeds max 4
    ]
  }
];

const isTooManyQuietDetected = !validateLayout(tooManyQuietLayout);

console.log(debugLayout(tooManyQuietLayout));
console.log(`\n✓ Too many quiet detected: ${isTooManyQuietDetected ? 'PASS' : 'FAIL'}`);

if (!isTooManyQuietDetected) {
  console.error('❌ TEST 5 FAILED: Validator should catch > 4 quiet units per page');
  process.exit(1);
}

// ============================================================================
// TEST 6: Row 2 No Quiet
// ============================================================================

console.log('\n[TEST 6] Row 2 No Quiet Validation');
console.log('-'.repeat(60));

const row2QuietLayout: RowConfig[] = [
  {
    rowNumber: 1,
    cards: [
      { type: 'hours', span: 3, data: {} },
      { type: 'details', span: 3, data: {} }
    ]
  },
  {
    rowNumber: 2,
    cards: [
      { type: 'coverage', span: 4, data: {} },
      { type: 'quiet', span: 2 } // INVALID: quiet in row 2
    ]
  }
];

const isRow2QuietDetected = !validateLayout(row2QuietLayout);

console.log(debugLayout(row2QuietLayout));
console.log(`\n✓ Row 2 quiet detected: ${isRow2QuietDetected ? 'PASS' : 'FAIL'}`);

if (!isRow2QuietDetected) {
  console.error('❌ TEST 6 FAILED: Validator should catch quiet cards in Row 2');
  process.exit(1);
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('BULLETPROOF VALIDATION TEST SUMMARY');
console.log('='.repeat(60));
console.log('✓ TEST 1: Valid layout validation - PASS');
console.log('✓ TEST 2: Safe fallback layout - PASS');
console.log('✓ TEST 3: Span-1 non-quiet detection - PASS');
console.log('✓ TEST 4: Row sum validation - PASS');
console.log('✓ TEST 5: Max quiet per page - PASS');
console.log('✓ TEST 6: Row 2 no quiet - PASS');
console.log('\n✅ ALL BULLETPROOF TESTS PASSED');
console.log('='.repeat(60));
