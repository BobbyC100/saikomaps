/**
 * Coverage Census — Exact counts for Energy + Tag Engine diagnostics
 *
 * Usage: npx tsx scripts/coverage-census.ts [--la-only]
 *
 * --la-only: Use v_places_la_bbox (no golden_records dependency). Use when golden_records is empty.
 *
 * Reports: total places, linkage, pipeline completeness, golden record signal coverage
 */

import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const laOnly = process.argv.includes('--la-only');

async function main() {
  if (laOnly) {
    const [total, withGpid] = await Promise.all([
      db.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM public.v_places_la_bbox`,
      db.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM public.v_places_la_bbox WHERE google_place_id IS NOT NULL AND btrim(COALESCE(google_place_id,'')) != ''`,
    ]);
    console.log('--- Coverage Census (LA-only, v_places_la_bbox) ---');
    console.log('total_places:', Number(total[0]?.count ?? 0));
    console.log('places_with_googlePlaceId:', Number(withGpid[0]?.count ?? 0));
    console.log('golden_records: N/A (LA-only mode, no golden_records join)');
    return;
  }

  const [
    totalPlaces,
    placesWithGooglePlaceId,
    goldenWithPlaceId,
    placesWithMatchingGolden,
    goldenWithDescriptionOrAbout,
    goldenWithAttributes,
  ] = await Promise.all([
    db.places.count(),
    db.places.count({ where: { googlePlaceId: { not: null } } }),
    db.golden_records.count({ where: { google_place_id: { not: null } } }),
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT p.id)::bigint as count
      FROM places p
      INNER JOIN golden_records g ON g.google_place_id = p.google_place_id
      WHERE p.google_place_id IS NOT NULL
    `,
    db.golden_records.count({
      where: {
        OR: [
          { description: { not: null, not: '' } },
          { about_copy: { not: null, not: '' } },
        ],
      },
    }),
    db.golden_records.count({ where: { google_places_attributes: { not: null } } }),
  ]);

  const linkageCount = Number(placesWithMatchingGolden[0]?.count ?? 0);

  let goldenWithAttrsPresent = 0;
  try {
    const r = await db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM golden_records
      WHERE google_places_attributes IS NOT NULL
        AND jsonb_typeof(COALESCE(google_places_attributes->'types','[]'::jsonb)) = 'array'
        AND jsonb_array_length(COALESCE(google_places_attributes->'types','[]'::jsonb)) > 0
        AND (
          (google_places_attributes ? 'serves_beer')
          OR (google_places_attributes ? 'serves_wine')
          OR (google_places_attributes ? 'delivery')
          OR (google_places_attributes ? 'dine_in')
          OR (google_places_attributes ? 'takeout')
          OR (google_places_attributes ? 'reservable')
        )
    `;
    goldenWithAttrsPresent = Number(r[0]?.count ?? 0);
  } catch {
    goldenWithAttrsPresent = goldenWithAttributes;
  }

  let placesWithEnergyScores = 0;
  let placesWithTagScores = 0;
  try {
    [placesWithEnergyScores, placesWithTagScores] = await Promise.all([
      db.energy_scores.count({ where: { version: 'energy_v1' } }),
      db.place_tag_scores.count({ where: { version: 'tags_v1' } }),
    ]);
  } catch {
    // Tables may not exist before migration
  }

  let goldenWithPopularTimes = 0;
  try {
    const r = await db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM golden_records
      WHERE google_places_attributes IS NOT NULL
        AND (google_places_attributes ? 'popular_times')
        AND jsonb_typeof(google_places_attributes->'popular_times') IN ('array','object')
        AND (
          (jsonb_typeof(google_places_attributes->'popular_times') = 'array' AND jsonb_array_length(google_places_attributes->'popular_times') > 0)
          OR
          (jsonb_typeof(google_places_attributes->'popular_times') = 'object' AND google_places_attributes->'popular_times' != '{}'::jsonb)
        )
    `;
    goldenWithPopularTimes = Number(r[0]?.count ?? 0);
  } catch {
    // JSONB operators may differ; fallback to 0
  }

  console.log('--- Coverage Census ---');
  console.log('total_places:', totalPlaces);
  console.log('places_with_googlePlaceId:', placesWithGooglePlaceId);
  console.log('golden_records_with_google_place_id:', goldenWithPlaceId);
  console.log('places_with_matching_golden_record:', linkageCount);
  console.log('places_with_energy_scores_v1:', placesWithEnergyScores);
  console.log('places_with_place_tag_scores_v1:', placesWithTagScores);
  console.log('golden_records_with_description_or_about_copy:', goldenWithDescriptionOrAbout);
  console.log('golden_records_with_google_places_attributes:', goldenWithAttributes);
  console.log('golden_records_with_attrs_present:', goldenWithAttrsPresent);
  console.log('golden_records_with_popular_times:', goldenWithPopularTimes);

  const goldPath = path.join(process.cwd(), 'data/gold_sets/vibe_tags_v1.csv');
  if (fs.existsSync(goldPath)) {
    const raw = fs.readFileSync(goldPath, 'utf-8');
    const lines = raw.split('\n').filter((l) => l.trim());
    const header = (lines[0] ?? '').split(',');
    const tagIdx = header.findIndex((h) => h.toLowerCase().trim() === 'tag');
    const labelIdx = header.findIndex((h) => h.toLowerCase().trim() === 'label');
    const rows = lines.slice(1).map((line) => {
      const parts = line.split(',');
      return {
        tag: tagIdx >= 0 ? parts[tagIdx]?.trim() : '',
        label: labelIdx >= 0 ? (parseInt(parts[labelIdx] ?? '0', 10) === 1 ? 1 : 0) : 0,
      };
    }).filter((r) => r.tag);

    const byTag = new Map<string, { label0: number; label1: number }>();
    for (const r of rows) {
      const t = byTag.get(r.tag) ?? { label0: 0, label1: 0 };
      if (r.label === 1) t.label1++;
      else t.label0++;
      byTag.set(r.tag, t);
    }

    console.log('\n--- Gold Set Sanity (vibe_tags_v1.csv) ---');
    console.log('total_rows:', rows.length);
    for (const [tag, counts] of byTag.entries()) {
      const total = counts.label0 + counts.label1;
      const insufficient = counts.label0 < 15 || counts.label1 < 15;
      console.log(`${tag}: label=0 (${counts.label0}), label=1 (${counts.label1})${insufficient ? ' [INSUFFICIENT for meaningful metrics]' : ''}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
