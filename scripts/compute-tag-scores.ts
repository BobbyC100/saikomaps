/**
 * Compute Tag scores — CTO Spec §6.2
 *
 * Usage:
 *   npx tsx scripts/compute-tag-scores.ts --place <place_id> --depends energy_v1
 *   npx tsx scripts/compute-tag-scores.ts --all --version tags_v1 --depends energy_v1
 *   npx tsx scripts/compute-tag-scores.ts --la-only --depends energy_v1 [--limit N]
 *
 * --la-only: Use v_places_la_bbox_golden (requires SAIKO_DB_FROM_WRAPPER=1).
 */

import { db } from '@/lib/db';
import { getPlaceIds as getPlaceIdsFromLA } from '@/lib/la-scope';
import { computeTagScores } from '@/lib/energy-tag-engine';
import type { TagScoreInputs } from '@/lib/energy-tag-engine';
import { parseAttrs, isBarForward, buildCoverageAboutText } from '@/lib/energy-tag-engine/shared';
import { areAttributesPresent } from '@/lib/google-places';
import { randomUUID } from 'crypto';

const DEFAULT_TAG_VERSION = 'tags_v1';

type PlaceInputRow = {
  id: string;
  slug: string;
  description: string | null;
  category: string | null;
  googlePlacesAttributes: unknown;
  about_copy: string | null;
  energy_scores: { energy_score: number; energy_confidence: number }[];
};

async function fetchPlaceIdToPlaceData(
  placeIds: string[],
  energyVersion: string
): Promise<Map<string, PlaceInputRow>> {
  const map = new Map<string, PlaceInputRow>();
  if (placeIds.length === 0) return map;
  const places = await db.places.findMany({
    where: { id: { in: placeIds } },
    select: {
      id: true,
      slug: true,
      description: true,
      category: true,
      googlePlacesAttributes: true,
      googlePlaceId: true,
      energy_scores: {
        where: { version: energyVersion },
        select: { energy_score: true, energy_confidence: true },
      },
    },
  });
  const googleIds = [...new Set(places.map((p) => p.googlePlaceId).filter((id): id is string => id != null))];
  let aboutCopyByGoogleId = new Map<string, string | null>();
  if (googleIds.length > 0) {
    const golden = await db.golden_records.findMany({
      where: { google_place_id: { in: googleIds } },
      select: { google_place_id: true, about_copy: true },
    });
    for (const g of golden) {
      if (g.google_place_id) aboutCopyByGoogleId.set(g.google_place_id, g.about_copy);
    }
  }
  for (const p of places) {
    map.set(p.id, {
      id: p.id,
      slug: p.slug,
      description: p.description,
      category: p.category,
      googlePlacesAttributes: p.googlePlacesAttributes,
      about_copy: p.googlePlaceId ? aboutCopyByGoogleId.get(p.googlePlaceId) ?? null : null,
      energy_scores: p.energy_scores,
    });
  }
  return map;
}

async function getPlaceIds(placeIdArg: string | null, laOnly: boolean, limitArg: number | null): Promise<string[]> {
  if (laOnly) {
    if (process.env.SAIKO_DB_FROM_WRAPPER !== '1') {
      throw new Error('--la-only requires SAIKO_DB_FROM_WRAPPER=1. Use db-neon.sh or db-local.sh.');
    }
    const ids = await getPlaceIdsFromLA({ laOnly: true, limit: limitArg });
    return ids ?? [];
  }

  if (placeIdArg) {
    const place = await db.places.findUnique({
      where: { id: placeIdArg },
      select: { id: true },
    });
    if (!place) {
      console.error('Place not found:', placeIdArg);
      process.exit(1);
    }
    return [place.id];
  }

  const places = await db.places.findMany({
    where: { googlePlaceId: { not: null } },
    select: { id: true },
  });
  return places.map((p) => p.id);
}

