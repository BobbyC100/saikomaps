/**
 * One-off probe: fetch ONE place and dump the raw Google response.
 * No transformation, no merge, no DB write.
 * Use: npx tsx scripts/probe-google-places-raw-response.ts [placeId]
 *
 * If no placeId, picks the first linked place from the DB.
 *
 * Field mask: displayName, formattedAddress, regularOpeningHours, currentOpeningHours,
 * utcOffsetMinutes (for sanity + hours debugging).
 */

import 'dotenv/config';
import { db } from '@/lib/db';

const PLACES_API_NEW_BASE = 'https://places.googleapis.com/v1';

/** Hours-focused field mask for Places API (New) */
const HOURS_FIELD_MASK =
  'id,displayName,formattedAddress,regularOpeningHours,currentOpeningHours,utcOffsetMinutes';

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
  console.log('X-Goog-FieldMask:', HOURS_FIELD_MASK);
  console.log('');

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': HOURS_FIELD_MASK,
    },
  });
  const data = await response.json();

  console.log('--- Raw JSON Response ---');
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  if (response.ok && data && typeof data === 'object' && !data.error) {
    console.log('--- Keys in response ---');
    console.log(Object.keys(data).sort().join(', '));
    console.log('');

    console.log('--- Sanity fields ---');
    console.log('displayName:', JSON.stringify(data.displayName));
    console.log('formattedAddress:', data.formattedAddress ?? '(missing)');
    console.log('');

    console.log('--- Hours fields ---');
    console.log('utcOffsetMinutes:', data.utcOffsetMinutes ?? '(missing)');
    console.log('regularOpeningHours:', data.regularOpeningHours ? JSON.stringify(data.regularOpeningHours, null, 2) : '(missing)');
    console.log('currentOpeningHours:', data.currentOpeningHours ? JSON.stringify(data.currentOpeningHours, null, 2) : '(missing)');
  } else if (data?.error) {
    console.error('API error:', data.error);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
