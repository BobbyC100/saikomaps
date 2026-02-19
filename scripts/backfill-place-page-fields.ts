/**
 * Backfill script for place page fields (Schema Updates directive Feb 2026)
 *
 * Run: npx tsx scripts/backfill-place-page-fields.ts [transit|thematic|contextual|curator|all]
 *
 * Options:
 *   transit     - Backfill transitAccessible (currently sets null for all; manual/LA Metro logic TBD)
 *   thematic    - Extract thematicTags from curatorNote/place_personality/sources (stub: no-op)
 *   contextual  - Generate contextualConnection (stub: no-op)
 *   curator     - Populate curatorAttribution from map_places.descriptor source (stub: no-op)
 *   all         - Run all (stubs for thematic/contextual/curator until logic implemented)
 *
 * Data population strategy (from directive):
 * - transitAccessible: Option B for V1 — mark as null, manual curation later
 * - thematicTags: Extract from curatorNote, place_personality, sources — requires AI or manual
 * - contextualConnection: Generate from neighborhood + vertical + personality — requires AI or manual
 * - curatorAttribution: Pull from map_places when place has descriptor — needs map_places join
 */

import { db } from '@/lib/db';

async function backfillTransit() {
  console.log('Backfilling transitAccessible...');
  // Option B: Leave as null for manual curation. No-op update to ensure column exists.
  const count = await db.places.count();
  console.log(`  Places table has ${count} rows. transitAccessible left as null (manual curation for V1).`);
}

async function backfillThematic() {
  console.log('Backfilling thematicTags...');
  // Stub: Would parse curatorNote, map place_personality to tags, extract from editorial sources.
  // Recommend: AI extraction or manual editorial curation.
  const withContent = await db.places.count({
    where: {
      OR: [
        { vibeTags: { isEmpty: false } },
        { editorialSources: { not: null } },
      ],
    },
  });
  console.log(`  ${withContent} places have content to extract thematic tags from (stub: no-op).`);
  console.log('  TODO: Implement extraction from curatorNote, place_personality, sources[].excerpt');
}

async function backfillContextual() {
  console.log('Backfilling contextualConnection...');
  // Stub: Would generate from neighborhood + primary_vertical + tagline/description.
  // Recommend: AI generation or manual curation for featured places.
  const count = await db.places.count();
  console.log(`  ${count} places. contextualConnection left null (stub: no-op).`);
  console.log('  TODO: Implement generation from neighborhood + vertical + personality');
}

async function backfillCurator() {
  console.log('Backfilling curatorAttribution...');
  // Populate from map_places when place has a descriptor (curator note) on a map.
  const mapPlacesWithDescriptor = await db.map_places.findMany({
    where: { descriptor: { not: null } },
    include: {
      places: { select: { id: true, slug: true } },
      lists: { select: { users: { select: { name: true, email: true } } } },
    },
  });

  let updated = 0;
  for (const mp of mapPlacesWithDescriptor) {
    const attribution =
      mp.lists?.users?.name ??
      mp.lists?.users?.email?.split('@')[0] ??
      null;
    if (!attribution) continue;

    await db.places.update({
      where: { id: mp.placeId },
      data: { curatorAttribution: attribution },
    });
    updated++;
    if (updated <= 5) {
      console.log(`  ${mp.places.slug} → "${attribution}"`);
    }
  }
  console.log(`  Updated ${updated} places with curatorAttribution from map_places.`);
}

async function main() {
  const arg = process.argv[2] || 'all';
  const valid = ['transit', 'thematic', 'contextual', 'curator', 'all'];
  if (!valid.includes(arg)) {
    console.error(`Usage: npx tsx scripts/backfill-place-page-fields.ts [${valid.join('|')}]`);
    process.exit(1);
  }

  console.log('Backfill place page fields (Schema Updates directive)\n');

  if (arg === 'transit' || arg === 'all') await backfillTransit();
  if (arg === 'thematic' || arg === 'all') await backfillThematic();
  if (arg === 'contextual' || arg === 'all') await backfillContextual();
  if (arg === 'curator' || arg === 'all') await backfillCurator();

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
