/**
 * Compute Ranking Scores - Non-Algorithmic Editorial Scoring
 * 
 * This is NOT an ML algorithm. It's a transparent, rule-based scoring system
 * using human-authored weights to maintain consistent ordering.
 * 
 * Inclusion Rules (must meet ONE of):
 * - Has ≥2 verified editorial sources (place_coverages)
 * - Has ≥1 chef recommendation
 * - Has ≥1 Jonathan Gold mention
 * 
 * Scoring Formula:
 * - Coverage count × 2
 * - Chef rec × 3 (high-signal authority)
 * - Gold mention × 2 (legacy authority bonus)
 * 
 * Usage:
 *   npx tsx scripts/compute-ranking-scores.ts          # Dry run
 *   npx tsx scripts/compute-ranking-scores.ts --execute  # Execute
 *   npx tsx scripts/compute-ranking-scores.ts --force    # Force recompute all
 */

import { db } from '@/lib/db';
import { requireActiveCityId } from '@/lib/active-city';

interface ScoringWeights {
  coverageMultiplier: number;
  chefRecBonus: number;
  goldMentionBonus: number;
}

const WEIGHTS: ScoringWeights = {
  coverageMultiplier: 2,
  chefRecBonus: 3,
  goldMentionBonus: 2,
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function hasChefRec(chefRecs: unknown): boolean {
  if (!chefRecs) return false;
  if (Array.isArray(chefRecs)) return chefRecs.length > 0;
  if (typeof chefRecs === 'object') return Object.keys(chefRecs).length > 0;
  return false;
}

function hasGoldMention(editorialSources: unknown): boolean {
  if (!editorialSources) return false;
  if (Array.isArray(editorialSources)) {
    return editorialSources.some((source: any) => 
      source.publication?.toLowerCase().includes('jonathan gold') ||
      source.sourceName?.toLowerCase().includes('jonathan gold')
    );
  }
  return false;
}

async function computeRankingScores(options: { execute?: boolean; force?: boolean }) {
  const { execute = false, force = false } = options;

  console.log('🎯 Computing ranking scores...');
  console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY RUN'}`);
  console.log(`Force recompute: ${force}\n`);

  const cityId = await requireActiveCityId();

  // Fetch all places with their coverages
  const places = await db.places.findMany({
    where: {
      cityId,
    },
    include: {
      coverages: {
        where: {
          status: 'APPROVED'
        }
      },
      neighborhoodRel: {
        select: {
          name: true
        }
      }
    },
  });

  console.log(`Total places in city: ${places.length}\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let noInclusion = 0;

  const scoreDistribution: Record<number, number> = {};

  for (const place of places) {
    const coverageCount = place.coverages.length;
    const hasChef = hasChefRec(place.chefRecs);
    const hasGold = hasGoldMention(place.editorialSources);
    
    // Inclusion check: Must meet minimum criteria
    const meetsInclusionRules = 
      coverageCount >= 2 || 
      hasChef || 
      hasGold;

    if (!meetsInclusionRules) {
      console.log(`⏭️  ${place.name}: Does not meet inclusion rules (${coverageCount} sources, chef: ${hasChef}, gold: ${hasGold})`);
      noInclusion++;
      continue;
    }

    // Calculate score
    const coverageScore = coverageCount * WEIGHTS.coverageMultiplier;
    const chefRecScore = hasChef ? WEIGHTS.chefRecBonus : 0;
    const goldScore = hasGold ? WEIGHTS.goldMentionBonus : 0;
    
    const totalScore = coverageScore + chefRecScore + goldScore;

    // Track distribution
    const bucket = Math.floor(totalScore);
    scoreDistribution[bucket] = (scoreDistribution[bucket] || 0) + 1;

    const neighborhood = place.neighborhoodRel?.name || place.neighborhood || 'Unknown';

    console.log(
      `📊 ${place.name} (${neighborhood}): ${totalScore.toFixed(1)} ` +
      `(coverage: ${coverageScore}, chef: ${chefRecScore}, gold: ${goldScore})`
    );

    if (execute) {
      await db.places.update({
        where: { id: place.id },
        data: {
          rankingScore: totalScore,
          lastScoreUpdate: new Date(),
        },
      });
      updated++;
    }

    processed++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`✅ Processed: ${processed}`);
  console.log(`📝 Updated: ${updated}`);
  console.log(`⏭️  Skipped (no inclusion): ${noInclusion}`);
  console.log(`📊 Total places: ${places.length}`);
  
  console.log(`\n=== Score Distribution ===`);
  const sortedScores = Object.keys(scoreDistribution)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (const score of sortedScores) {
    const count = scoreDistribution[score];
    const bar = '█'.repeat(Math.min(count, 50));
    console.log(`${score.toString().padStart(3)}: ${bar} (${count})`);
  }
  
  if (!execute) {
    console.log('\n⚠️  DRY RUN - Use --execute to save changes');
  } else {
    console.log('\n✅ Scores saved to database');
  }
}

// CLI execution
const execute = hasFlag('--execute');
const force = hasFlag('--force');

computeRankingScores({ execute, force })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
