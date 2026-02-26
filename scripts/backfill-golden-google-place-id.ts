/**
 * Backfill golden_records.google_place_id for rows missing it.
 *
 * Strategy:
 * 1. Copy from matching places row (places.id = canonical_id or slug match) if it has google_place_id
 * 2. For remaining: Google Places Text Search (name + address), LA bias
 * 3. If exactly 1 result: write google_place_id
 * 4. If 0 or >1: skip + log to CSV for manual cleanup (do NOT guess)
 *
 * Usage:
 *   npm run backfill:golden-google-place-id:neon [-- --limit 50] [--apply]
 *
 * Requires: GOOGLE_PLACES_API_KEY, GOOGLE_PLACES_ENABLED=true (for API step)
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '@/lib/db';
import { searchPlace } from '@/lib/google-places';

const RATE_LIMIT_MS = 200;
const DEFAULT_LIMIT = 50;
const LA_BIAS = { latitude: 34.05, longitude: -118.25 };
const CSV_PATH = path.join(process.cwd(), 'data/logs/backfill-golden-google-place-id_skipped.csv');

function parseArgs(): { limit: number; apply: boolean } {
  const argv = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  const limitArg = argv.find((a) => a.startsWith('--limit'));
  if (limitArg) {
    const val = limitArg.includes('=') ? limitArg.split('=')[1] : argv[argv.indexOf(limitArg) + 1];
    limit = parseInt(val ?? '', 10) || DEFAULT_LIMIT;
  }
  return { limit, apply: argv.includes('--apply') };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildSearchQuery(g: {
  name: string;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  neighborhood: string | null;
}): string {
  const parts: string[] = [g.name.trim()];
  if (g.address_street?.trim()) parts.push(g.address_street.trim());
  else if (g.neighborhood?.trim()) parts.push(g.neighborhood.trim());
  if (g.address_city?.trim()) parts.push(g.address_city.trim());
  if (g.address_state?.trim()) parts.push(g.address_state.trim());
  return parts.filter(Boolean).join(', ');
}

interface SkippedRow {
  canonical_id: string;
  slug: string;
  name: string;
  reason: string;
  search_query?: string;
  result_count?: number;
}

async function main() {
  const { limit, apply } = parseArgs();

  console.log('Backfill golden_records.google_place_id\n');
  if (!apply) console.log('DRY RUN (no writes). Use --apply to persist.\n');

  const missing = await db.$queryRaw<
    {
      canonical_id: string;
      slug: string;
      name: string;
      address_street: string | null;
      address_city: string | null;
      address_state: string | null;
      neighborhood: string | null;
      p_google_place_id: string | null;
    }[]
  >`
    SELECT g.canonical_id, g.slug, g.name, g.address_street, g.address_city, g.address_state, g.neighborhood,
           COALESCE(
             (SELECT p.google_place_id FROM places p WHERE p.id = g.canonical_id AND p.google_place_id IS NOT NULL AND btrim(p.google_place_id) != '' LIMIT 1),
             (SELECT p.google_place_id FROM places p WHERE p.slug = g.slug AND p.google_place_id IS NOT NULL AND btrim(p.google_place_id) != '' LIMIT 1)
           ) AS p_google_place_id
    FROM golden_records g
    WHERE g.google_place_id IS NULL OR btrim(COALESCE(g.google_place_id, '')) = ''
    ORDER BY g.canonical_id
    LIMIT ${limit}
  `;

  console.log(`Eligible: ${missing.length} rows (limit ${limit})\n`);

  let updatedFromPlaces = 0;
  let updatedFromApi = 0;
  let skipped = 0;
  let ambiguous = 0;
  const skippedRows: SkippedRow[] = [];

  for (const g of missing) {
    if (g.p_google_place_id?.trim()) {
      if (apply) {
        await db.golden_records.update({
          where: { canonical_id: g.canonical_id },
          data: { google_place_id: g.p_google_place_id.trim() },
        });
      }
      updatedFromPlaces++;
      if (updatedFromPlaces <= 5) {
        console.log(`  ✓ ${g.slug}: copied from places (${g.p_google_place_id})`);
      }
      continue;
    }

    const hasApiKey = !!process.env.GOOGLE_PLACES_API_KEY;
    const apiEnabled = process.env.GOOGLE_PLACES_ENABLED === 'true';
    if (!hasApiKey || !apiEnabled) {
      skipped++;
      skippedRows.push({
        canonical_id: g.canonical_id,
        slug: g.slug,
        name: g.name,
        reason: 'no_api_no_places_match',
      });
      continue;
    }

    const searchQuery = buildSearchQuery(g);
    if (!searchQuery || searchQuery.length < 3) {
      skipped++;
      skippedRows.push({
        canonical_id: g.canonical_id,
        slug: g.slug,
        name: g.name,
        reason: 'insufficient_search_query',
        search_query: searchQuery,
      });
      continue;
    }

    try {
      const results = await searchPlace(searchQuery, {
        locationBias: LA_BIAS,
        maxResults: 5,
      });
      await sleep(RATE_LIMIT_MS);

      if (results.length === 1) {
        const placeId = results[0].placeId;
        if (apply) {
          await db.golden_records.update({
            where: { canonical_id: g.canonical_id },
            data: { google_place_id: placeId },
          });
        }
        updatedFromApi++;
        if (updatedFromApi <= 5) {
          console.log(`  ✓ ${g.slug}: API match (${placeId})`);
        }
      } else if (results.length === 0) {
        skipped++;
        skippedRows.push({
          canonical_id: g.canonical_id,
          slug: g.slug,
          name: g.name,
          reason: 'no_match',
          search_query: searchQuery,
          result_count: 0,
        });
      } else {
        ambiguous++;
        skippedRows.push({
          canonical_id: g.canonical_id,
          slug: g.slug,
          name: g.name,
          reason: 'ambiguous',
          search_query: searchQuery,
          result_count: results.length,
        });
        if (ambiguous <= 5) {
          console.warn(`  ✗ ${g.slug}: ambiguous (${results.length} results)`);
        }
      }
    } catch (e) {
      skipped++;
      const msg = e instanceof Error ? e.message : String(e);
      skippedRows.push({
        canonical_id: g.canonical_id,
        slug: g.slug,
        name: g.name,
        reason: `error: ${msg.slice(0, 80)}`,
        search_query: searchQuery,
      });
      if (skipped <= 5) {
        console.warn(`  ✗ ${g.slug}: ${msg}`);
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Updated (from places): ${updatedFromPlaces}`);
  console.log(`Updated (from API): ${updatedFromApi}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Ambiguous: ${ambiguous}`);

  if (skippedRows.length > 0) {
    fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
    const header = 'canonical_id,slug,name,reason,search_query,result_count\n';
    const rows = skippedRows.map(
      (r) =>
        `"${r.canonical_id}","${r.slug}","${(r.name ?? '').replace(/"/g, '""')}","${r.reason}","${(r.search_query ?? '').replace(/"/g, '""')}","${r.result_count ?? ''}"`
    );
    fs.writeFileSync(CSV_PATH, header + rows.join('\n'));
    console.log(`\nSkipped/ambiguous CSV: ${CSV_PATH}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
