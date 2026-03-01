/**
 * Backfill places.website from Google Places Details.
 * Any place with google_place_id but missing website (null/blank). Does not overwrite non-empty websites.
 *
 * Usage:
 *   npm run backfill:websites
 *   npx tsx scripts/backfill-websites-from-google.ts --limit=4
 *
 * Requires: GOOGLE_PLACES_API_KEY (load-env.js loads .env / .env.local)
 */

import { db } from "@/lib/db";

function parseLimit(): number {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return Infinity;
  const n = parseInt(arg.split("=")[1] ?? "0", 10);
  return n > 0 ? n : Infinity;
}

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

async function fetchWebsite(placeId: string): Promise<string | null> {
  const url = `${DETAILS_URL}?place_id=${encodeURIComponent(placeId)}&fields=website&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const json = (await res.json()) as { status: string; result?: { website?: string } };

  if (json.status !== "OK") {
    console.log(`⚠️  ${placeId} → ${json.status}`);
    return null;
  }

  const w = json.result?.website;
  return typeof w === "string" && w.trim() ? w.trim() : null;
}

async function main() {
  if (!GOOGLE_API_KEY) {
    console.error("❌ GOOGLE_PLACES_API_KEY is not set. Add it to .env or .env.local");
    process.exit(1);
  }

  const limit = parseLimit();
  const placesNeedingWebsite = await db.entities.findMany({
    where: {
      googlePlaceId: { not: null },
      NOT: { googlePlaceId: "" },
      OR: [{ website: null }, { website: "" }],
    },
    select: { id: true, name: true, googlePlaceId: true, website: true },
    take: limit,
  });

  console.log(`Found ${placesNeedingWebsite.length} places needing website\n`);

  let updated = 0;
  for (const place of placesNeedingWebsite) {
    const gpid = place.googlePlaceId!;
    const website = await fetchWebsite(gpid);
    if (!website) {
      console.log(`❌ ${place.name} → no website`);
      continue;
    }
    await db.entities.update({
      where: { id: place.id },
      data: {
        website,
        placesDataCachedAt: new Date(),
      },
    });
    updated++;
    console.log(`✅ ${place.name} → ${website}`);
  }

  console.log(`\nDone. Updated ${updated} of ${placesNeedingWebsite.length} places.`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
