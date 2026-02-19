/**
 * Backfill Energy + Tag Engine v1
 * CTO Spec §12: Migrate schema → Backfill energy_scores → Backfill tag_scores
 *
 * Usage:
 *   npx tsx scripts/backfill-energy-tag-engine.ts [--dry-run]
 *   npx tsx scripts/backfill-energy-tag-engine.ts --energy-only [--dry-run]
 *   npx tsx scripts/backfill-energy-tag-engine.ts --tags-only [--dry-run]
 *   npx tsx scripts/backfill-energy-tag-engine.ts --place-slugs=a,b [--dry-run]
 *
 * Reads from golden_records (description, about_copy, google_places_attributes).
 * Writes to energy_scores and place_tag_scores keyed by places.id.
 */

import { db } from '@/lib/db';
import { computeEnergy, computeTagScores } from '@/lib/energy-tag-engine';
import type { EnergyInputs, TagScoreInputs } from '@/lib/energy-tag-engine';
import { randomUUID } from 'crypto';

const ENERGY_VERSION = 'energy_v1';
const TAG_VERSION = 'tags_v1';

type GoldenRow = {
  canonical_id: string;
  slug: string;
  description: string | null;
  about_copy: string | null;
  google_places_attributes: unknown;
  category: string | null;
};

function parseAttrs(attrs: unknown): { liveMusic?: boolean; goodForGroups?: boolean } {
  if (!attrs || typeof attrs !== 'object') return {};
  const o = attrs as Record<string, unknown>;
  return {
    liveMusic: o.liveMusic === true || o.live_music === true,
    goodForGroups: o.goodForGroups === true || o.good_for_groups === true,
  };
}

function isBarForward(gr: { category?: string | null; google_places_attributes?: unknown }): boolean {
  const cat = (gr.category ?? '').toLowerCase();
  if (/bar|wine bar|cocktail|pub/.test(cat)) return true;
  const attrs = gr.google_places_attributes as Record<string, unknown> | null;
  if (attrs && typeof attrs === 'object') {
    const types = attrs.types as string[] | undefined;
    if (types?.some((t) => /bar|cafe|night_club/.test(t))) return true;
  }
  return false;
}

