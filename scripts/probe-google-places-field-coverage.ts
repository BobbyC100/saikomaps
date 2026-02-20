/**
 * Probe: fetch 10–20 places and produce field coverage table.
 * present % | null % | missing %
 *
 * Use: npx tsx scripts/probe-google-places-field-coverage.ts [limit]
 * Requires: GOOGLE_PLACES_API_KEY
 */

import 'dotenv/config';
import { db } from '@/lib/db';
import { VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING } from '@/lib/google-places';

const PLACES_API_NEW_BASE = 'https://places.googleapis.com/v1';
const RATE_LIMIT_MS = 200;
const REQUESTED = VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING.split(',');

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const limit = parseInt(process.argv[2] || '20', 10) || 20;
  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error(
      'No API key. Set GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local'
    );
    process.exit(1);
  }

  // Representative sample: up to 5 per category, then fill to limit
  const rows = await db.$queryRaw<
    { google_place_id: string; category: string | null; name: string }[]
  >`
    SELECT g.google_place_id, g.category, g.name
    FROM golden_records g
    INNER JOIN places p ON p.google_place_id = g.google_place_id
    WHERE g.google_place_id IS NOT NULL
    ORDER BY g.category NULLS LAST, g.canonical_id
    LIMIT 500
  `;

  const byCategory = new Map<string, typeof rows>();
  for (const r of rows) {
    const c = r.category || 'unknown';
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c)!.push(r);
  }

  const sampled: typeof rows = [];
  const perCategory = 5;
  for (const [, arr] of byCategory) {
    sampled.push(...arr.slice(0, perCategory));
  }
  const placeIds = sampled.slice(0, limit).map((r) => r.google_place_id);

  if (placeIds.length === 0) {
    console.error('No linked places found.');
    process.exit(1);
  }

  console.log(`Probing ${placeIds.length} places (mix of categories)...`);
  console.log('');

  const counts: Record<string, { present: number; null: number; missing: number }> = {};
  for (const f of REQUESTED) {
    counts[f] = { present: 0, null: 0, missing: 0 };
  }

  let ok = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < placeIds.length; i++) {
    const placeId = placeIds[i];
    const url = `${PLACES_API_NEW_BASE}/places/${placeId}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING,
        },
      });
      const data = await res.json();
      if (res.status === 404) {
        notFound++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }
      if (!res.ok) {
        errors++;
        const errMsg = data.error?.message || data.status || String(res.status);
        console.error(`  [${i + 1}/${placeIds.length}] ${placeId}: ${errMsg}`);
        if (errors === 1) {
          console.log('');
          console.log('--- Raw Google response (first error) ---');
          console.log(JSON.stringify(data, null, 2));
          console.log('---');
          console.log('');
        }
        await sleep(RATE_LIMIT_MS);
        continue;
      }
      ok++;
      const result = data;
      for (const f of REQUESTED) {
        if (!(f in result)) {
          counts[f].missing++;
        } else if (result[f] === null) {
          counts[f].null++;
        } else {
          counts[f].present++;
        }
      }
    } catch (e) {
      errors++;
      console.error(`  [${i + 1}/${placeIds.length}] ${placeId}:`, e);
    }
    await sleep(RATE_LIMIT_MS);
  }

  const n = ok;
  console.log(`Fetched: ${ok} OK, ${notFound} NOT_FOUND, ${errors} errors`);
  console.log('');
  console.log('--- Field coverage ---');
  console.log('');
  console.log('| field                  | present % | null %  | missing % |');
  console.log('|------------------------|-----------|---------|-----------|');

  for (const f of REQUESTED) {
    const c = counts[f];
    const pct = (v: number) => ((v / n) * 100).toFixed(1);
    const presentPct = n ? pct(c.present) : '0';
    const nullPct = n ? pct(c.null) : '0';
    const missingPct = n ? pct(c.missing) : '0';
    const pad = (s: string, w: number) => s.padStart(w);
    console.log(`| ${f.padEnd(22)} | ${pad(presentPct, 7)}%  | ${pad(nullPct, 5)}%  | ${pad(missingPct, 7)}%  |`);
  }

  console.log('');
  console.log('(present = has value; null = key exists, value null; missing = key not in response)');
  console.log('');

  if (ok > 0) {
    console.log('--- Sample raw result (first place) ---');
    const firstId = placeIds[0];
    const url = `${PLACES_API_NEW_BASE}/places/${firstId}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING,
      },
    });
    const data = await res.json();
    if (res.ok && data) {
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (k === 'id') safe[k] = (v as string).toString().slice(0, 12) + '...';
        else safe[k] = v;
      }
      console.log(JSON.stringify(safe, null, 2));
    }
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
