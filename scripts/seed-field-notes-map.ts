/**
 * Seed a test map with Field Notes template and sample places
 * Run: npx tsx scripts/seed-field-notes-map.ts
 * Or: node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/seed-field-notes-map.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_PLACES = [
  { name: 'Seco', slug: 'seco', lat: 34.0787, lng: -118.2632, neighborhood: 'Silver Lake', category: 'Wine Bar' },
  { name: 'Bar Covell', slug: 'bar-covell', lat: 34.1045, lng: -118.2876, neighborhood: 'Los Feliz', category: 'Wine Bar' },
  { name: 'Vinovore', slug: 'vinovore', lat: 34.0799, lng: -118.2711, neighborhood: 'Silver Lake', category: 'Wine Shop' },
  { name: '1642', slug: '1642', lat: 34.0774, lng: -118.2598, neighborhood: 'Echo Park', category: 'Wine Bar' },
  { name: 'Psychic Wines', slug: 'psychic-wines', lat: 34.0812, lng: -118.2654, neighborhood: 'Silver Lake', category: 'Shop' },
  { name: 'Helen\'s Wines', slug: 'helens-wines', lat: 34.0711, lng: -118.2422, neighborhood: 'Frogtown', category: 'Wine Bar' },
  { name: 'Tabula Rasa', slug: 'tabula-rasa', lat: 34.0922, lng: -118.2956, neighborhood: 'East Hollywood', category: 'Wine Bar' },
  { name: 'Tilda', slug: 'tilda', lat: 34.0744, lng: -118.2611, neighborhood: 'Echo Park', category: 'Wine Bar' },
  { name: 'Augustine Wine Bar', slug: 'augustine-wine-bar', lat: 34.0789, lng: -118.2722, neighborhood: 'Silver Lake', category: 'Wine Bar' },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('Seeding Field Notes test map...\n');

  // Ensure demo user exists (dev)
  const user = await prisma.user.upsert({
    where: { id: 'demo-user-id' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@saikomaps.com',
      name: 'Demo User',
      passwordHash: 'demo-hash-not-for-production',
    },
  });
  console.log('✓ User:', user.email);

  const slug = 'silver-lake-natural-wine-' + Date.now().toString(36).slice(-6);

  // Create the list (map) with Field Notes template
  const list = await prisma.list.create({
    data: {
      userId: user.id,
      title: 'Silver Lake Natural Wine',
      subtitle: 'Wine Bars · Silver Lake',
      description: "The spots where the list is good and nobody's pretentious about it. All eastside, all walkable from each other.",
      slug,
      templateType: 'field_notes',
      published: true,
      status: 'PUBLISHED',
    },
  });
  console.log('✓ List created:', list.slug, `(template: ${list.templateType})`);

  // Create places and map places
  for (let i = 0; i < SAMPLE_PLACES.length; i++) {
    const p = SAMPLE_PLACES[i];
    const placeSlug = slugify(p.slug);
    const place = await prisma.place.upsert({
      where: { slug: placeSlug },
      update: { latitude: p.lat, longitude: p.lng, neighborhood: p.neighborhood, category: p.category },
      create: {
        slug: placeSlug,
        name: p.name,
        latitude: p.lat,
        longitude: p.lng,
        neighborhood: p.neighborhood,
        category: p.category,
      },
    });
    await prisma.mapPlace.create({
      data: {
        mapId: list.id,
        placeId: place.id,
        orderIndex: i,
        descriptor: i === 0 ? "The best natural wine list on the eastside. Unpretentious and always interesting." : undefined,
      },
    });
  }
  console.log('✓ Added', SAMPLE_PLACES.length, 'places');

  console.log('\n✅ Done!\n');
  console.log('View your Field Notes map at:');
  console.log(`  http://localhost:3000/map/${list.slug}\n`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
