/**
 * Verify ranking scores in database
 * 
 * Usage:
 *   npx tsx scripts/verify-ranking.ts
 */

import { db } from '@/lib/db';
import { requireActiveCityId } from '@/lib/active-city';
import { getRankingStats } from '@/lib/queries/ranked-places';

async function main() {
  const cityId = await requireActiveCityId();

  console.log('\n=== Ranking Score Verification ===\n');

  // Overall stats
  const stats = await getRankingStats(cityId);
  
  console.log('Overall Statistics:');
  console.log(`  Total places: ${stats.totalPlaces}`);
  console.log(`  Ranked places: ${stats.rankedPlaces}`);
  console.log(`  Unranked places: ${stats.unrankedPlaces}`);
  console.log(`  Inclusion rate: ${stats.inclusionRate}%`);
  console.log(`  Average score: ${stats.averageScore.toFixed(2)}`);

  // Top 20 ranked places
  console.log('\n=== Top 20 Ranked Places ===\n');
  
  const topPlaces = await db.places.findMany({
    where: {
      cityId,
      rankingScore: { gt: 0 }
    },
    orderBy: {
      rankingScore: 'desc'
    },
    take: 20,
    include: {
      coverages: {
        where: { status: 'APPROVED' },
        select: {
          source: {
            select: { name: true }
          }
        }
      },
      neighborhoodRel: {
        select: { name: true }
      }
    }
  });

  for (const place of topPlaces) {
    const neighborhood = place.neighborhoodRel?.name || place.neighborhood || 'Unknown';
    const sourceCount = place.coverages.length;
    const topSources = place.coverages
      .slice(0, 3)
      .map(c => c.source.name)
      .join(', ');
    
    console.log(
      `${place.rankingScore?.toFixed(1).padStart(5)} - ${place.name.padEnd(40)} ` +
      `(${neighborhood.padEnd(20)}) [${sourceCount} sources: ${topSources}]`
    );
  }

  // Distribution by neighborhood
  console.log('\n=== Ranked Places by Neighborhood (Top 10) ===\n');
  
  const byNeighborhood = await db.places.groupBy({
    by: ['neighborhoodId'],
    where: {
      cityId,
      rankingScore: { gt: 0 }
    },
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 10
  });

  for (const group of byNeighborhood) {
    if (!group.neighborhoodId) continue;
    
    const neighborhood = await db.neighborhoods.findUnique({
      where: { id: group.neighborhoodId },
      select: { name: true }
    });
    
    console.log(`  ${neighborhood?.name || 'Unknown'}: ${group._count.id} places`);
  }

  console.log('\n✅ Verification complete\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
