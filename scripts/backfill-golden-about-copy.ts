/**
 * Backfill golden_records.about_copy for tag-score input coverage.
 *
 * When description/about_copy are blank, hasInputCoverage=false => input_coverage_pct=0.
 * Primary: use golden_records.description if present.
 * Fallback: "{Neighborhood or 'LA'} {category label or 'restaurant'} — local favorite."
 *
 * DRY RUN by default. Writes only with --apply.
 * Requires: SAIKO_DB_FROM_WRAPPER=1
 *
 * Usage:
 *   npm run backfill:golden-about-copy:neon:la [-- --apply] [--limit N] [--force] [--verbose]
 *   npm run backfill:golden-about-copy:neon:la -- --ids id1,id2 [--apply]
 */

import { db } from '@/lib/db';

function parseArgs(): {
  apply: boolean;
  force: boolean;
  limit: number | null;
  ids: string[] | null;
  laOnly: boolean;
  verbose: boolean;
} {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const force = argv.includes('--force');
  const verbose = argv.includes('--verbose');
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 && argv[limitIdx + 1] ? parseInt(argv[limitIdx + 1], 10) : null;
  const idsIdx = argv.indexOf('--ids');
  const ids =
    idsIdx >= 0 && argv[idsIdx + 1]
      ? argv[idsIdx + 1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
  const laOnly = argv.includes('--la-only');
  return { apply, force, limit, ids, laOnly, verbose };
}

function categoryToLabel(category: string | null): string {
  if (!category?.trim()) return 'restaurant';
  const c = category.trim().toLowerCase();
  if (/bar|wine|cocktail|pub/.test(c)) return 'bar';
  if (/cafe|coffee/.test(c)) return 'café';
  if (/shop|store/.test(c)) return 'shop';
  if (/bakery/.test(c)) return 'bakery';
  return 'restaurant';
}

/** Generate fallback about_copy when no primary source exists. */
function fallbackAboutCopy(neighborhood: string | null, category: string | null): string {
  const hood = neighborhood?.trim() || 'LA';
  const label = categoryToLabel(category);
  return `${hood} ${label} — local favorite.`;
}

async function main(): Promise<void> {
  if (process.env.SAIKO_DB_FROM_WRAPPER !== '1') {
    console.error('Refusing to run: SAIKO_DB_FROM_WRAPPER must be 1. Use db-neon.sh or db-local.sh.');
    process.exit(1);
  }

  const { apply, force, limit, ids, laOnly, verbose } = parseArgs();

  if (!laOnly && !ids?.length) {
    console.error('Specify --la-only or --ids id1,id2');
    process.exit(1);
  }
  if (laOnly && ids?.length) {
    console.error('Specify only one of: --la-only | --ids');
    process.exit(1);
  }

  console.log('Backfill golden_records.about_copy\n');
  if (!apply) console.log('DRY RUN (no writes). Use --apply to persist.\n');

  type GrRow = {
    canonical_id: string;
    slug: string;
    description: string | null;
    about_copy: string | null;
    neighborhood: string | null;
    category: string | null;
  };

  let rows: GrRow[] = [];

  if (ids?.length) {
    const places = await db.places.findMany({
      where: { id: { in: ids }, googlePlaceId: { not: null } },
      select: { googlePlaceId: true },
    });
    const gids = [...new Set(places.map((p) => p.googlePlaceId).filter((id): id is string => !!id))];
    if (gids.length === 0) {
      console.log('No places with google_place_id found for given ids.');
      process.exit(0);
    }
    const res = await db.golden_records.findMany({
      where: { google_place_id: { in: gids } },
      select: { canonical_id: true, slug: true, description: true, about_copy: true, neighborhood: true, category: true },
    });
    rows = limit ? res.slice(0, limit) : res;
  } else {
    const res = await db.$queryRaw<GrRow[]>`
      SELECT gr.canonical_id, gr.slug, gr.description, gr.about_copy, gr.neighborhood, gr.category
      FROM golden_records gr
      WHERE gr.google_place_id IN (SELECT p.google_place_id FROM public.v_places_la_bbox_golden p)
    `;
    rows = limit ? res.slice(0, limit) : res;
  }

  let wouldUpdate = 0;
  let updated = 0;

  for (const gr of rows) {
    const aboutTrim = (gr.about_copy ?? '').trim();
    if (aboutTrim && !force) {
      if (verbose) console.log(`  [SKIP] ${gr.slug}: about_copy already set`);
      continue;
    }

    let value: string;
    const descTrim = (gr.description ?? '').trim();
    if (descTrim) {
      value = descTrim;
      if (verbose) console.log(`  [PRIMARY] ${gr.slug}: using description (length=${descTrim.length})`);
    } else {
      value = fallbackAboutCopy(gr.neighborhood, gr.category);
      if (verbose) console.log(`  [FALLBACK] ${gr.slug}: "${value}"`);
    }

    wouldUpdate++;
    if (apply) {
      await db.golden_records.update({
        where: { canonical_id: gr.canonical_id },
        data: { about_copy: value },
      });
      updated++;
    }
  }

  console.log(`\nwould_update: ${wouldUpdate}`);
  if (apply) console.log(`updated: ${updated}`);
  console.log('OK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
