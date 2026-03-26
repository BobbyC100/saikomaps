/**
 * Remap "Central LA" neighborhood labels to derived neighborhoods.
 *
 * Scope:
 * - entities.neighborhood = 'Central LA'
 * - excludes status = PERMANENTLY_CLOSED
 * - includes CLOSED (temporary-closed protocol)
 *
 * Strategy:
 * - deriveNeighborhood(lat,lng): boundary lookup first, then Google fallback
 * - update entities.neighborhood and canonical_entity_state.neighborhood
 *
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/remap-central-la-neighborhoods.ts --dry-run
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/remap-central-la-neighborhoods.ts
 */

import { PrismaClient } from '@prisma/client';
import { deriveNeighborhood } from '@/lib/geo/derive-neighborhood';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    fallbackCityZip: args.includes('--fallback-city-zip'),
  };
}

type UpdateCandidate = {
  id: string;
  slug: string;
  name: string;
  from: string | null;
  to: string;
  source: 'boundary_lookup' | 'google_geocode' | 'address_fallback';
};

function inferNeighborhoodFromAddress(address: string | null | undefined): string | null {
  if (!address || !address.trim()) return null;
  const a = address.toLowerCase();

  // Conservative fallback: only assign West Hollywood from explicit city or known WeHo ZIPs.
  if (a.includes('west hollywood, ca')) return 'west hollywood';
  const zipMatch = a.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch?.[1] ?? null;
  if (zip === '90069' || zip === '90046') return 'west hollywood';

  return null;
}

async function main() {
  const { dryRun, fallbackCityZip } = parseArgs();

  const rows = await prisma.entities.findMany({
    where: {
      neighborhood: 'Central LA',
      status: { not: 'PERMANENTLY_CLOSED' },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      neighborhood: true,
      latitude: true,
      longitude: true,
      address: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\nCentral LA remap scope: ${rows.length} entities`);
  if (dryRun) console.log('(dry run — no updates)\n');
  else console.log('');

  const candidates: UpdateCandidate[] = [];
  const unchanged: string[] = [];
  const failed: string[] = [];
  const sourceCounts = new Map<string, number>();
  const targetCounts = new Map<string, number>();

  for (const row of rows) {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      failed.push(`${row.slug} (${row.name}) [invalid coords]`);
      continue;
    }

    const result = await deriveNeighborhood(lat, lng);
    let nextNeighborhood: string | null = result?.neighborhood ?? null;
    let source: UpdateCandidate['source'] | null = result?.source ?? null;

    if (!nextNeighborhood && fallbackCityZip) {
      const inferred = inferNeighborhoodFromAddress(row.address);
      if (inferred) {
        nextNeighborhood = inferred;
        source = 'address_fallback';
      }
    }

    if (!nextNeighborhood || !source) {
      failed.push(`${row.slug} (${row.name}) [no derived neighborhood]`);
      continue;
    }

    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    targetCounts.set(nextNeighborhood, (targetCounts.get(nextNeighborhood) || 0) + 1);

    const current = (row.neighborhood || '').trim().toLowerCase();
    const next = nextNeighborhood.trim().toLowerCase();

    if (current === next) {
      unchanged.push(`${row.slug} (${row.name})`);
      continue;
    }

    candidates.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      from: row.neighborhood,
      to: nextNeighborhood,
      source,
    });
  }

  console.log('Summary');
  console.log(`- Scoped rows: ${rows.length}`);
  console.log(`- To update: ${candidates.length}`);
  console.log(`- Unchanged: ${unchanged.length}`);
  console.log(`- Failed: ${failed.length}`);
  console.log(
    `- Derivation sources: ${[...sourceCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`,
  );

  console.log('\nDerived neighborhood distribution (scope):');
  [...targetCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([k, v]) => console.log(`- ${k}: ${v}`));

  if (failed.length) {
    console.log('\nFailed (first 20):');
    failed.slice(0, 20).forEach((line) => console.log(`- ${line}`));
  }

  console.log('\nPlanned updates (first 30):');
  candidates.slice(0, 30).forEach((c) => {
    console.log(`- ${c.name}: "${c.from}" -> "${c.to}" [${c.source}]`);
  });

  if (!dryRun) {
    for (const c of candidates) {
      await prisma.entities.update({
        where: { id: c.id },
        data: { neighborhood: c.to },
      });
      await prisma.canonical_entity_state.updateMany({
        where: { entityId: c.id },
        data: { neighborhood: c.to },
      });
    }
    console.log(`\nApplied updates: ${candidates.length}`);
  } else {
    console.log('\nNo changes applied (dry-run).');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