function buildCoverageAboutText(gr: { description?: string | null; about_copy?: string | null }): string {
  const parts = [gr.description, gr.about_copy].filter(Boolean) as string[];
  return parts.join('\n\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const energyOnly = args.includes('--energy-only');
  const tagsOnly = args.includes('--tags-only');
  const placeSlugsArg = args.find((a) => a.startsWith('--place-slugs='));
  const placeSlugList = placeSlugsArg
    ? placeSlugsArg
        .split('=')[1]
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? []
    : null;

  console.log('Energy + Tag Engine v1 — Backfill');
  console.log(dryRun ? '(dry-run: no DB writes)\n' : '');

  // Resolve places with golden records
  let placeIds: string[] = [];
  const placeIdToGolden = new Map<string, GoldenRow>();

  if (placeSlugList?.length) {
    const places = await db.places.findMany({
      where: { slug: { in: placeSlugList } },
      select: { id: true, googlePlaceId: true },
    });
    const googleIds = [...new Set(places.map((p) => p.googlePlaceId).filter((id): id is string => id != null))];
    if (googleIds.length === 0) {
      console.log('No places found for slugs:', placeSlugList);
      process.exit(1);
    }
    const golden = await db.golden_records.findMany({
      where: { google_place_id: { in: googleIds } },
      select: {
        canonical_id: true,
        slug: true,
        description: true,
        about_copy: true,
        google_places_attributes: true,
        category: true,
        google_place_id: true,
      },
    });
    const googleIdToPlaceId = new Map<string, string>();
    for (const p of places) {
      if (p.googlePlaceId) googleIdToPlaceId.set(p.googlePlaceId, p.id);
    }
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
  } else {
    const places = await db.places.findMany({
      where: { googlePlaceId: { not: null } },
      select: { id: true, googlePlaceId: true },
    });
    const googleIds = [...new Set(places.map((p) => p.googlePlaceId).filter((id): id is string => id != null))];
    if (googleIds.length === 0) {
      console.log('No places with googlePlaceId found.');
      process.exit(1);
    }
    const golden = await db.golden_records.findMany({
      where: { google_place_id: { in: googleIds } },
      select: {
        canonical_id: true,
        slug: true,
        description: true,
        about_copy: true,
        google_places_attributes: true,
        category: true,
        google_place_id: true,
      },
    });
    const googleIdToPlaceId = new Map<string, string>();
    for (const p of places) {
      if (p.googlePlaceId) googleIdToPlaceId.set(p.googlePlaceId, p.id);
    }
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
  }

  const now = new Date();
  let energyCount = 0;
  let tagCount = 0;

  if (!tagsOnly) {
    for (const placeId of placeIds) {
      const gr = placeIdToGolden.get(placeId);
      if (!gr) continue;

      const attrs = parseAttrs(gr.google_places_attributes);
      const energyInputs: EnergyInputs = {
        popularityComponent: null,
        coverageAboutText: buildCoverageAboutText(gr),
        liveMusic: attrs.liveMusic,
        goodForGroups: attrs.goodForGroups,
        barForward: isBarForward(gr),
      };
      const result = computeEnergy(energyInputs);

      if (!dryRun) {
        await db.energy_scores.upsert({
          where: {
            place_id_version: { place_id: placeId, version: ENERGY_VERSION },
          },
          create: {
            id: randomUUID(),
            place_id: placeId,
            energy_score: result.energy_score,
            energy_confidence: result.energy_confidence,
            popularity_component: result.popularity_component,
            language_component: result.language_component,
            flags_component: result.flags_component,
            sensory_component: result.sensory_component,
            has_popularity: result.has_popularity,
            has_language: result.has_language,
            has_flags: result.has_flags,
            has_sensory: result.has_sensory,
            version: result.version,
            computed_at: now,
          },
          update: {
            energy_score: result.energy_score,
            energy_confidence: result.energy_confidence,
            popularity_component: result.popularity_component,
            language_component: result.language_component,
            flags_component: result.flags_component,
            sensory_component: result.sensory_component,
            has_popularity: result.has_popularity,
            has_language: result.has_language,
            has_flags: result.has_flags,
            has_sensory: result.has_sensory,
            computed_at: now,
          },
        });
      }
      energyCount++;
    }
    console.log(`Energy scores: ${energyCount} computed ${dryRun ? '(dry-run)' : '(saved)'}`);
  }

  if (!energyOnly) {
    for (const placeId of placeIds) {
      const gr = placeIdToGolden.get(placeId);
      if (!gr) continue;

      let energy_score = 50;
      let energy_confidence = 0.5;
      if (!tagsOnly) {
        const attrs = parseAttrs(gr.google_places_attributes);
        const energyInputs: EnergyInputs = {
          popularityComponent: null,
          coverageAboutText: buildCoverageAboutText(gr),
          liveMusic: attrs.liveMusic,
          goodForGroups: attrs.goodForGroups,
          barForward: isBarForward(gr),
        };
        const er = computeEnergy(energyInputs);
        energy_score = er.energy_score;
        energy_confidence = er.energy_confidence;
      } else {
        const existing = await db.energy_scores.findUnique({
          where: { place_id_version: { place_id: placeId, version: ENERGY_VERSION } },
        });
        if (existing) {
          energy_score = existing.energy_score;
          energy_confidence = existing.energy_confidence;
        }
      }

      const tagInputs: TagScoreInputs = {
        energy_score,
        energy_confidence,
        coverageAboutText: buildCoverageAboutText(gr),
        ...parseAttrs(gr.google_places_attributes),
        barForward: isBarForward(gr),
      };
      const tagResult = computeTagScores(tagInputs);

      if (!dryRun) {
        await db.place_tag_scores.upsert({
          where: {
            place_id_version: { place_id: placeId, version: TAG_VERSION },
          },
          create: {
            id: randomUUID(),
            place_id: placeId,
            cozy_score: tagResult.cozy_score,
            date_night_score: tagResult.date_night_score,
            late_night_score: tagResult.late_night_score,
            after_work_score: tagResult.after_work_score,
            scene_score: tagResult.scene_score,
            confidence: tagResult.confidence,
            version: tagResult.version,
            depends_on_energy_version: tagResult.depends_on_energy_version,
            computed_at: now,
          },
          update: {
            cozy_score: tagResult.cozy_score,
            date_night_score: tagResult.date_night_score,
            late_night_score: tagResult.late_night_score,
            after_work_score: tagResult.after_work_score,
            scene_score: tagResult.scene_score,
            confidence: tagResult.confidence,
            depends_on_energy_version: tagResult.depends_on_energy_version,
            computed_at: now,
          },
        });
      }
      tagCount++;
    }
    console.log(`Tag scores: ${tagCount} computed ${dryRun ? '(dry-run)' : '(saved)'}`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
