/**
 * Quick test to verify badge logic is working
 */

import { computeInternalBadges, PlaceCardData } from '../components/search-results/types';

const testCases: PlaceCardData[] = [
  {
    slug: 'test-1',
    name: 'Menu Only',
    category: 'Test',
    neighborhood: 'Test',
    price: '$',
    menuSignalsStatus: 'ok',
  },
  {
    slug: 'test-2',
    name: 'Wine Only',
    category: 'Test',
    neighborhood: 'Test',
    price: '$',
    winelistSignalsStatus: 'ok',
  },
  {
    slug: 'test-3',
    name: 'Both Signals',
    category: 'Test',
    neighborhood: 'Test',
    price: '$',
    menuSignalsStatus: 'ok',
    winelistSignalsStatus: 'ok',
  },
  {
    slug: 'test-4',
    name: 'No Signals',
    category: 'Test',
    neighborhood: 'Test',
    price: '$',
  },
];

console.log('\n=== Badge Logic Test ===\n');

testCases.forEach((place) => {
  const badges = computeInternalBadges(place);
  console.log(`${place.name}:`);
  console.log(`  menuSignalsStatus: ${place.menuSignalsStatus || 'none'}`);
  console.log(`  winelistSignalsStatus: ${place.winelistSignalsStatus || 'none'}`);
  console.log(`  → Badges: ${badges.length > 0 ? badges.map(b => b.label).join(', ') : 'none'}`);
  console.log('');
});
