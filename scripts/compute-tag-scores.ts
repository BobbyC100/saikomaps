/**
 * Compute Tag scores — CTO Spec §6.2
 *
 * Usage:
 *   npx tsx scripts/compute-tag-scores.ts --place <place_id> --depends energy_v1
 *   npx tsx scripts/compute-tag-scores.ts --all --version tags_v1 --depends energy_v1
 *
 * Requirements: Verifies energy_version exists, writes to place_tag_scores, deterministic.
 */

import { db } from '@/lib/db';
import { computeTagScores } from '@/lib/energy-tag-engine';
import type { TagScoreInputs } from '@/lib/energy-tag-engine';
import { parseAttrs, isBarForward, buildCoverageAboutText } from '@/lib/energy-tag-engine/shared';
import { randomUUID } from 'crypto';

const DEFAULT_TAG_VERSION = 'tags_v1';

async function getPlaceIds(placeIdArg: string | null): Promise<{ placeIds: string[]; placeIdToGolden: Map<string, { canonical_id: string; slug: string; description: string | null; about_copy: string | null; google_places_attributes: unknown; category: string | null }> }> {
  const placeIdToGolden = new Map<string, { canonical_id: string; slug: string; description: string | null; about_copy: string | null; google_places_attributes: unknown; category: string | null }>();

  if (placeIdArg) {
    const place = await db.places.findUnique({
      where: { id: placeIdArg },
      select: { id: true, googlePlaceId: true },
    });
    if (!place) {
      console.error('Place not found:', placeIdArg);
      process.exit(1);
    }
    if (!place.googlePlaceId) {
      console.error('Place has no googlePlaceId:', placeIdArg);
      process.exit(1);
    }
    const golden = await db.golden_records.findFirst({
      where: { google_place_id: place.googlePlaceId },
      select: { canonical_id: true, slug: true, description: true, about_copy: true, google_places_attributes: true, category: true },
    });
    if (!golden) {
      console.error('No golden record for place:', placeIdArg);
      process.exit(1);
    }
    placeIdToGolden.set(place.id, golden);
    return { placeIds: [place.id], placeIdToGolden };
  }

  const places = await db.places.findMany({
    where: { googlePlaceId: { not: null } },
    select: { id: true, googlePlaceId: true },
  });
  const googleIds = [...new Set(places.map((p) => p.googlePlaceId).filter((id): id is string => id != null))];
  const golden = await db.golden_records.findMany({
    where: { google_place_id: { in: googleIds } },
    select: { canonical_id: true, slug: true, description: true, about_copy: true, google_places_attributes: true, category: true, google_place_id: true },
  });
  const googleIdToPlaceId = new Map<string, string>();
  for (const p of places) {
    if (p.googlePlaceId) googleIdToPlaceId.set(p.googlePlaceId, p.id);
  }
  const placeIds: string[] = [];
  for (const g of golden) {
    const placeId = g.google_place_id ? googleIdToPlaceId.get(g.google_place_id) : undefined;
    if (placeId) {
      if (!placeIdToGolden.has(placeId)) placeIds.push(placeId);
      placeIdToGolden.set(placeId, {
        canonical_id: g.canonical_id,
        slug: g.slug,
        description: g.description,
        about_copy: g.about_copy,
        google_places_attributes: g.google_places_attributes,
        category: g.category,
      });
    }
  }
  return { placeIds, placeIdToGolden };
}

async function main() {
  const args = process.argv.slice(2);
  const placeArg = args.find((a) => a.startsWith('--place='))?.split('=')[1] ?? (args[0] === '--place' ? args[1] : null);
  const all = args.includes('--all');
  const versionArg = args.find((a) => a.startsWith('--version='))?.split('=')[1];
  const dependsArg = args.find((a) => a.startsWith('--depends='))?.split('=')[1];
  const tagVersion = versionArg ?? DEFAULT_TAG_VERSION;
  const energyVersion = dependsArg;

  if (!energyVersion) {
    console.error('Usage: npx tsx scripts/compute-tag-scores.ts (--place <id> | --all) --depends <energy_version> [--version <tag_version>]');
    console.error('Required: --depends <energy_version>');
    process.exit(1);
  }
  if (!placeArg && !all) {
    console.error('Usage: npx tsx scripts/compute-tag-scores.ts --place <id> | --all --depends <energy_version> [--version <tag_version>]');
    process.exit(1);
  }

  const ev = await db.energy_versions.findUnique({ where: { version: energyVersion } });
  if (!ev) {
    console.error(`Energy version not found: ${energyVersion}`);
    process.exit(1);
  }
  const tv = await db.tag_versions.findUnique({ where: { version: tagVersion } });
  if (!tv) {
    console.error(`Tag version not found: ${tagVersion}. Ensure tag_versions has this version with depends_on_energy_version=${energyVersion}`);
    process.exit(1);
  }

  const { placeIds, placeIdToGolden } = await getPlaceIds(placeArg);
  console.log(`Compute tag scores (version=${tagVersion}, depends=${energyVersion}): ${placeIds.length} place(s)`);

  const now = new Date();
  let ok = 0;
  let fail = 0;

  for (const placeId of placeIds) {
    try {
      const gr = placeIdToGolden.get(placeId);
      if (!gr) {
        fail++;
        continue;
      }

      const existing = await db.energy_scores.findUnique({
        where: { place_id_version: { place_id: placeId, version: energyVersion } },
      });
      const energy_score = existing?.energy_score ?? 50;
      const energy_confidence = existing?.energy_confidence ?? 0.5;

      const attrs = parseAttrs(gr.google_places_attributes);
      const inputs: TagScoreInputs = {
        energy_score,
        energy_confidence,
        coverageAboutText: buildCoverageAboutText(gr),
        liveMusic: attrs.liveMusic,
        goodForGroups: attrs.goodForGroups,
        barForward: isBarForward(gr),
      };
      const result = computeTagScores(inputs);

      await db.place_tag_scores.upsert({
        where: { place_id_version: { place_id: placeId, version: tagVersion } },
        create: {
          id: randomUUID(),
          place_id: placeId,
          cozy_score: result.cozy_score,
          date_night_score: result.date_night_score,
          late_night_score: result.late_night_score,
          after_work_score: result.after_work_score,
          scene_score: result.scene_score,
          confidence: result.confidence,
          version: tagVersion,
          depends_on_energy_version: energyVersion,
          computed_at: now,
        },
        update: {
          cozy_score: result.cozy_score,
          date_night_score: result.date_night_score,
          late_night_score: result.late_night_score,
          after_work_score: result.after_work_score,
          scene_score: result.scene_score,
          confidence: result.confidence,
          depends_on_energy_version: energyVersion,
          computed_at: now,
        },
      });
      ok++;
    } catch (err) {
      console.error(`Failed place ${placeId}:`, err);
      fail++;
    }
  }

  console.log(`Done: ${ok} ok, ${fail} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
