/**
 * Compute Energy scores — CTO Spec §6.1
 *
 * Usage:
 *   npx tsx scripts/compute-energy.ts --place <place_id>
 *   npx tsx scripts/compute-energy.ts --all
 *   npx tsx scripts/compute-energy.ts --all --la-only [--limit N]
 *   npx tsx scripts/compute-energy.ts --all --version energy_v1
 *
 * Requirements: Idempotent, continues on per-place failure, writes to energy_scores only.
 * --la-only: Use v_places_la_bbox_golden (requires SAIKO_DB_FROM_WRAPPER=1).
 */

import { db } from '@/lib/db';
import { getPlaceIds as getPlaceIdsFromLA } from '@/lib/la-scope';
import { computeEnergy } from '@/lib/energy-tag-engine';
import type { EnergyInputs } from '@/lib/energy-tag-engine';
import { parseAttrs, isBarForward, buildCoverageAboutText } from '@/lib/energy-tag-engine/shared';
import { randomUUID } from 'crypto';

const DEFAULT_VERSION = 'energy_v1';

type GoldenRow = { canonical_id: string; slug: string; description: string | null; about_copy: string | null; google_places_attributes: unknown; category: string | null };

/**
 * Fetch energy-relevant fields for a set of entity IDs.
 * Reads from canonical_entity_state (Fields v2) with entities join for slug.
 * Falls back gracefully when CES row is missing.
 */
async function fetchPlaceIdToGolden(placeIds: string[]): Promise<Map<string, GoldenRow>> {
  const placeIdToGolden = new Map<string, GoldenRow>();
  if (placeIds.length === 0) return placeIdToGolden;

  const rows: { entityId: string; slug: string; description: string | null; google_places_attributes: unknown; category: string | null }[] =
    await db.$queryRaw`
      SELECT ces.entityId, e.slug, ces.description, ces.google_places_attributes, ces.category
      FROM canonical_entity_state ces
      JOIN entities e ON e.id = ces.entityId
      WHERE ces.entityId = ANY(${placeIds})
    `;

  for (const r of rows) {
    placeIdToGolden.set(r.entityId, {
      canonical_id: r.entityId,
      slug: r.slug,
      description: r.description,
      about_copy: null, // not tracked in CES; buildCoverageAboutText handles nulls
      google_places_attributes: r.google_places_attributes,
      category: r.category,
    });
  }
  return placeIdToGolden;
}

async function getPlaceIds(placeIdArg: string | null, laOnly: boolean, limitArg: number | null): Promise<{ placeIds: string[]; placeIdToGolden: Map<string, GoldenRow> }> {
  const placeIdToGolden = new Map<string, GoldenRow>();

  if (laOnly) {
    if (process.env.SAIKO_DB_FROM_WRAPPER !== '1') {
      throw new Error('--la-only requires SAIKO_DB_FROM_WRAPPER=1. Use db-neon.sh or db-local.sh.');
    }
    const ids = await getPlaceIdsFromLA({ laOnly: true, limit: limitArg });
    if (!ids || ids.length === 0) return { placeIds: [], placeIdToGolden };
    const golden = await fetchPlaceIdToGolden(ids);
    return { placeIds: ids, placeIdToGolden: golden };
  }

  if (placeIdArg) {
    const place = await db.entities.findUnique({
      where: { id: placeIdArg },
      select: { id: true },
    });
    if (!place) {
      console.error('Place not found:', placeIdArg);
      process.exit(1);
    }
    const golden = await fetchPlaceIdToGolden([place.id]);
    if (!golden.has(place.id)) {
      console.error('No canonical_entity_state row for place:', placeIdArg);
      process.exit(1);
    }
    return { placeIds: [place.id], placeIdToGolden: golden };
  }

  // --all: find all entities that have a canonical_entity_state row
  const cesIds: { entityId: string }[] = await db.$queryRaw`
    SELECT entity_id FROM canonical_entity_state
  `;
  const allIds = cesIds.map(r => r.entityId);
  const golden = await fetchPlaceIdToGolden(allIds);
  return { placeIds: allIds, placeIdToGolden: golden };
}

async function main() {
  const args = process.argv.slice(2);
  const placeArg = args.find((a) => a.startsWith('--place='))?.split('=')[1] ?? (args[0] === '--place' ? args[1] : null);
  const all = args.includes('--all');
  const laOnly = args.includes('--la-only');
  const limitIdx = args.indexOf('--limit');
  const limitArg = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;
  const versionArg = args.find((a) => a.startsWith('--version='))?.split('=')[1];
  const version = versionArg ?? DEFAULT_VERSION;

  if (!placeArg && !all && !laOnly) {
    console.error('Usage: npx tsx scripts/compute-energy.ts --place <id> | --all | --la-only [--version <energy_version>] [--limit N]');
    process.exit(1);
  }

  const ev = await db.energy_versions.findUnique({ where: { version } });
  if (!ev) {
    console.error(`Energy version not found: ${version}`);
    process.exit(1);
  }

  const { placeIds, placeIdToGolden } = await getPlaceIds(placeArg, laOnly, limitArg);
  console.log(`[SCOPE] laOnly=${laOnly} ids=${placeIds.length} limit=${limitArg ?? 'none'}`);
  console.log(`Compute energy (version=${version}): ${placeIds.length} place(s)`);

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
      const attrs = parseAttrs(gr.google_places_attributes);
      const inputs: EnergyInputs = {
        popularityComponent: null,
        coverageAboutText: buildCoverageAboutText(gr),
        liveMusic: attrs.liveMusic,
        goodForGroups: attrs.goodForGroups,
        barForward: isBarForward(gr),
      };
      const result = computeEnergy(inputs);

      await db.energy_scores.upsert({
        where: { entityId_version: { entityId: placeId, version } },
        create: {
          id: randomUUID(),
          entityId: placeId,
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
          version,
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
