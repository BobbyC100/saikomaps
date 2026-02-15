/**
 * Active City Helper
 * Enforces city-gating for public-facing APIs and pages
 */

import { db } from '@/lib/db';

const ACTIVE_CITY_SLUG = 'los-angeles';

/**
 * Returns the active city ID (Los Angeles)
 * @throws Error if active city not found in database
 */
export async function requireActiveCityId(): Promise<string> {
  const city = await db.cities.findUnique({
    where: { slug: ACTIVE_CITY_SLUG },
    select: { id: true },
  });

  if (!city?.id) {
    throw new Error(`Active city not found: ${ACTIVE_CITY_SLUG}`);
  }

  return city.id;
}
