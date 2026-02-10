/**
 * Saiko Maps — Map Identity Summary Generator
 * 
 * Auto-generates single-line orientation text for maps based on:
 * - Place count
 * - Place personality distribution
 * - Price tier distribution
 */

// ============================================
// TYPES
// ============================================

export interface PlaceForSummary {
  place_personality?: string | null;
  price_tier?: string | null;
}

// ============================================
// LABEL MAPPINGS
// ============================================

const PERSONALITY_LABELS: Record<string, string> = {
  institution: 'institutions',
  neighborhood_spot: 'neighborhood spots',
  chef_driven: 'chef-driven spots',
  destination: 'destinations',
  scene: 'scene spots',
  hidden_gem: 'hidden gems',
};

const PRICE_ORDER = ['$', '$$', '$$$', '$$$$'];

// ============================================
// SUMMARY GENERATOR
// ============================================

/**
 * Generate map identity summary
 * Format: "{count} places — {personality phrase}, {price phrase}."
 */
export function generateMapSummary(places: PlaceForSummary[]): string {
  const count = places.length;
  
  // Empty maps
  if (count === 0) return '';

  // Count phrase
  const countPhrase = `${count} place${count === 1 ? '' : 's'}`;

  // Personality analysis
  const personalityCounts: Record<string, number> = {};
  let totalWithPersonality = 0;
  
  places.forEach(p => {
    if (p.place_personality) {
      personalityCounts[p.place_personality] = (personalityCounts[p.place_personality] || 0) + 1;
      totalWithPersonality++;
    }
  });

  let personalityPhrase = '';
  
  if (totalWithPersonality > 0) {
    const sorted = Object.entries(personalityCounts)
      .sort((a, b) => b[1] - a[1]);
    
    const topPercent = sorted[0][1] / totalWithPersonality;
    const secondPercent = sorted.length > 1 ? sorted[1][1] / totalWithPersonality : 0;

    if (topPercent >= 0.6) {
      // One personality dominates
      const label = PERSONALITY_LABELS[sorted[0][0]] || sorted[0][0];
      personalityPhrase = `mostly ${label}`;
    } else if (secondPercent >= 0.3) {
      // Two personalities significant
      const label1 = PERSONALITY_LABELS[sorted[0][0]] || sorted[0][0];
      const label2 = PERSONALITY_LABELS[sorted[1][0]] || sorted[1][0];
      personalityPhrase = `${label1} and ${label2}`;
    } else {
      // Mixed
      personalityPhrase = 'mixed';
    }
  }

  // Price analysis
  const prices = places
    .map(p => p.price_tier)
    .filter((p): p is string => p !== null && p !== undefined);
  
  let pricePhrase = '';
  
  if (prices.length > 0) {
    const uniquePrices = [...new Set(prices)].sort(
      (a, b) => PRICE_ORDER.indexOf(a) - PRICE_ORDER.indexOf(b)
    );
    
    if (uniquePrices.length === 1) {
      // All same price
      pricePhrase = uniquePrices[0];
    } else {
      // Price range
      pricePhrase = `${uniquePrices[0]}–${uniquePrices[uniquePrices.length - 1]}`;
    }
  }

  // Assemble summary
  const details = [personalityPhrase, pricePhrase].filter(Boolean).join(', ');
  
  if (details) {
    return `${countPhrase} — ${details}.`;
  }
  
  return `${countPhrase}.`;
}

// ============================================
// EXAMPLES FOR TESTING
// ============================================

/**
 * Test examples to validate logic
 */
export const TEST_CASES = [
  {
    name: 'Mostly institutions',
    places: [
      { place_personality: 'institution', price_tier: '$$' },
      { place_personality: 'institution', price_tier: '$$' },
      { place_personality: 'institution', price_tier: '$$$' },
      { place_personality: 'neighborhood_spot', price_tier: '$' },
    ],
    expected: '4 places — mostly institutions, $–$$$.',
  },
  {
    name: 'Two personalities',
    places: [
      { place_personality: 'chef_driven', price_tier: '$$$' },
      { place_personality: 'chef_driven', price_tier: '$$$' },
      { place_personality: 'destination', price_tier: '$$$' },
      { place_personality: 'destination', price_tier: '$$$$' },
    ],
    expected: '4 places — chef-driven spots and destinations, $$$–$$$$.',
  },
  {
    name: 'Mixed personalities',
    places: [
      { place_personality: 'institution', price_tier: '$' },
      { place_personality: 'neighborhood_spot', price_tier: '$$' },
      { place_personality: 'hidden_gem', price_tier: '$$' },
      { place_personality: 'scene', price_tier: '$$$' },
    ],
    expected: '4 places — mixed, $–$$$.',
  },
  {
    name: 'No personality data',
    places: [
      { place_personality: null, price_tier: '$$' },
      { place_personality: null, price_tier: '$$' },
      { place_personality: null, price_tier: '$$$' },
    ],
    expected: '3 places — $$–$$$.',
  },
  {
    name: 'No price data',
    places: [
      { place_personality: 'neighborhood_spot', price_tier: null },
      { place_personality: 'neighborhood_spot', price_tier: null },
      { place_personality: 'institution', price_tier: null },
    ],
    expected: '3 places — mostly neighborhood spots.',
  },
  {
    name: 'No data at all',
    places: [
      { place_personality: null, price_tier: null },
      { place_personality: null, price_tier: null },
    ],
    expected: '2 places.',
  },
  {
    name: 'Single place',
    places: [
      { place_personality: 'institution', price_tier: '$$' },
    ],
    expected: '1 place — mostly institutions, $$.',
  },
];
