/**
 * Backfill places.website from Google Places Details.
 * Any place with google_place_id but missing website (null/blank). Does not overwrite non-empty websites.
 *
 * Usage:
 *   npx tsx scripts/backfill-websites-from-google.ts [--dry-run] [--la-only] [--limit N]
 *   npx tsx scripts/backfill-websites-from-google.ts --dry-run --la-only --limit 20
 *
 * Requires: GOOGLE_PLACES_API_KEY (.env.local)
 */

import { db } from "@/lib/db";
import { getPlaceIds } from "@/lib/la-scope";

function parseArgs(): { limit: number; dryRun: boolean; laOnly: boolean } {
  const argv = process.argv.slice(2);
  let limit = Infinity;
  const eq = argv.find((a) => a.startsWith("--limit="));
  if (eq) {
    const n = parseInt(eq.split("=")[1] ?? "0", 10);
    if (n > 0) limit = n;
  } else {
    const idx = argv.indexOf("--limit");
    if (idx >= 0 && argv[idx + 1]) {
      const n = parseInt(argv[idx + 1], 10);
      if (n > 0) limit = n;
    }
  }
  const dryRun = argv.includes("--dry-run");
  const laOnly = argv.includes("--la-only");
  return { limit, dryRun, laOnly };
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
    console.error("❌ GOOGLE_PLACES_API_KEY is not set. Add it to .env.local");
    process.exit(1);
  }

  const { limit, dryRun, laOnly } = parseArgs();

  const baseWhere = {
    googlePlaceId: { not: null } as const,
    NOT: { googlePlaceId: "" },
    OR: [{ website: null }, { website: "" }],
  };

  let entityIds: string[] | null = null;
  if (laOnly) {
    entityIds = await getPlaceIds({
      laOnly: true,
      limit: Number.isFinite(limit) ? limit : null,
    });
    if (!entityIds?.length) {
      console.error("--la-only: no entities in LA scope");
      process.exit(1);
    }
  }

  const where = {
    ...baseWhere,
    ...(entityIds?.length ? { id: { in: entityIds } } : {}),
  };

  const takeOption =
    !laOnly && limit > 0 && Number.isFinite(limit) ? { take: limit } : {};

  const placesNeedingWebsite = await db.entities.findMany({
    where,
    select: { id: true, name: true, googlePlaceId: true, website: true },
    ...takeOption,
  });

  console.log(
    `Found ${placesNeedingWebsite.length} places needing website (dryRun=${dryRun} laOnly=${laOnly})\n`
  );

  let updated = 0;
  for (const place of placesNeedingWebsite) {
    const gpid = place.googlePlaceId!;
    const website = await fetchWebsite(gpid);
    if (!website) {
      console.log(`❌ ${place.name} → no website`);
      continue;
    }
    if (dryRun) {
      console.log(`[DRY-RUN] ${place.name} → ${website}`);
      updated++;
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
