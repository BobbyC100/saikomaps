/**
 * Test Scenarios for Place Page Layout Resolver
 * Based on: saiko-cursor-implementation-spec.md
 */

import {
  resolvePlacePageLayout,
  validateLayout,
  debugLayout,
  type PlaceData,
} from './PlacePageLayoutResolver';

// ============================================================================
// SCENARIO 1: FULL DATA
// ============================================================================

console.log('='.repeat(60));
console.log('SCENARIO 1: FULL DATA');
console.log('='.repeat(60));

const fullData: PlaceData = {
  hours: { /* mock hours data */ },
  details: { /* mock details */ },
  coverage: {
    quote: "The room has a bubbly energy as it fills up with creative directors who part-time in Lisbon and people who own at least one crystal, but don't expect the same excitement from the snacky menu.",
    source: "The Infatuation"
  },
  curator: {
    note: "Great natural wine list. The best on the eastside. Unpretentious and always interesting."
  },
  gallery: Array(8).fill('photo.jpg'),
  tips: [
    "Book 2-3 weeks ahead",
    "Bar seats at 5pm",
    "Try spaghetti rustichella",
    "Rooftop at sunset"
  ],
  menu: [
    { name: "Charcuterie Board", price: "$28" },
    { name: "Spaghetti Rustichella", price: "$24" },
    { name: "Wood-Fired Pizza", price: "$18-22" },
    { name: "Bone Marrow", price: "$19" }
  ],
  wine: {
    focus: "Italian natural wines",
    regions: ["Sicily", "Piedmont", "Friuli"],
    priceRange: "$45-85"
  },
  vibe: ["Date Night", "Lively"],
  alsoOn: [
    { id: '1', title: 'Downtown Date Night', slug: 'downtown-date-night', creatorName: '@bobby', placeCount: 18 },
    { id: '2', title: 'Arts District Essentials', slug: 'arts-district', creatorName: '@sarah', placeCount: 24 },
    { id: '3', title: 'Special Occasion Restaurants', slug: 'special-occasion', creatorName: '@ken', placeCount: 31 }
  ]
};

const fullLayout = resolvePlacePageLayout(fullData);
console.log(debugLayout(fullLayout));
console.log('\nExpected:');
console.log('Row 1: Hours(3) + Details(3)');
console.log('Row 2: Coverage(6)');
console.log('Row 3: Gallery(3) + Curator(3)');
console.log('Row 4: Tips(2) + Menu(3) + Quiet(1)');
console.log('Row 5: Vibe(2) + Wine(3) + Quiet(1)');
console.log('Row 6: AlsoOn(6)');
console.log('Total Quiet: 2');

// ============================================================================
// SCENARIO 2: NO MENU
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('SCENARIO 2: NO MENU');
console.log('='.repeat(60));

const noMenuData: PlaceData = {
  hours: { /* mock hours data */ },
  details: { /* mock details */ },
  coverage: {
    quote: "Short coverage quote less than 120 chars.",
    source: "Eater"
  },
  curator: {
    note: "Short note under 80 chars."
  },
  gallery: Array(8).fill('photo.jpg'),
  tips: [
    "Book ahead",
    "Bar seats at 5pm",
    "Try pasta",
    "Rooftop"
  ],
  menu: null, // No menu
  wine: {
    focus: "Natural wines"
  },
  vibe: ["Date Night", "Lively", "Cozy", "Romantic", "Trendy"],
  alsoOn: [
    { id: '1', title: 'Best Restaurants', slug: 'best', creatorName: '@chef', placeCount: 25 }
  ]
};

const noMenuLayout = resolvePlacePageLayout(noMenuData);
console.log(debugLayout(noMenuLayout));
console.log('\nExpected:');
console.log('Row 1: Hours(3) + Details(3)');
console.log('Row 2: Coverage(4) + Curator(2)');
console.log('Row 3: Gallery(3) + Tips(3)');
console.log('Row 4: Vibe(3) + Wine(3)');
console.log('Row 5: AlsoOn(6)');
console.log('Total Quiet: 0');

