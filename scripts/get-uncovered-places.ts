#!/usr/bin/env npx tsx

import { db } from '@/lib/db';

async function getUncoveredPlaces() {
  try {
    const laPlaces = await db.place.findMany({
      where: {
        cityId: 'cmln5lxe70004kf1yl8wdd4gl',
        coverages: {
          none: {
            status: 'APPROVED'
          }
        }
      },
      select: {
        slug: true,
        name: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('slug,name');
    laPlaces.forEach(place => {
      console.log(`${place.slug},${place.name}`);
    });

    console.error(`\n--- Summary ---`);
    console.error(`Total uncovered places: ${laPlaces.length}`);
    
    const totalPlaces = await db.place.count({
      where: {
        cityId: 'cmln5lxe70004kf1yl8wdd4gl'
      }
    });
    
    console.error(`Total LA places: ${totalPlaces}`);
    console.error(`Coverage: ${totalPlaces - laPlaces.length}/${totalPlaces} (${Math.round(100 * (totalPlaces - laPlaces.length) / totalPlaces)}%)`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getUncoveredPlaces();
