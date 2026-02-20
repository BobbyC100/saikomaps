/**
 * One-off probe: fetch ONE place and dump the raw Google response.
 * No transformation, no merge, no DB write.
 * Use: npx tsx scripts/probe-google-places-raw-response.ts [placeId]
 *
 * If no placeId, picks the first linked place from the DB.
 */

import 'dotenv/config';
import { db } from '@/lib/db';
import { VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING } from '@/lib/google-places';

const PLACES_API_NEW_BASE = 'https://places.googleapis.com/v1';

async function main() {
  const placeId = process.argv[2];
  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  let id = placeId;
  if (!id) {
    const row = await db.$queryRaw<{ google_place_id: string }[]>`
      SELECT g.google_place_id
      FROM golden_records g
      INNER JOIN places p ON p.google_place_id = g.google_place_id
      WHERE g.google_place_id IS NOT NULL
      LIMIT 1
    `;
    id = row?.[0]?.google_place_id ?? null;
  }

  if (!id) {
    console.error('No placeId provided and none found in DB.');
    process.exit(1);
  }
  if (!apiKey) {
    console.error(
      'No API key. Set GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local'
    );
    process.exit(1);
  }

  const url = `${PLACES_API_NEW_BASE}/places/${id}`;
  console.log('--- Request ---');
  console.log('Endpoint: Places API (New)');
  console.log('place_id:', id);
  console.log('X-Goog-FieldMask:', VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING);
  console.log('');

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING,
    },
  });
  const data = await response.json();

  console.log('--- Raw JSON Response ---');
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  if (response.ok && data && typeof data === 'object') {
    console.log('--- Keys in response ---');
    console.log(Object.keys(data).sort().join(', '));
    console.log('');

    console.log('--- Per-field check (requested vs present) ---');
    const requested = VALADATA_GOOGLE_PLACES_FIELDS_V1_STRING.split(',');
    for (const k of requested) {
      const v = data[k];
      const present = k in data;
      const val = v === undefined ? 'undefined' : v === null ? 'null' : typeof v;
      console.log(`  ${k}: ${present ? 'present' : 'MISSING'} (${val})`);
    }
    const extra = Object.keys(data).filter((k) => !requested.includes(k));
    if (extra.length > 0) {
      console.log('');
      console.log('--- Unexpected keys (not in our mask) ---');
      console.log(extra.join(', '));
    }
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
