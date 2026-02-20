/**
 * Generate LA-scoped gold CSV from a source gold CSV.
 * Filters rows by place_slug that exists in v_places_la_bbox_golden.
 *
 * Usage:
 *   npm run gold:la:neon -- --gold=data/gold_sets/vibe_tags_v1.csv --out=data/gold_sets/vibe_tags_v1__la.csv
 *   npm run gold:la:neon -- --gold=data/gold_sets/vibe_tags_v1.csv [--verbose]
 *
 * Requires: SAIKO_DB_FROM_WRAPPER=1 (use db-neon.sh or db-local.sh).
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse, unparse } from 'papaparse';
import { db } from '@/lib/db';
import { getLaSlugs } from '@/lib/la-scope';

async function main() {
  if (process.env.SAIKO_DB_FROM_WRAPPER !== '1') {
    console.error('Refusing to run: SAIKO_DB_FROM_WRAPPER must be 1. Use db-neon.sh or db-local.sh.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const goldArg = args.find((a) => a.startsWith('--gold='));
  const outArg = args.find((a) => a.startsWith('--out='));
  const dbViewArg = args.find((a) => a.startsWith('--db-view='));
  const verbose = args.includes('--verbose');

  if (!goldArg) {
    console.error('Usage: --gold=<path> [--out=<path>] [--db-view=public.v_places_la_bbox_golden] [--verbose]');
    process.exit(1);
  }

  const goldPath = goldArg.split('=')[1];
  const dbView = dbViewArg?.split('=')[1] ?? 'public.v_places_la_bbox_golden';

  const absGold = path.isAbsolute(goldPath) ? goldPath : path.join(process.cwd(), goldPath);
  if (!fs.existsSync(absGold)) {
    console.error(`Gold file not found: ${absGold}`);
    process.exit(1);
  }

  let outPath: string;
  if (outArg) {
    outPath = path.isAbsolute(outArg.split('=')[1]) ? outArg.split('=')[1] : path.join(process.cwd(), outArg.split('=')[1]);
  } else {
    const ext = path.extname(absGold);
    const base = path.basename(absGold, ext);
    const dir = path.dirname(absGold);
    outPath = path.join(dir, `${base}__la${ext}`);
  }

  const laSlugs = await getLaSlugs({ dbView });
  const laSlugSet = new Set(laSlugs.map((s) => s.trim().toLowerCase()));

  console.log(`[SCOPE] laOnly=true ids=${laSlugs.length}`);

  const raw = fs.readFileSync(absGold, 'utf-8');
  const parsed = parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true });

  const slugKey = parsed.meta.fields?.find((f) => f.toLowerCase() === 'place_slug') ?? 'place_slug';
  const rowsIn = parsed.data;
  const rowsOut = rowsIn.filter((row) => {
    const slug = (row[slugKey] ?? '').trim();
    if (!slug) return false;
    return laSlugSet.has(slug.toLowerCase());
  });

  const header = parsed.meta.fields ?? [];
  const outCsv = unparse({ data: rowsOut, fields: header });

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, outCsv, 'utf-8');

  console.log(`gold_in=${rowsIn.length} gold_out=${rowsOut.length} outPath=${outPath}`);

  if (rowsOut.length === 0) {
    console.log('No gold rows in LA scope. Output file is empty (header only).');
  }

  if (verbose && laSlugs.length > 0) {
    console.log('LA slugs:', laSlugs.join(', '));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
