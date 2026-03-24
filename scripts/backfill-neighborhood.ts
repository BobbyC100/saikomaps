/**
 * Backfill neighborhood for entities with lat/lng but no neighborhood.
 * Uses local LA boundary polygon lookup as default, Google reverse geocode as fallback.
 *
 * Usage:
 *   npm run backfill:neighborhood                    # entities with coords but no neighborhood
 *   npm run backfill:neighborhood -- --limit 10      # first 10 only
 *   npm run backfill:neighborhood -- --slug seco     # single entity by slug
 *   npm run backfill:neighborhood -- --dry-run       # preview without updating
 *   npm run backfill:neighborhood -- --force         # re-derive even if neighborhood exists
 *
 * Requires: DATABASE_URL (GOOGLE_PLACES_API_KEY for fallback only)
 */

// Env is preloaded by: node -r ./scripts/load-env.js
import { PrismaClient } from '@prisma/client';
import { deriveNeighborhood } from '@/lib/geo/derive-neighborhood';

const prisma = new PrismaClient();
const GOOGLE_RATE_LIMIT_MS = 150;

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let slug: string | null = null;
  let dryRun = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') limit = parseInt(args[++i] || '0', 10) || Infinity;
    else if (args[i] === '--slug') slug = args[++i] || null;
    else if (args[i]?.startsWith('--slug=')) slug = args[i].split('=')[1];
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--force') force = true;
  }

  return { limit, slug, dryRun, force };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { limit, slug, dryRun, force } = parseArgs();

  let where: Record<string, unknown>;
  if (slug) {
    where = { slug };
  } else if (force) {
    where = { latitude: { not: null }, longitude: { not: null } };
  } else {
    where = {
      latitude: { not: null },
      longitude: { not: null },
      OR: [
        { neighborhood: null },
        { neighborhood: '' },
      ],
    };
  }

  const entities = await prisma.entities.findMany({
    where,
    select: { id: true, slug: true, name: true, latitude: true, longitude: true, neighborhood: true },
    orderBy: { createdAt: 'asc' },
    ...(Number.isFinite(limit) && limit > 0 && { take: limit }),
  });

  console.log(`\nNeighborhood Derivation — ${entities.length} entity(ies) to process`);
  if (dryRun) console.log('(dry run — no updates)\n');
  else console.log('');

  let derived = 0;
  let fromBoundary = 0;
  let fromGoogle = 0;
  let failed = 0;
  let skipped = 0;

  for (const entity of entities) {
    const label = `${entity.slug} (${entity.name})`;
    const lat = Number(entity.latitude);
    const lng = Number(entity.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      skipped++;
      console.log(`  SKIP ${label}: invalid coords`);
      continue;
    }

    try {
      const result = await deriveNeighborhood(lat, lng);

      if (!result) {
        failed++;
        console.log(`  MISS ${label}: no neighborhood found from boundary or Google`);
        continue;
      }

      if (!dryRun) {
        await prisma.entities.update({
          where: { id: entity.id },
          data: { neighborhood: result.neighborhood },
        });
        // Also update canonical_entity_state if it exists (updateMany returns 0 if no row)
        await prisma.canonical_entity_state.updateMany({
          where: { entityId: entity.id },
          data: { neighborhood: result.neighborhood },
        });
      }

      derived++;
      if (result.source === 'boundary_lookup') fromBoundary++;
      else fromGoogle++;

      console.log(
        `  OK   ${label}: "${result.neighborhood}" [${result.source}]${dryRun ? ' (dry run)' : ''}`,
      );

      // Rate limit only when Google was called (boundary lookups are instant)
      if (result.source === 'google_geocode') {
        await sleep(GOOGLE_RATE_LIMIT_MS);
      }
    } catch (err) {
      failed++;
      console.error(`  ERR  ${label}: ${err instanceof Error ? err.message : String(err)}`);
      await sleep(GOOGLE_RATE_LIMIT_MS);
    }
  }

  console.log('\n--- Neighborhood Backfill Complete ---');
  console.log(`Derived: ${derived} (boundary: ${fromBoundary}, google: ${fromGoogle})`);
  if (skipped > 0) console.log(`Skipped: ${skipped}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
  if (dryRun) console.log('(No changes were made — run without --dry-run to apply)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
