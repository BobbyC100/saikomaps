/**
 * Score linkage doctor — report place ↔ golden_record linkage for requested slugs.
 * Usage: npx tsx scripts/score-linkage-doctor.ts [--slugs=dunsmoor,buvons,dan-tanas,covell]
 *
 * For each slug prints: place exists?, googlePlaceId present?, golden_record exists?, golden_record id.
 */

import { db } from '@/lib/db';

const DEFAULT_SLUGS = ['dunsmoor', 'buvons', 'dan-tanas', 'covell'];

async function main() {
  const arg = process.argv.find((a) => a.startsWith('--slugs='));
  const slugs = arg ? arg.split('=')[1]?.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_SLUGS;

  console.log('Score linkage doctor');
  console.log('Requested slugs:', slugs.join(', '));
  console.log('');

  for (const slug of slugs) {
    const place = await db.places.findUnique({
      where: { slug },
      select: { id: true, name: true, googlePlaceId: true },
    });

    const placeExists = !!place;
    const googlePlaceId = place?.googlePlaceId ?? null;

    let goldenExists = false;
    let goldenId: string | null = null;
    if (googlePlaceId) {
      const golden = await db.golden_records.findFirst({
        where: { google_place_id: googlePlaceId },
        select: { canonical_id: true, slug: true, name: true },
      });
      goldenExists = !!golden;
      goldenId = golden?.canonical_id ?? null;
    }

    console.log(`Slug: ${slug}`);
    console.log(`  place exists?        ${placeExists ? 'Y' : 'N'}`);
    console.log(`  googlePlaceId       ${googlePlaceId ?? 'null'}`);
    console.log(`  golden_record exists? ${goldenExists ? 'Y' : 'N'}`);
    console.log(`  golden_record id    ${goldenId ?? '—'}`);
    if (placeExists && place?.name) console.log(`  place name           ${place.name}`);
    if (goldenExists && goldenId) {
      const g = await db.golden_records.findUnique({
        where: { canonical_id: goldenId },
        select: { slug: true, name: true },
      });
      if (g) console.log(`  golden slug/name     ${g.slug} / ${g.name}`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
