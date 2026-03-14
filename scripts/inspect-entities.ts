import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const slugs = [
  'bestia-restaurant-1-arts-district-italian-perennial-every-list-staple',
  'camphor-restaurant-2-michelin-1-michelin-star-arts-district-french',
  'kismet-restaurant-4-iconic-los-feliz-middle-eastern',
];

async function main() {
  for (const slug of slugs) {
    const e = await db.entities.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, website: true, instagram: true, googlePlaceId: true, neighborhood: true, category: true }
    });
    if (e === null) { console.log(slug, '— NOT FOUND'); continue; }

    const surfaces = await db.merchant_surfaces.count({ where: { entity_id: e.id } });
    const signals = await db.derived_signals.findFirst({
      where: { entity_id: e.id, signal_key: 'identity_signals' },
      select: { signal_value: true }
    });
    const tagline = await db.interpretation_cache.findFirst({
      where: { entity_id: e.id, output_type: 'TAGLINE', is_current: true },
      select: { content: true }
    });
    const ces = await db.canonical_entity_state.findFirst({
      where: { entity_id: e.id },
      select: { google_place_id: true, website: true }
    });

    console.log('---', e.name, '---');
    console.log('  slug:      ', e.slug);
    console.log('  website:   ', e.website ?? '(null)');
    console.log('  instagram: ', e.instagram ?? '(null)');
    console.log('  gpid:      ', e.googlePlaceId ?? '(null)');
    console.log('  surfaces:  ', surfaces);
    console.log('  signals:   ', signals ? 'YES' : 'no');
    console.log('  tagline:   ', tagline ? 'YES' : 'no');
    console.log('  ces.website:', ces?.website ?? '(null)');
    console.log('');
  }
}

main().catch(console.error).finally(() => db.$disconnect());
