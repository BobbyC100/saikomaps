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
export const IMAGE_OVERRIDES: Record<string, string> = {}

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
])
