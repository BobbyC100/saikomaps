/**
 * Merchant Data Service
 * Queries only — no voice generation, no tier logic
 */

import { db } from '@/lib/db'

import { transformDatabaseToMerchant } from './transformers';
import { MerchantData } from '@/lib/types/merchant';

/**
 * Fetch merchant by slug
 * Returns raw place record with all needed relations
 */
export async function getMerchantBySlug(slug: string): Promise<MerchantData | null> {
  const place = await db.places.findUnique({
    where: { slug },
    include: {
      // Only relation that exists in schema
    },
  });

  if (!place) return null;

  return transformDatabaseToMerchant(place);
}

/**
 * Fetch all merchant slugs (for static generation)
 */
export async function getAllMerchantSlugs(): Promise<string[]> {
  const places = await db.places.findMany({
    select: { slug: true }, // only get slugs
  });

  return places.map(p => p.slug);
}
  
 
