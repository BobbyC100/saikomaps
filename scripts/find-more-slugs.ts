#!/usr/bin/env npx tsx

import { db } from '@/lib/db';

async function findMorePlaces() {
  const names = [
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
    'Lucques',
    'Hinoki',
    'Hermanito',
    'Horses',
    'E.P.',
    'Estrella',
    'Mother Dough',
    'Gjusta',
    'El Cochinito',
    'Koreatown Pizza',
    'Konbi',
    "Larry's",
    'Lemon Grove',
    "Ma'Long",
    'Night Market',
    'Nocciola',
    'Nomad',
    'NY NY Pizza',
    'Osteria Mamma',
    'Ototo',
    'Petty Cash',
    'Pine & Crane',
    'Pizzana',
    'Quarter Sheets',
    'Sinn Thai',
    'Steep',
    'Sushi Note',
    'Taco Maria',
    'Arthur J',
    'The Ivy',
    'Viet Noodle',
    "Yang's Kitchen",
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

findMorePlaces();
