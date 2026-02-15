#!/usr/bin/env npx tsx

import { db } from '@/lib/db';

async function verifyCoverage() {
  // Overall coverage rate
  const totalPlaces = await db.place.count({
    where: { cityId: 'cmln5lxe70004kf1yl8wdd4gl' }
  });

  const coveredPlaces = await db.place.count({
    where: {
      cityId: 'cmln5lxe70004kf1yl8wdd4gl',
      coverages: {
        some: {
          status: 'APPROVED'
        }
      }
    }
  });

  console.log('=== LA Coverage Stats ===');
  console.log(`Total places: ${totalPlaces}`);
  console.log(`Places with coverage: ${coveredPlaces}`);
  console.log(`Coverage rate: ${Math.round(100 * coveredPlaces / totalPlaces)}%`);
  console.log('');

  // Coverage by source
  const coveragesBySource = await db.$queryRaw<Array<{ name: string; count: bigint }>>`
    SELECT s.name, COUNT(*) as count
    FROM place_coverages pc
    JOIN sources s ON s.id = pc.source_id
    JOIN places p ON p.id = pc.place_id
    WHERE p.city_id = 'cmln5lxe70004kf1yl8wdd4gl'
      AND pc.status = 'APPROVED'
    GROUP BY s.name
    ORDER BY count DESC
    LIMIT 10
  `;

  console.log('=== Coverage by Source ===');
  for (const row of coveragesBySource) {
    console.log(`${row.name}: ${row.count}`);
  }
  console.log('');

  // Total coverages
  const totalCoverages = await db.place_coverages.count({
    where: {
      place: {
        cityId: 'cmln5lxe70004kf1yl8wdd4gl'
      },
      status: 'APPROVED'
    }
  });

  console.log(`Total LA coverages: ${totalCoverages}`);
}

verifyCoverage();