// ============================================================================
// SCENARIO 3: MINIMAL DATA
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('SCENARIO 3: MINIMAL DATA');
console.log('='.repeat(60));

const minimalData: PlaceData = {
  hours: { /* mock hours data */ },
  details: { /* mock details */ },
  coverage: {
    quote: "Short quote",
    source: "Guide"
  },
  curator: null,
  gallery: null,
  tips: ["Book ahead", "Bar seats"],
  menu: null,
  wine: null,
  vibe: ["Date Night", "Lively"],
  alsoOn: [
    { id: '1', title: 'Local Favorites', slug: 'local', creatorName: '@local', placeCount: 12 },
    { id: '2', title: 'Hidden Gems', slug: 'hidden', creatorName: '@explorer', placeCount: 8 },
    { id: '3', title: 'Date Spots', slug: 'dates', creatorName: '@romantic', placeCount: 15 }
  ]
};

const minimalLayout = resolvePlacePageLayout(minimalData);
console.log(debugLayout(minimalLayout));
console.log('\nExpected:');
console.log('Row 1: Hours(3) + Details(3)');
console.log('Row 2: Coverage(6) — promoted');
console.log('Row 3: Tips(2) + Vibe(2) + Quiet(2)');
console.log('Row 4: AlsoOn(6)');
console.log('Total Quiet: 2');

// ============================================================================
// SCENARIO 4: SPARSE (ONLY ESSENTIALS)
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('SCENARIO 4: SPARSE (ONLY ESSENTIALS)');
console.log('='.repeat(60));

const sparseData: PlaceData = {
  hours: { /* mock hours data */ },
  details: { /* mock details */ },
  coverage: null,
  curator: null,
  gallery: null,
  tips: null,
  menu: null,
  wine: null,
  vibe: null,
  alsoOn: null
};

const sparseLayout = resolvePlacePageLayout(sparseData);
console.log(debugLayout(sparseLayout));
console.log('\nExpected:');
console.log('Row 1: Hours(3) + Details(3)');
console.log('Total Quiet: 0');

// ============================================================================
// SCENARIO 5: VIBE HEAVY (MANY TAGS)
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('SCENARIO 5: VIBE HEAVY (MANY TAGS)');
console.log('='.repeat(60));

const vibeHeavyData: PlaceData = {
  hours: { /* mock hours data */ },
  details: { /* mock details */ },
  coverage: {
    quote: "Amazing place with great food and drinks all around.",
    source: "LA Times"
  },
  curator: null,
  gallery: null,
  tips: ["Arrive early", "Try the special"],
  menu: null,
  wine: null,
  vibe: ["Date Night", "Lively", "Cozy", "Romantic", "Trendy", "Hip", "Instagram-worthy", "Music"],
  alsoOn: [
    { id: '1', title: 'Trending Now', slug: 'trending', creatorName: '@curator', placeCount: 30 }
  ]
};

const vibeHeavyLayout = resolvePlacePageLayout(vibeHeavyData);
console.log(debugLayout(vibeHeavyLayout));
console.log('\nExpected:');
console.log('Row 1: Hours(3) + Details(3)');
console.log('Row 2: Coverage(6) — promoted');
console.log('Row 3: Tips(6) — promoted');
console.log('Row 4: Vibe(6) — wide (7+ tags)');
console.log('Row 5: AlsoOn(6)');
console.log('Total Quiet: 0');

// ============================================================================
// VALIDATION SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(60));

const allLayouts = [
  { name: 'Full Data', layout: fullLayout },
  { name: 'No Menu', layout: noMenuLayout },
  { name: 'Minimal', layout: minimalLayout },
  { name: 'Sparse', layout: sparseLayout },
  { name: 'Vibe Heavy', layout: vibeHeavyLayout }
];

allLayouts.forEach(({ name, layout }) => {
  const valid = validateLayout(layout);
  const totalQuiet = layout.reduce(
    (sum, row) => sum + row.cards.filter(c => c.type === 'quiet').length,
    0
  );
  console.log(`${name}: ${valid ? '✓' : '✗'} (${totalQuiet} Quiet)`);
});

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));
