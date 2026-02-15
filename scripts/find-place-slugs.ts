#!/usr/bin/env npx tsx

import { db } from '@/lib/db';

async function findPlaces() {
  const names = [
    'Dama',
    'Dudley Market',
    'Dunsmoor',
    'E.P. & L.P.',
    'El Cochinito',
    'El Ruso',
    'Estrella',
    'Gjusta',
    'Gwen',
    'Hayato',
    'Hermanito',
    'Hinoki & The Bird',
    'Holbox',
    'Horses',
    'Jitlada',
    "Jon & Vinny's",
    'Joy',
    'Kismet',
    'Kato',
    'Koreatown Pizza',
    'Konbi',
    "Langer's",
    "Larry's",
    'Lasita',
    'Lemon Grove',
    'Lucques',
    "Lupe's",
    "Ma'Long's",
    'Marouch',
    'n/naka',
    'Orsa & Winston',
    'Otium',
    'Republique',
    "Roscoe's",
    'Rustic Canyon',
    'Salazar',
    "Salt's Cure",
    'Shibumi',
    'Sonoratown',
    'Spago',
    'Sqirl',
    'Vespertine',
    'Woodspoon',
  ];

  for (const name of names) {
    const place = await db.place.findFirst({
      where: {
        cityId: 'cmln5lxe70004kf1yl8wdd4gl',
        name: {
          contains: name,
          mode: 'insensitive'
        }
      },
      select: {
        slug: true,
        name: true
      }
    });
    
    if (place) {
      console.log(`${place.slug},${place.name}`);
    }
  }
}

findPlaces();
