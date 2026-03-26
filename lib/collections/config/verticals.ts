import type { VerticalDefinition } from '@/lib/collections/types'

export const LOCKED_VERTICAL_COUNT = 12

export const VERTICAL_DEFINITIONS: VerticalDefinition[] = [
  { key: 'eat', label: 'Restaurants', description: 'Signature places to eat', primaryVerticals: ['EAT'] },
  { key: 'coffee', label: 'Coffee', description: 'Coffee and cafe culture', primaryVerticals: ['COFFEE'] },
  { key: 'wine', label: 'Wine', description: 'Wine bars and bottles', primaryVerticals: ['WINE'] },
  { key: 'drinks', label: 'Bars & Drinks', description: 'Cocktails and nightlife', primaryVerticals: ['DRINKS'] },
  { key: 'shop', label: 'Shops', description: 'Independent retail and design', primaryVerticals: ['SHOP'] },
  { key: 'culture', label: 'Culture', description: 'Art, galleries, and museums', primaryVerticals: ['CULTURE'] },
  { key: 'nature', label: 'Nature', description: 'Outdoors and scenic spots', primaryVerticals: ['NATURE'] },
  { key: 'stay', label: 'Stay', description: 'Hotels and stays', primaryVerticals: ['STAY'] },
  { key: 'wellness', label: 'Wellness', description: 'Wellness and recovery', primaryVerticals: ['WELLNESS'] },
  { key: 'bakery', label: 'Bakery', description: 'Bakeries and pastry programs', primaryVerticals: ['BAKERY'] },
  { key: 'activity', label: 'Activity', description: 'Things to do', primaryVerticals: ['ACTIVITY'] },
  { key: 'parks', label: 'Parks', description: 'Parks and open space', primaryVerticals: ['PARKS'] },
]

if (VERTICAL_DEFINITIONS.length !== LOCKED_VERTICAL_COUNT) {
  throw new Error(
    `Expected ${LOCKED_VERTICAL_COUNT} vertical definitions, found ${VERTICAL_DEFINITIONS.length}`
  )
}
