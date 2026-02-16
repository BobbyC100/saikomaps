/**
 * Gallery Gap Fill Validation Script
 * 
 * Simple test runner to validate CTO requirements without full test framework.
 * Run with: tsx scripts/validate-gallery-gap-fill.ts
 */

import { 
  resolvePlacePageLayout, 
  validateLayout,
  type PlaceData,
  type CardConfig
} from '../lib/utils/PlacePageLayoutResolver.systemB';

// ============================================================================
// Test Utilities
// ============================================================================

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
    throw new Error(message);
  } else {
    passCount++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${message}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    failCount++;
    throw new Error(message);
  } else {
    passCount++;
  }
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error}`);
  }
}

// ============================================================================
// Test Cases
// ============================================================================

console.log('\n=== Gallery Gap Fill Validation ===\n');

// Test 1: Gallery + No Companions → QuietCard Fallback
test('Gallery with no Tier 4 cards → inserts QuietCard', () => {
  const data: PlaceData = {
    hours: { today: 'Open', isOpen: true, closesAt: null, opensAt: null, fullWeek: [], isIrregular: false },
    description: { curator_note: 'Great place', about_copy: null },
    gallery: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
    alsoOn: [
      { 
        id: '1', 
        title: 'Test Map', 
        slug: 'test-map',
        coverImageUrl: null,
        creatorName: 'Saiko',
        placeCount: 10,
        authorType: 'saiko'
      }
    ]
  };
  
  const tiles = resolvePlacePageLayout(data);
  
  assertEqual(tiles.length, 5, 'Should have 5 tiles');
  assertEqual(tiles[0].type, 'hours', 'Tile 0 should be hours');
  assertEqual(tiles[1].type, 'description', 'Tile 1 should be description');
  assertEqual(tiles[2].type, 'gallery', 'Tile 2 should be gallery');
  assertEqual(tiles[3].type, 'quiet', 'Tile 3 should be quiet (gap fill)');
  assertEqual(tiles[3].span.c, 2, 'QuietCard should be span-2');
  assertEqual(tiles[4].type, 'alsoOn', 'Tile 4 should be alsoOn');
  
  assert(validateLayout(tiles), 'Layout should be valid');
});

// Test 2: Gallery + AlsoOn Only → QuietCard Fallback
test('Gallery + AlsoOn only → inserts QuietCard before AlsoOn', () => {
  const data: PlaceData = {
    gallery: ['photo1.jpg', 'photo2.jpg'],
    alsoOn: [
      { 
        id: '1', 
        title: 'Test Map', 
        slug: 'test-map',
        coverImageUrl: null,
        creatorName: 'Saiko',
        placeCount: 5,
        authorType: 'saiko'
      }
    ]
  };
  
  const tiles = resolvePlacePageLayout(data);
  
  assertEqual(tiles.length, 3, 'Should have 3 tiles');
  assertEqual(tiles[0].type, 'gallery', 'Tile 0 should be gallery');
  assertEqual(tiles[1].type, 'quiet', 'Tile 1 should be quiet (gap fill)');
  assertEqual(tiles[2].type, 'alsoOn', 'Tile 2 should be alsoOn');
  
  assert(validateLayout(tiles), 'Layout should be valid');
});

// Test 3: Gallery + Phone (Tier 4) → Reorder Phone
test('Gallery + Phone (Tier 4) → reorders Phone to fill gap', () => {
  const data: PlaceData = {
    hours: { today: 'Open', isOpen: true, closesAt: null, opensAt: null, fullWeek: [], isIrregular: false },
    gallery: ['photo1.jpg', 'photo2.jpg'],
    phone: '+1-555-0100',
    alsoOn: [
      { 
        id: '1', 
        title: 'Test Map', 
        slug: 'test-map',
        coverImageUrl: null,
        creatorName: 'Saiko',
        placeCount: 8,
        authorType: 'saiko'
      }
    ]
  };
  
  const tiles = resolvePlacePageLayout(data);
  
  assertEqual(tiles.length, 4, 'Should have 4 tiles');
  assertEqual(tiles[0].type, 'hours', 'Tile 0 should be hours');
  assertEqual(tiles[1].type, 'gallery', 'Tile 1 should be gallery');
  assertEqual(tiles[2].type, 'phone', 'Tile 2 should be phone (reordered)');
  assertEqual(tiles[3].type, 'alsoOn', 'Tile 3 should be alsoOn');
  
  assert(validateLayout(tiles), 'Layout should be valid');
});

// Test 4: Gallery + Links (Tier 4) → Reorder Links
test('Gallery + Links (Tier 4) → reorders Links to fill gap', () => {
  const data: PlaceData = {
    vibe: ['Cozy', 'Romantic'],
    gallery: ['photo1.jpg', 'photo2.jpg'],
    links: {
      instagram: 'testplace',
      website: 'https://example.com',
      menuUrl: null,
      wineUrl: null
    },
    alsoOn: [
      { 
        id: '1', 
        title: 'Test Map', 
        slug: 'test-map',
        coverImageUrl: null,
        creatorName: 'Saiko',
        placeCount: 12,
        authorType: 'saiko'
      }
    ]
  };
  
  const tiles = resolvePlacePageLayout(data);
  
  assertEqual(tiles.length, 4, 'Should have 4 tiles');
  assertEqual(tiles[0].type, 'vibe', 'Tile 0 should be vibe');
  assertEqual(tiles[1].type, 'gallery', 'Tile 1 should be gallery');
  assertEqual(tiles[2].type, 'links', 'Tile 2 should be links (reordered)');
  assertEqual(tiles[3].type, 'alsoOn', 'Tile 3 should be alsoOn');
  
  assert(validateLayout(tiles), 'Layout should be valid');
});

// Test 5: Gallery + Tier 3 Cards → No Reorder (Natural Fill with span-2)
test('Gallery + Menu/Wine (Tier 3) → Menu naturally fills gap (no quiet card)', () => {
  const data: PlaceData = {
    gallery: ['photo1.jpg', 'photo2.jpg'],
    menu: [
      { name: 'Pasta', price: '$18', description: 'Fresh pasta' }
    ],
    wine: {
      focus: 'Natural wines',
      regions: ['France', 'Italy'],
      priceRange: '$$'
    },
    alsoOn: [
      { 
        id: '1', 
        title: 'Test Map', 
        slug: 'test-map',
        coverImageUrl: null,
        creatorName: 'Saiko',
        placeCount: 6,
        authorType: 'saiko'
      }
    ]
  };
  
  const tiles = resolvePlacePageLayout(data);
  
  // Menu (span-2) naturally fills the 2-col gap after Gallery
  // No QuietCard needed because span-2 fits perfectly
  assertEqual(tiles[0].type, 'gallery', 'Tile 0 should be gallery');
  assertEqual(tiles[1].type, 'menu', 'Tile 1 should be menu (natural fill)');
  assertEqual(tiles[2].type, 'wine', 'Tile 2 should be wine');
  assertEqual(tiles[3].type, 'alsoOn', 'Tile 3 should be alsoOn');
  
  // No quiet cards should exist (span-2 tiles fill naturally)
  const quietCards = tiles.filter(t => t.type === 'quiet');
  assertEqual(quietCards.length, 0, 'Should have no quiet cards (span-2 fills naturally)');
  
  assert(validateLayout(tiles), 'Layout should be valid');
});

// Test 6: Gallery + Both Links & Phone → Only Reorders First Match
test('Gallery + Links + Phone → only reorders first Tier 4 card (Links)', () => {
  const data: PlaceData = {
    gallery: ['photo1.jpg', 'photo2.jpg'],
    links: {
      instagram: 'testplace',
      website: null,
      menuUrl: null,
      wineUrl: null
    },
    phone: '+1-555-0100',
    alsoOn: [
      { 
        id: '1', 
        title: 'Test Map', 
        slug: 'test-map',
        coverImageUrl: null,
        creatorName: 'Saiko',
        placeCount: 9,
        authorType: 'saiko'
      }
    ]
  };
  
  const tiles = resolvePlacePageLayout(data);
  
  assertEqual(tiles.length, 4, 'Should have 4 tiles');
  assertEqual(tiles[0].type, 'gallery', 'Tile 0 should be gallery');
  assertEqual(tiles[1].type, 'links', 'Tile 1 should be links (reordered first)');
  assertEqual(tiles[2].type, 'phone', 'Tile 2 should be phone (stays in position)');
  assertEqual(tiles[3].type, 'alsoOn', 'Tile 3 should be alsoOn');
  
  assert(validateLayout(tiles), 'Layout should be valid');
});

// Test 7: No Gallery → No Gap Fill Logic Applied
test('No Gallery → no gap fill logic applied', () => {
  const data: PlaceData = {
    hours: { today: 'Open', isOpen: true, closesAt: null, opensAt: null, fullWeek: [], isIrregular: false },
    description: { curator_note: 'Nice spot', about_copy: null },
    vibe: ['Casual'],
    phone: '+1-555-0100',
    alsoOn: [
      { 
        id: '1', 
        title: 'Test Map', 
        slug: 'test-map',
        coverImageUrl: null,
        creatorName: 'Saiko',
        placeCount: 7,
        authorType: 'saiko'
      }
    ]
  };
  
  const tiles = resolvePlacePageLayout(data);
  
  assertEqual(tiles.length, 5, 'Should have 5 tiles');
  assertEqual(tiles[0].type, 'hours', 'Tile 0 should be hours');
  assertEqual(tiles[1].type, 'description', 'Tile 1 should be description');
  assertEqual(tiles[2].type, 'vibe', 'Tile 2 should be vibe');
  assertEqual(tiles[3].type, 'phone', 'Tile 3 should be phone');
  assertEqual(tiles[4].type, 'alsoOn', 'Tile 4 should be alsoOn');
  
  const quietCards = tiles.filter(t => t.type === 'quiet');
  assertEqual(quietCards.length, 0, 'Should have no quiet cards');
  
  assert(validateLayout(tiles), 'Layout should be valid');
});

// Test 8: Max 1 QuietCard Constraint
test('Validation fails if multiple quiet cards exist', () => {
  const invalidTiles: CardConfig[] = [
    { type: 'gallery', span: { c: 4, r: 1 }, data: [] },
    { type: 'quiet', span: { c: 2, r: 1 }, data: { variant: 'grid' } },
    { type: 'quiet', span: { c: 2, r: 1 }, data: { variant: 'mon' } }
  ];
  
  assert(!validateLayout(invalidTiles), 'Layout should be invalid (multiple quiet cards)');
});

// Test 9: Quiet Card Must Follow Gallery
test('Validation fails if quiet card appears without Gallery', () => {
  const invalidTiles: CardConfig[] = [
    { type: 'hours', span: { c: 3, r: 1 }, data: {} },
    { type: 'quiet', span: { c: 2, r: 1 }, data: { variant: 'grid' } }
  ];
  
  assert(!validateLayout(invalidTiles), 'Layout should be invalid (quiet without gallery)');
});

// Test 10: Gallery + Vibe (span-2) → No Gap Fill (Natural Flow)
test('Gallery + Vibe (span-2) immediately after → no gap fill', () => {
  const data: PlaceData = {
    hours: { today: 'Open', isOpen: true, closesAt: null, opensAt: null, fullWeek: [], isIrregular: false },
    gallery: ['photo1.jpg', 'photo2.jpg'],
    vibe: ['Modern', 'Chic'],
    alsoOn: [
      { 
        id: '1', 
        title: 'Test Map', 
        slug: 'test-map',
        coverImageUrl: null,
        creatorName: 'Saiko',
        placeCount: 11,
        authorType: 'saiko'
      }
    ]
  };
  
  const tiles = resolvePlacePageLayout(data);
  
  // Note: In tier order, vibe comes before gallery
  // So this test validates no gap fill when no gap exists
  const quietCards = tiles.filter(t => t.type === 'quiet');
  assertEqual(quietCards.length, 0, 'Should have no quiet cards (natural flow)');
  
  assert(validateLayout(tiles), 'Layout should be valid');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n=== Test Results ===');
console.log(`✓ Passed: ${passCount}`);
console.log(`✗ Failed: ${failCount}`);

if (failCount === 0) {
  console.log('\n🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed\n');
  process.exit(1);
}
