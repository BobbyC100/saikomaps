/**
 * Coverage Gate - Public Place Visibility Predicate
 * 
 * Enforces: A place is "public" if it has ≥1 APPROVED coverage in the active city
 */

import { Prisma } from '@prisma/client';

/**
 * Prisma where clause for public place visibility
 * @param cityId - Active city ID (e.g., LA)
 * @param allowLegacy - If true, also allows places with editorialSources JSON (transition mode)
 */
export function publicPlaceWhere(
  cityId: string,
  allowLegacy = false
): Prisma.placesWhereInput {
  if (allowLegacy) {
    // Transition mode: Accept places with coverages OR legacy JSON
    return {
      cityId,
      OR: [
        {
          coverages: {
            some: {
              status: 'APPROVED',
            },
          },
        },
        {
          editorialSources: {
            not: Prisma.JsonNull,
          },
        },
      ],
    };
  }

  // Strict mode: Require approved coverage only
  return {
    cityId,
    coverages: {
      some: {
        status: 'APPROVED',
      },
    },
  };
}
