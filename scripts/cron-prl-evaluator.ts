#!/usr/bin/env npx tsx
/**
 * PRL Cron Evaluator — read-only
 * Spec: counts by PRL, counts blocked from PRL-3 by unmet requirement, counts overridden
 *
 * Run via cron. No writes — PRL computed at read time.
 */

import { db } from '../lib/db';
import { computePRL, type PRLRequirement } from '../lib/scenesense';
import { mapPlaceToPlaceForPRL } from '../lib/scenesense';

async function main() {
  const places = await db.places.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      googlePhotos: true,
      hours: true,
      description: true,
      vibeTags: true,
      pullQuote: true,
      category: true,
      tagline: true,
      tips: true,
      editorialSources: true,
      prlOverride: true,
    },
  });

  const mapPlacesByPlace = await db.map_places.groupBy({
    by: ['placeId'],
    where: {
      lists: { status: 'PUBLISHED' },
    },
    _count: { id: true },
  });
  const appearsOnByPlace = new Map(
    mapPlacesByPlace.map((m) => [m.placeId, m._count.id])
  );

  const results: Array<{
    placeId: string;
    slug: string;
    computed_prl: number;
    prl_override: number | null;
    effective_prl: number;
    hasOverride: boolean;
    unmetRequirements: PRLRequirement[];
  }> = [];

  for (const p of places) {
    const placeForPRL = mapPlaceToPlaceForPRL({
      name: p.name,
      address: p.address,
      latitude: p.latitude != null ? Number(p.latitude) : null,
      longitude: p.longitude != null ? Number(p.longitude) : null,
      googlePhotos: p.googlePhotos,
      hours: p.hours,
      description: p.description,
      vibeTags: p.vibeTags ?? [],
      pullQuote: p.pullQuote,
      category: p.category,
      tagline: p.tagline,
      tips: p.tips ?? [],
      editorialSources: p.editorialSources,
      prlOverride: p.prlOverride,
      appearsOnCount: appearsOnByPlace.get(p.id) ?? 0,
    });

    const r = computePRL(placeForPRL, p.prlOverride);
    results.push({
      placeId: p.id,
      slug: p.slug,
      computed_prl: r.computed_prl,
      prl_override: r.prl_override,
      effective_prl: r.prl,
      hasOverride: r.hasOverride,
      unmetRequirements: r.unmetRequirements,
    });
  }

  // Counts by PRL
  const countsByPRL: Record<number, number> = {};
  for (const r of results) {
    countsByPRL[r.effective_prl] = (countsByPRL[r.effective_prl] ?? 0) + 1;
  }

  // Counts blocked from PRL-3 by which unmet requirement (computed_prl < 3, no override)
  const blockedFromPRL3 = results.filter(
    (r) => r.computed_prl < 3 && !r.hasOverride
  );
  const blockedByRequirement: Record<string, number> = {};
  for (const r of blockedFromPRL3) {
    for (const req of r.unmetRequirements) {
      blockedByRequirement[req] =
        (blockedByRequirement[req] ?? 0) + 1;
    }
  }

  // Counts overridden
  const overriddenCount = results.filter((r) => r.hasOverride).length;

  console.log('[PRL Evaluator] Summary');
  console.log('countsByPRL:', JSON.stringify(countsByPRL, null, 2));
  console.log(
    'blockedFromPRL3 (by unmet requirement):',
    JSON.stringify(blockedByRequirement, null, 2)
  );
  console.log('overriddenCount:', overriddenCount);
}

main().catch(console.error).finally(() => process.exit(0));
