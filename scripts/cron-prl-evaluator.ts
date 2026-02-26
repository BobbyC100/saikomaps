#!/usr/bin/env npx tsx
/**
 * PRL Cron Evaluator — read-only
 * Uses fetchPlaceForPRLBatch (PRL Materializer) for single source of truth.
 * No writes.
 */

import { computePRL, type PRLRequirement } from '../lib/scenesense';
import { fetchPlaceForPRLBatch } from '../lib/scenesense';

async function main() {
  const places = await fetchPlaceForPRLBatch({ limit: 500 });

  const results = places.map((p) => {
    const r = computePRL(p, p.prlOverride);
    return {
      slug: p.slug,
      computed_prl: r.computed_prl,
      prl_override: r.prl_override,
      effective_prl: r.prl,
      hasOverride: r.hasOverride,
      unmetRequirements: r.unmetRequirements,
    };
  });

  const countsByPRL: Record<number, number> = {};
  for (const r of results) {
    countsByPRL[r.effective_prl] = (countsByPRL[r.effective_prl] ?? 0) + 1;
  }

  const blockedFromPRL3 = results.filter(
    (r) => r.computed_prl < 3 && !r.hasOverride
  );
  const blockedByRequirement: Record<string, number> = {};
  for (const r of blockedFromPRL3) {
    for (const req of r.unmetRequirements) {
      blockedByRequirement[req] = (blockedByRequirement[req] ?? 0) + 1;
    }
  }

  const overriddenCount = results.filter((r) => r.hasOverride).length;

  const SAMPLE_PER_PRL = 5;
  const sampleSlugsByPRL: Record<number, string[]> = {};
  for (const prl of [1, 2, 3, 4] as const) {
    sampleSlugsByPRL[prl] = results
      .filter((r) => r.effective_prl === prl)
      .slice(0, SAMPLE_PER_PRL)
      .map((r) => r.slug);
  }

  const closestToPRL3 = blockedFromPRL3
    .map((r) => ({
      slug: r.slug,
      computed_prl: r.computed_prl,
      unmetCount: r.unmetRequirements.length,
      unmetRequirements: r.unmetRequirements,
    }))
    .sort((a, b) => a.unmetCount - b.unmetCount)
    .slice(0, 10);

  console.log('[PRL Evaluator] Summary');
  console.log('countsByPRL:', JSON.stringify(countsByPRL, null, 2));
  console.log(
    'blockedFromPRL3 (by unmet requirement):',
    JSON.stringify(blockedByRequirement, null, 2)
  );
  console.log('overriddenCount:', overriddenCount);
  console.log('sampleSlugsByPRL:', JSON.stringify(sampleSlugsByPRL, null, 2));
  console.log('closestToPRL3:', JSON.stringify(closestToPRL3, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
