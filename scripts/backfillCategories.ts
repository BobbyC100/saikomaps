/**
 * Backfill Saiko categories for existing Places.
 * Re-computes category for ALL places (fixes wrong assignments, e.g. markets showing wine).
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfillCategories.ts
 */

import { PrismaClient } from '@prisma/client';
import { getSaikoCategory } from '../lib/categoryMapping';

const prisma = new PrismaClient();

async function main() {
  const places = await prisma.places.findMany();
  let updated = 0;

  for (const place of places) {
    const newCategory = getSaikoCategory(
      place.name,
      (place.googleTypes as string[]) || []
    );
    if (place.category !== newCategory) {
      await prisma.places.update({
        where: { id: place.id },
        data: { category: newCategory },
      });
      updated++;
      if (place.name.toLowerCase().includes('market')) {
        console.log(`Fixed: "${place.name}" ${place.category} → ${newCategory}`);
      }
    }
  }

  console.log(`Updated ${updated} of ${places.length} places with Saiko categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
