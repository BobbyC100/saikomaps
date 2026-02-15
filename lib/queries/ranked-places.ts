/**
 * Ranked place queries for discovery surfaces
 * 
 * Uses non-algorithmic editorial scoring (not ML/engagement optimization)
 */

import { db } from '@/lib/db';
import { applyDiversityFilter } from '@/lib/ranking';
import type { Prisma } from '@prisma/client';

/**
 * Get ranked places for a neighborhood page
 * 
 * Rules:
 * - Only places with rankingScore > 0 (passed inclusion rules)
 * - Ordered by rankingScore DESC
 * - Max 20 places per neighborhood (anti-infinite scroll)
 * - Diversity filter applied (max 3 consecutive of same cuisine)
 */
export async function getRankedPlacesForNeighborhood(
  neighborhoodId: string,
  options?: {
    maxPlaces?: number;
    maxConsecutive?: number;
  }
) {
  const { maxPlaces = 20, maxConsecutive = 3 } = options || {};

  const places = await db.places.findMany({
    where: {
      neighborhoodId,
      rankingScore: { gt: 0 },
    },
    orderBy: {
      rankingScore: 'desc',
    },
    take: maxPlaces * 2, // Fetch more for diversity filtering
    include: {
      coverages: {
        where: { status: 'APPROVED' },
        include: {
          source: {
            select: {
              name: true,
            }
          }
        }
      },
      neighborhoodRel: {
        select: {
          name: true,
          slug: true,
        }
      }
    },
  });

  // Apply diversity filter
  const diversePlaces = applyDiversityFilter(places, maxConsecutive);

  // Limit to max places after diversity filtering
  return diversePlaces.slice(0, maxPlaces);
}

/**
 * Get ranked places for Map List (across neighborhoods)
 * 
 * Rules:
 * - Only places with rankingScore > 0
 * - Ordered by rankingScore DESC
 * - Optional filters: cuisine, neighborhoods
 * - Max 100 places for initial view
 */
export async function getRankedPlacesForMapList(filters?: {
  cuisineType?: string;
  neighborhoodIds?: string[];
  cityId?: string;
  maxPlaces?: number;
}) {
  const { maxPlaces = 100, cityId, cuisineType, neighborhoodIds } = filters || {};

  const where: Prisma.placesWhereInput = {
    rankingScore: { gt: 0 },
  };

  if (cityId) {
    where.cityId = cityId;
  }

  if (cuisineType) {
    where.cuisineType = cuisineType;
  }

  if (neighborhoodIds && neighborhoodIds.length > 0) {
    where.neighborhoodId = { in: neighborhoodIds };
  }

  return await db.places.findMany({
    where,
    orderBy: {
      rankingScore: 'desc',
    },
    take: maxPlaces,
    include: {
      coverages: {
        where: { status: 'APPROVED' },
        include: {
          source: {
            select: {
              name: true,
            }
          }
        }
      },
      neighborhoodRel: {
        select: {
          name: true,
          slug: true,
        }
      }
    },
  });
}

/**
 * Get top-ranked places across entire city
 * 
 * @param cityId - City ID
 * @param limit - Max number of places to return
 */
export async function getTopRankedPlaces(cityId: string, limit: number = 50) {
  return await db.places.findMany({
    where: {
      cityId,
      rankingScore: { gt: 0 },
    },
    orderBy: {
      rankingScore: 'desc',
    },
    take: limit,
    include: {
      coverages: {
        where: { status: 'APPROVED' },
        include: {
          source: {
            select: {
              name: true,
            }
          }
        }
      },
      neighborhoodRel: {
        select: {
          name: true,
          slug: true,
        }
      }
    },
  });
}

/**
 * Get ranking statistics for a city
 */
export async function getRankingStats(cityId: string) {
  const totalPlaces = await db.places.count({
    where: { cityId }
  });

  const rankedPlaces = await db.places.count({
    where: {
      cityId,
      rankingScore: { gt: 0 }
    }
  });

  const avgScore = await db.places.aggregate({
    where: {
      cityId,
      rankingScore: { gt: 0 }
    },
    _avg: {
      rankingScore: true
    }
  });

  return {
    totalPlaces,
    rankedPlaces,
    unrankedPlaces: totalPlaces - rankedPlaces,
    inclusionRate: Math.round((rankedPlaces / totalPlaces) * 100),
    averageScore: avgScore._avg.rankingScore || 0,
  };
}
