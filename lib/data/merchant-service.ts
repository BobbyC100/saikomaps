/**
 * Merchant Data Service
 * Queries only — no voice generation, no tier logic
 */

import { prisma } from '@/lib/db/prisma';
import { transformDatabaseToMerchant } from './transformers';
import { MerchantData } from '@/lib/types/merchant';

/**
 * Fetch merchant by slug
 * Returns raw place record with all needed relations
 */
export async function getMerchantBySlug(slug: string): Promise<MerchantData | null> {
  const place = await prisma.places.findUnique({
    where: { slug },
  });

  if (!place) return null;

  return transformDatabaseToMerchant(place);
}

/**
 * Fetch all merchant slugs (for static generation)
 */
export async function getAllMerchantSlugs(): Promise<string[]> {
  const places = await prisma.places.findMany({
    select: { slug: true },
  });
  
  return places.map(p => p.slug);
}
