/**
 * Resolve Places API place_id for the four validation places by name+address.
 * Uses GOOGLE_PLACES_API_KEY from env. Read-only; does not touch scoring or write to DB.
 *
 * Usage: npx tsx scripts/fetch-validation-place-ids.ts
 * Key: set GOOGLE_PLACES_API_KEY in .env or .env.local (script loads both).
 * If key is missing, script prints exact Find Place URLs to hit manually.
 */

import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const QUERIES: Record<string, string> = {
  dunsmoor: 'Dunsmoor Los Angeles 3509 Eagle Rock Blvd',
  buvons: 'Buvons Los Angeles',
  'dan-tanas': "Dan Tana's West Hollywood 9071 Santa Monica Blvd",
  covell: 'Covell Los Angeles 4628 Hollywood Blvd',
};

const FIND_PLACE_BASE = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';

async function findPlaceId(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    input: query,
    inputtype: 'textquery',
    fields: 'place_id',
    key: API_KEY!,
  });
  const res = await fetch(`${FIND_PLACE_BASE}?${params.toString()}`);
  const data = await res.json();
  if (data.status !== 'OK' || !data.candidates?.length) return null;
  return data.candidates[0].place_id ?? null;
}

function manualUrls(): void {
  console.error('No GOOGLE_PLACES_API_KEY found locally.');
  console.error('Set it in .env or .env.local (see scripts/load-env.js), or use the URLs below with your key.\n');
  console.error('Find Place from Text — paste these in a browser (replace YOUR_KEY with your API key):\n');
  for (const [slug, query] of Object.entries(QUERIES)) {
    const encoded = encodeURIComponent(query);
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encoded}&inputtype=textquery&fields=place_id&key=YOUR_KEY`;
    console.error(`${slug}:`);
    console.error(`  ${url}\n`);
  }
  console.error('From the JSON response, copy the place_id (ChIJ...) for each and paste into data/validation-place-ids.json.');
}

async function main() {
  if (!API_KEY?.trim()) {
    manualUrls();
    process.exit(1);
  }

  const out: Record<string, string | null> = {
    dunsmoor: null,
    buvons: null,
    'dan-tanas': null,
    covell: null,
  };

  for (const [slug, query] of Object.entries(QUERIES)) {
    const placeId = await findPlaceId(query);
    out[slug] = placeId;
    if (placeId) {
      console.error(`✓ ${slug}: ${placeId}`);
    } else {
      console.error(`✗ ${slug}: no result for query "${query}"`);
    }
  }

  console.log('\n' + JSON.stringify(out, null, 2));
  console.error('\nPaste the JSON above into data/validation-place-ids.json (replace the nulls), then re-run the linkage sequence.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