async function main() {
  const args = process.argv.slice(2);
  const placeArg = args.find((a) => a.startsWith('--place='))?.split('=')[1] ?? (args[0] === '--place' ? args[1] : null);
  const all = args.includes('--all');
  const laOnly = args.includes('--la-only');
  const explainInputs = args.includes('--explain-inputs');
  const limitIdx = args.indexOf('--limit');
  const limitArg = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;
  const versionArg = args.find((a) => a.startsWith('--version='))?.split('=')[1];
  const dependsArg = args.find((a) => a.startsWith('--depends='))?.split('=')[1];
  const tagVersion = versionArg ?? DEFAULT_TAG_VERSION;
  const energyVersion = dependsArg;

  if (!energyVersion) {
    console.error('Usage: npx tsx scripts/compute-tag-scores.ts (--place <id> | --all | --la-only) --depends <energy_version> [--version <tag_version>] [--limit N]');
    console.error('Required: --depends <energy_version>');
    process.exit(1);
  }
  if (!placeArg && !all && !laOnly) {
    console.error('Usage: npx tsx scripts/compute-tag-scores.ts --place <id> | --all | --la-only --depends <energy_version> [--version <tag_version>]');
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

  const placeIds = await getPlaceIds(placeArg, laOnly, limitArg);
  const placeIdToPlaceData = await fetchPlaceIdToPlaceData(placeIds, energyVersion);
  console.log(`[SCOPE] laOnly=${laOnly} ids=${placeIds.length} limit=${limitArg ?? 'none'}`);
  if (explainInputs) {
    console.log('--explain-inputs: per-place input coverage breakdown (no writes)\n');
  } else {
    console.log(`Compute tag scores (version=${tagVersion}, depends=${energyVersion}): ${placeIds.length} place(s)`);
  }

  const now = new Date();
  let ok = 0;
  let fail = 0;
  const explainRows: { slug: string; hasInputCoverage: boolean; highConfidenceEligible: boolean }[] = [];

  for (const placeId of placeIds) {
    try {
      const row = placeIdToPlaceData.get(placeId);
      if (!row) {
        fail++;
        continue;
      }

      const es = row.energy_scores[0] ?? null;
      if (!es) {
        fail++;
        continue;
      }
      const energy_score = es.energy_score;
      const energy_confidence = es.energy_confidence;

      const coverageAboutText = buildCoverageAboutText({
        description: row.description,
        about_copy: row.about_copy,
      });
      const coverageTextLen = coverageAboutText?.trim().length ?? 0;

      const attrs = parseAttrs(row.googlePlacesAttributes);
      const attrsPresent = areAttributesPresent(row.googlePlacesAttributes);
      const hasInputCoverage = coverageTextLen > 0 || attrsPresent;

      const inputs: TagScoreInputs = {
        energy_score,
        energy_confidence,
        coverageAboutText,
        liveMusic: attrs.liveMusic,
        goodForGroups: attrs.goodForGroups,
        barForward: isBarForward({
          category: row.category,
          google_places_attributes: row.googlePlacesAttributes,
        }),
      };
      const result = computeTagScores(inputs);

      const highConfidenceEligible = coverageTextLen > 0;
      const confidence =
        coverageTextLen > 0 ? 0.7 : attrsPresent ? 0.25 : 0;

      if (explainInputs) {
        explainRows.push({ slug: row.slug, hasInputCoverage, highConfidenceEligible });
        const gpa = row.googlePlacesAttributes;
        const gpaPresent = !!gpa && typeof gpa === 'object';
        const descTrim = (row.description ?? '').trim();
        const aboutTrim = (row.about_copy ?? '').trim();
        console.log(`[${row.slug}]`);
        console.log(`  places.description: present=${descTrim.length > 0} length=${descTrim.length}`);
        console.log(`  about_copy: present=${aboutTrim.length > 0} length=${aboutTrim.length}`);
        console.log(`  coverageAboutText: length=${coverageAboutText.length}`);
        console.log(`  places.google_places_attributes: present=${gpaPresent}`);
        console.log(`  energy_score=${energy_score} energy_confidence=${energy_confidence}`);
        console.log(`  liveMusic=${attrs.liveMusic} goodForGroups=${attrs.goodForGroups} barForward=${isBarForward({ category: row.category, google_places_attributes: row.googlePlacesAttributes })}`);
        console.log(`  hasInputCoverage=${hasInputCoverage} highConfidenceEligible=${highConfidenceEligible} confidence=${confidence}`);
        console.log('');
      }

      if (!explainInputs) {
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
          confidence,
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
          confidence,
          depends_on_energy_version: energyVersion,
          computed_at: now,
        },
      });
      }
      ok++;
    } catch (err) {
      console.error(`Failed place ${placeId}:`, err);
      fail++;
    }
  }

  if (explainInputs && explainRows.length > 0) {
    const total = explainRows.length;
    const inputsPresentCount = explainRows.filter((r) => r.hasInputCoverage).length;
    const input_coverage_pct = total > 0 ? (inputsPresentCount / total) * 100 : 0;
    console.log('--- Summary ---');
    console.log(`inputs_present_count=${inputsPresentCount} total=${total}`);
    console.log(`input_coverage_pct=${input_coverage_pct.toFixed(1)}`);
  }

  if (!explainInputs) {
    console.log(`Done: ${ok} ok, ${fail} failed`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
