/**
 * Merchant Data Service
 * Queries only — no voice generation, no tier logic
 */

import { db } from '@/lib/db'
import { requireActiveCityId } from '@/lib/active-city';

import { transformDatabaseToMerchant } from './transformers';
import { MerchantData } from '@/lib/types/merchant';

/**
 * Fetch merchant by slug
 * Returns raw place record with all needed relations
 */
export async function getMerchantBySlug(slug: string): Promise<MerchantData | null> {
  const cityId = await requireActiveCityId();
  const place = await db.places.findFirst({
    where: { 
      slug,
      cityId, // LA only
    },
    include: {
      // Only relation that exists in schema
    },
  });

  if (!place) return null;

  return transformDatabaseToMerchant(place);
}

/**
 * Fetch all merchant slugs (for static generation)
 * Only returns LA places for public site
 */
export async function getAllMerchantSlugs(): Promise<string[]> {
  const cityId = await requireActiveCityId();
  const places = await db.places.findMany({
    where: { cityId }, // LA only
    select: { slug: true },
  });

  return places.map(p => p.slug);
}
  
 
