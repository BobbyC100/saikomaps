#!/usr/bin/env npx tsx

/**
 * Verify LA coverage status and progress toward 75% target
 * 
 * Usage:
 *   npx tsx scripts/verify-coverage.ts
 */

import { db } from '@/lib/db';
import { requireActiveCityId } from '@/lib/active-city';

async function verifyCoverage() {
  const cityId = await requireActiveCityId();
  
  const totalPlaces = await db.places.count({
    where: { cityId }
  });
  
  const placesWithCoverage = await db.places.count({
    where: {
      cityId,
      coverages: {
        some: { status: 'APPROVED' }
      }
    }
  });
  
  const coveragePct = Math.round((placesWithCoverage / totalPlaces) * 100);
  const target75 = Math.ceil(totalPlaces * 0.75);
  const remaining = target75 - placesWithCoverage;
  
  console.log('\n=== LA Coverage Status ===');
  console.log(`Total places: ${totalPlaces}`);
  console.log(`Places with coverage: ${placesWithCoverage}`);
  console.log(`Coverage: ${coveragePct}%`);
  console.log('');
  console.log(`Target (75%): ${target75} places`);
  console.log(`Remaining: ${remaining > 0 ? remaining : 0} places`);
  console.log('');
  
  if (placesWithCoverage >= target75) {
    console.log('🎯 TARGET REACHED: Ready to disable allowLegacy!');
  } else {
    console.log(`📊 Progress: ${placesWithCoverage}/${target75} (${Math.round(placesWithCoverage / target75 * 100)}%)`);
  }
  
  // Show coverage by source
  const coveragesBySource = await db.$queryRaw<Array<{ name: string; count: bigint }>>`
    SELECT s.name, COUNT(*) as count
    FROM place_coverages pc
    JOIN sources s ON s.id = pc.source_id
    JOIN places p ON p.id = pc.place_id
    WHERE p.city_id = ${cityId}
      AND pc.status = 'APPROVED'
    GROUP BY s.name
    ORDER BY count DESC
    LIMIT 10
  `;

  console.log('\n=== Top Coverage Sources ===');
  for (const row of coveragesBySource) {
    console.log(`${row.name}: ${row.count}`);
  }
  console.log('');
}

verifyCoverage()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
