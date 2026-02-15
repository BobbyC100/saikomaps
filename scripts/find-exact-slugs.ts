#!/usr/bin/env npx tsx

import { db } from '@/lib/db';

async function findPlacesExact() {
  const searchTerms = [
    { name: 'Manuela', neighborhood: 'Arts' },
    { name: 'Pasjoli', neighborhood: 'Santa' },
    { name: 'Pine', neighborhood: 'Silver' },
    { name: 'Night Market', neighborhood: 'Silver' },
    { name: 'Konbi', neighborhood: 'Echo' },
    { name: 'Sonoratown', neighborhood: 'Downtown' },
    { name: 'Hermanito', neighborhood: '' },
    { name: 'Mh Zh', neighborhood: 'Highland' },
    { name: 'Ronan', neighborhood: 'West' },
    { name: 'Tesse', neighborhood: 'West' },
    { name: 'Ugly Drum', neighborhood: '' },
    { name: 'Wax Paper', neighborhood: 'Silver' },
  ];

  for (const term of searchTerms) {
    const places = await db.place.findMany({
      where: {
        cityId: 'cmln5lxe70004kf1yl8wdd4gl',
        name: {
          contains: term.name,
          mode: 'insensitive'
        }
      },
      select: {
        slug: true,
        name: true,
        neighborhood: true
      },
      take: 3
    });
    
    for (const place of places) {
      console.log(`${place.slug},${place.name},${place.neighborhood || 'N/A'}`);
    }
  }
}

findPlacesExact();
