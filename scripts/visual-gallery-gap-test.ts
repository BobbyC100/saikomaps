/**
 * Gallery Gap Fill — Visual Test Page
 * 
 * This generates console output showing before/after layout states
 * for the most common Gallery gap scenarios.
 * 
 * Run: tsx scripts/visual-gallery-gap-test.ts
 */

import { 
  resolvePlacePageLayout,
  debugLayout,
  type PlaceData
} from '../lib/utils/PlacePageLayoutResolver.systemB';

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║     Gallery Gap Fill — Visual Layout Demonstration       ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// ============================================================================
// Scenario 1: Gallery + No Companions (QuietCard Fallback)
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Scenario 1: Gallery + No Tier 4 Cards');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const scenario1: PlaceData = {
  hours: { today: 'Open', isOpen: true, closesAt: '11 PM', opensAt: null, fullWeek: [], isIrregular: false },
  description: { curator_note: 'Elegant Italian spot with handmade pasta', about_copy: null },
  gallery: ['hero.jpg', 'interior1.jpg', 'interior2.jpg', 'food1.jpg'],
  alsoOn: [
    { 
      id: '1', 
      title: 'Best Italian in LA', 
      slug: 'best-italian-la',
      coverImageUrl: '/maps/italian.jpg',
      creatorName: 'Saiko',
      placeCount: 12,
      authorType: 'saiko'
    }
  ]
};

console.log('Visual Grid Layout:');
console.log('┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐');
console.log('│ Hours-3           │ Description-3     │         │         │');
console.log('├─────────┴─────────┴─────────┴─────────┼─────────┴─────────┤');
console.log('│ Gallery-4                             │ Quiet-2           │ ← Gap filled!');
console.log('├─────────┬─────────┬─────────┬─────────┴─────────┬─────────┤');
console.log('│ AlsoOn-6                                                  │');
console.log('└───────────────────────────────────────────────────────────┘\n');

console.log(debugLayout(resolvePlacePageLayout(scenario1)));

// ============================================================================
// Scenario 2: Gallery + Phone (Reorder Tier 4)
// ============================================================================

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Scenario 2: Gallery + Phone (Tier 4 Reorder)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const scenario2: PlaceData = {
  hours: { today: 'Open', isOpen: true, closesAt: '10 PM', opensAt: null, fullWeek: [], isIrregular: false },
  description: { curator_note: 'Natural wine bar with small plates', about_copy: null },
  gallery: ['hero.jpg', 'interior1.jpg', 'wine1.jpg'],
  phone: '+1 (323) 555-0142',
  alsoOn: [
    { 
      id: '1', 
      title: 'Wine Bars to Know', 
      slug: 'wine-bars-la',
      coverImageUrl: '/maps/wine.jpg',
      creatorName: 'Saiko',
      placeCount: 8,
      authorType: 'saiko'
    }
  ]
};

console.log('Visual Grid Layout:');
console.log('┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐');
console.log('│ Hours-3           │ Description-3     │         │         │');
console.log('├─────────┴─────────┴─────────┴─────────┼─────────┴─────────┤');
console.log('│ Gallery-4                             │ Phone-2           │ ← Tier 4 pulled up!');
console.log('├─────────┬─────────┬─────────┬─────────┴─────────┬─────────┤');
console.log('│ AlsoOn-6                                                  │');
console.log('└───────────────────────────────────────────────────────────┘\n');

console.log(debugLayout(resolvePlacePageLayout(scenario2)));

// ============================================================================
// Scenario 3: Gallery + Menu (Natural Fill, No Intervention)
// ============================================================================

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Scenario 3: Gallery + Menu (Natural Fill)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const scenario3: PlaceData = {
  vibe: ['Cozy', 'Date Night'],
  gallery: ['hero.jpg', 'ambiance.jpg', 'dish1.jpg'],
  menu: [
    { name: 'Cacio e Pepe', price: '$24', description: 'Classic Roman pasta' },
    { name: 'Carbonara', price: '$26', description: 'Guanciale, egg, pecorino' }
  ],
  wine: {
    focus: 'Italian natural wines',
    regions: ['Piedmont', 'Sicily'],
    priceRange: '$$-$$$'
  },
  alsoOn: [
    { 
      id: '1', 
      title: 'Romantic Spots', 
      slug: 'romantic-la',
      coverImageUrl: '/maps/romantic.jpg',
      creatorName: 'Saiko',
      placeCount: 15,
      authorType: 'saiko'
    }
  ]
};

console.log('Visual Grid Layout:');
console.log('┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐');
console.log('│ Vibe-2            │         │         │         │         │');
console.log('├─────────┴─────────┴─────────┴─────────┼─────────┴─────────┤');
console.log('│ Gallery-4                             │ Menu-2            │ ← Natural fit!');
console.log('├─────────┬─────────┴─────────┬─────────┴─────────┬─────────┤');
console.log('│         │ Wine-2            │         │         │         │');
console.log('├─────────┴─────────┬─────────┴─────────┴─────────┴─────────┤');
console.log('│ AlsoOn-6                                                  │');
console.log('└───────────────────────────────────────────────────────────┘\n');

console.log(debugLayout(resolvePlacePageLayout(scenario3)));

// ============================================================================
// Scenario 4: No Gallery (No Intervention)
// ============================================================================

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Scenario 4: No Gallery (Gap Fill Logic Skipped)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const scenario4: PlaceData = {
  hours: { today: 'Open', isOpen: true, closesAt: '9 PM', opensAt: null, fullWeek: [], isIrregular: false },
  description: { curator_note: 'Neighborhood cafe', about_copy: null },
  vibe: ['Casual', 'Local'],
  phone: '+1 (310) 555-0199',
  alsoOn: [
    { 
      id: '1', 
      title: 'Neighborhood Gems', 
      slug: 'neighborhood-gems',
      coverImageUrl: '/maps/local.jpg',
      creatorName: 'Saiko',
      placeCount: 20,
      authorType: 'saiko'
    }
  ]
};

console.log('Visual Grid Layout:');
console.log('┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐');
console.log('│ Hours-3           │ Description-3     │         │         │');
console.log('├─────────┴─────────┼─────────┴─────────┴─────────┬─────────┤');
console.log('│ Vibe-2            │                   │ Phone-2           │');
console.log('├─────────┴─────────┴─────────┬─────────┴─────────┴─────────┤');
console.log('│ AlsoOn-6                                                  │');
console.log('└───────────────────────────────────────────────────────────┘\n');

console.log(debugLayout(resolvePlacePageLayout(scenario4)));

// ============================================================================
// Summary
// ============================================================================

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                      Key Behaviors                        ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log('║ 1. Gallery + No Tier 4 → QuietCard inserted              ║');
console.log('║ 2. Gallery + Tier 4 → Tier 4 reordered to fill           ║');
console.log('║ 3. Gallery + span-2 → Natural fill (no intervention)     ║');
console.log('║ 4. No Gallery → Gap fill logic never triggers            ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
