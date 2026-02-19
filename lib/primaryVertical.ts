/**
 * Canonical primary_vertical for places. Use for reporting and write-time validation.
 * Maps from legacy category strings to PrimaryVertical enum; use at ingestion to prevent drift.
 */

import type { PrimaryVertical as PrismaPrimaryVertical } from '@prisma/client'
import { getSaikoCategory } from './categoryMapping'

export type { PrismaPrimaryVertical as PrimaryVertical }

/** All valid enum values (for validation and dropdowns). */
export const PRIMARY_VERTICALS: PrismaPrimaryVertical[] = [
  'EAT',
  'COFFEE',
  'WINE',
  'DRINKS',
  'SHOP',
  'CULTURE',
  'NATURE',
  'STAY',
  'WELLNESS',
  'BAKERY',
  'PURVEYORS',
  'ACTIVITY',
]

const CATEGORY_TO_VERTICAL: Record<string, PrismaPrimaryVertical> = {
  eat: 'EAT',
  restaurant: 'EAT',
  coffee: 'COFFEE',
  wine: 'WINE',
  'wine bar': 'WINE',
  'wine shop': 'WINE',
  drinks: 'DRINKS',
  shop: 'SHOP',
  culture: 'CULTURE',
  nature: 'NATURE',
  stay: 'STAY',
  wellness: 'WELLNESS',
  bakery: 'BAKERY',
  purveyors: 'PURVEYORS',
  activity: 'ACTIVITY',
}

/**
 * Map category string (e.g. from CSV or getSaikoCategory) to PrimaryVertical or null if unmapped.
 */
export function categoryToPrimaryVertical(category: string | null | undefined): PrismaPrimaryVertical | null {
  if (category == null) return null
  const key = category.trim().toLowerCase()
  return CATEGORY_TO_VERTICAL[key] ?? null
}

/**
 * Same as categoryToPrimaryVertical but returns a value for ingestion: uses getSaikoCategory
 * when category is missing, and defaults to EAT if still unmapped (so we never store null when we have name/types).
 */
export function resolvePrimaryVertical(
  category: string | null | undefined,
  name: string,
  googleTypes: string[] = []
): PrismaPrimaryVertical {
  const resolved =
    categoryToPrimaryVertical(category) ??
    categoryToPrimaryVertical(getSaikoCategory(name, googleTypes))
  if (resolved) return resolved
  return 'EAT'
}

/**
 * Strict: map category to PrimaryVertical or throw. Use in ingestion to reject invalid/missing.
 */
export function requirePrimaryVertical(category: string | null | undefined): PrismaPrimaryVertical {
  const v = categoryToPrimaryVertical(category)
  if (v) return v
  throw new Error(`Invalid or missing primary_vertical: "${category ?? '(null)'}". Must be one of: ${PRIMARY_VERTICALS.join(', ')}.`)
}

export function isValidPrimaryVertical(value: string): value is PrismaPrimaryVertical {
  return PRIMARY_VERTICALS.includes(value as PrismaPrimaryVertical)
}
