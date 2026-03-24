import type { PrimaryVertical } from '@prisma/client'

export const FEATURED_NEIGHBORHOODS = [
  'Echo Park',
  'Highland Park',
  'Koreatown',
  'San Gabriel Valley',
] as const

/**
 * Curated backup set used only when the primary featured set has
 * fewer than 4 neighborhoods with non-zero counts.
 */
export const FEATURED_NEIGHBORHOOD_BACKUPS = [
  'Silver Lake',
  'Los Feliz',
  'Arts District',
  'West Hollywood',
  'Venice',
  'Santa Monica',
  'Koreatown',
  'Pasadena',
] as const

export type FeaturedVertical = {
  vertical: PrimaryVertical
  label: string
  description: string
}

export const FEATURED_VERTICALS: FeaturedVertical[] = [
  { vertical: 'WINE', label: 'Natural Wine', description: 'Natural pours and neighborhood gems' },
  { vertical: 'COFFEE', label: 'Coffee', description: 'Third wave pours and quiet corners' },
  { vertical: 'EAT', label: 'Restaurants', description: 'The places worth knowing about' },
  { vertical: 'DRINKS', label: 'Bars & Drinks', description: 'Where the night starts' },
]

/**
 * Ordered allow-list of published list slugs for homepage collections.
 * Replace with final curated slugs as editorial locks them.
 */
export const FEATURED_COLLECTION_SLUGS: string[] = []

/**
 * Manual image overrides by homepage card key.
 * Keys:
 * - neighborhood slug (e.g. "echo-park")
 * - vertical key (e.g. "vertical-wine")
 * - list slug (e.g. "date-night-in-silver-lake")
 */
export const IMAGE_OVERRIDES: Record<string, string> = {
  'vertical-eat':
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&h=1000&fit=crop&auto=format',
  'vertical-culture':
    'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=1600&h=1000&fit=crop&auto=format',
  'vertical-shop':
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=1000&fit=crop&auto=format',
  'vertical-activity':
    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1600&h=1000&fit=crop&auto=format',
  'vertical-parks':
    'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1600&h=1000&fit=crop&auto=format',
  'vertical-stay':
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&h=1000&fit=crop&auto=format',
  'vertical-nature':
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&h=1000&fit=crop&auto=format',
  'vertical-bakery':
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&h=1000&fit=crop&auto=format',
  'category-restaurant':
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&h=1000&fit=crop&auto=format',
  'category-bar':
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1600&h=1000&fit=crop&auto=format',
}

/**
 * Curated Wikimedia Commons image URLs for geo cards.
 * These are intentionally hand-curated (not auto-resolved).
 */
export const NEIGHBORHOOD_WIKIMEDIA_IMAGES: Record<string, string> = {
  'echo-park': 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Echo_park_lake_with_lotus_flowers_and_Los_Angeles_skyline_in_the_background.jpg',
  'highland-park': 'https://upload.wikimedia.org/wikipedia/commons/5/52/Arroyo_Seco_Bank_building_%28cropped%29.jpg',
  koreatown: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Koreatown_Sign.jpg',
  'san-gabriel-valley': 'https://upload.wikimedia.org/wikipedia/commons/e/e6/SanGabrielMountains.jpg',
  'silver-lake': 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Silver_Lake_Reservoir.jpg',
  'los-feliz': 'https://upload.wikimedia.org/wikipedia/commons/9/91/Abraham_Gore_Residence%2C_Harry_B._Aarens%2C_Architect_1927_%28cropped%29.jpg',
  'arts-district': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Artist_District%2C_Los_Angeles%2C_California%2C_05-29-2001.jpg',
  'west-hollywood': 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Sunset_Tower%2C_8358_Sunset_Blvd._West_Hollywood_2383.jpg',
  venice: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Ocean_Front_Walk%2C_Venice_LA.jpg',
  'santa-monica': 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Casa_del_Mar_Santa_Monica_%28cropped%29.jpg',
  pasadena: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Pasadena_City_Hall_David_Wakely_%28cropped%29.jpg',
}

export const FALLBACK_CARD_IMAGE = '/homepage-fallbacks/default.svg'

export const CARD_FALLBACK_IMAGES: Record<string, string> = {
  'echo-park': '/homepage-fallbacks/neighborhood-1.svg',
  'highland-park': '/homepage-fallbacks/neighborhood-2.svg',
  'koreatown': '/homepage-fallbacks/neighborhood-3.svg',
  'san-gabriel-valley': '/homepage-fallbacks/neighborhood-4.svg',
  'silver-lake': '/homepage-fallbacks/neighborhood-1.svg',
  'los-feliz': '/homepage-fallbacks/neighborhood-2.svg',
  'arts-district': '/homepage-fallbacks/neighborhood-3.svg',
  'west-hollywood': '/homepage-fallbacks/neighborhood-4.svg',
  venice: '/homepage-fallbacks/neighborhood-1.svg',
  'santa-monica': '/homepage-fallbacks/neighborhood-2.svg',
  pasadena: '/homepage-fallbacks/neighborhood-3.svg',
  'vertical-wine': '/homepage-fallbacks/category-wine.svg',
  'vertical-coffee': '/homepage-fallbacks/category-coffee.svg',
  'vertical-eat': '/homepage-fallbacks/category-eat.svg',
  'vertical-drinks': '/homepage-fallbacks/category-drinks.svg',
}

export const ALLOWED_IMAGE_HOSTS = new Set([
  'images.unsplash.com',
  'lh3.googleusercontent.com',
  'maps.googleapis.com',
  'scontent.cdninstagram.com',
  'upload.wikimedia.org',
])
