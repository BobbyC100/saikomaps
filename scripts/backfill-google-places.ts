/**
 * Backfill Google Places data for Place records missing photos, hours, contact info,
 * neighborhood, and cuisine_type.
 *
 * Usage:
 *   npm run backfill:google                    # places never cached (placesDataCachedAt null)
 *   npm run backfill:google -- --missing-meta  # places with null neighborhood or cuisineType
 *   npm run backfill:google -- --limit 20      # first 20 only
 *   npm run backfill:google -- --slug seco     # single place by slug
 *   npm run backfill:google -- --dry-run       # preview without updating
 *   npm run backfill:google -- --force         # re-enrich all places
 *
 * Requires: GOOGLE_PLACES_API_KEY, DATABASE_URL
 */

// Env is preloaded by: node -r ./scripts/load-env.js
import { PrismaClient } from "@prisma/client";
import {
  searchPlace,
  getPlaceDetails,
  getNeighborhoodFromPlaceDetails,
  getNeighborhoodFromCoords,
} from "@/lib/google-places";
import { getSaikoCategory, parseCuisineType } from "@/lib/categoryMapping";

const prisma = new PrismaClient();
const RATE_LIMIT_MS = 150;

// LA center for location bias when searching by name only
const LA_CENTER = { latitude: 34.0522, longitude: -118.2437 };

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let slug: string | null = null;
  let dryRun = false;
  let force = false;
  let missingMeta = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") limit = parseInt(args[++i] || "0", 10) || Infinity;
    else if (args[i] === "--slug") slug = args[++i] || null;
    else if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--force") force = true;
    else if (args[i] === "--missing-meta") missingMeta = true;
  }

  return { limit, slug, dryRun, force, missingMeta };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Store hours with openNow and/or weekday_text for parseHours compatibility.
 * openNow is timezone-aware (Google uses current time) — use it when available.
 */
function formatHoursForStore(
  openingHours?: { openNow?: boolean; weekdayText?: string[] }
): object | null {
  if (!openingHours) return null;
  const hasOpenNow = typeof openingHours.openNow === 'boolean';
  const hasWeekdayText = openingHours.weekdayText?.length;
  if (!hasOpenNow && !hasWeekdayText) return null;
  return {
    ...(hasOpenNow && { openNow: openingHours.openNow }),
    ...(hasWeekdayText && { weekday_text: openingHours.weekdayText }),
  };
}

async function main() {
  const { limit, slug, dryRun, force, missingMeta } = parseArgs();

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error("❌ GOOGLE_PLACES_API_KEY is not set. Add it to .env or .env.local");
    process.exit(1);
  }

  let where: Record<string, unknown>;
  if (slug) {
    where = { slug };
  } else if (force) {
    where = {};
  } else if (missingMeta) {
    // Places with googlePlaceId that are missing neighborhood or cuisineType
    where = {
      googlePlaceId: { not: null },
      OR: [{ neighborhood: null }, { cuisineType: null }],
    };
  } else {
    where = { placesDataCachedAt: null };
  }

  const places = await prisma.place.findMany({
    where,
    orderBy: { createdAt: "asc" },
    ...(Number.isFinite(limit) && limit > 0 && { take: limit }),
  });

  console.log(`\nBackfill Google Places — ${places.length} place(s) to process`);
  if (dryRun) console.log("(dry run — no updates)\n");
  else console.log("");

  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const label = `${place.slug} (${place.name})`;

    try {
      let placeDetails = null;
      let googlePlaceId: string | null = place.googlePlaceId;

      // Strategy 1: Use existing googlePlaceId
      if (googlePlaceId && !googlePlaceId.startsWith("cid:")) {
        try {
          placeDetails = await getPlaceDetails(googlePlaceId);
        } catch (e) {
          console.log(`  ⚠️  ${label}: getPlaceDetails failed, trying search...`);
          googlePlaceId = null;
        }
      }

      // Strategy 2: Text search by name + address or name + neighborhood + city
      if (!placeDetails && (place.name || place.address)) {
        const searchQuery = place.address
          ? `${place.name}, ${place.address}`
          : `${place.name}${place.neighborhood ? ` ${place.neighborhood}` : ""}, Los Angeles`;
        try {
          const results = await searchPlace(searchQuery, {
            maxResults: 1,
            locationBias: LA_CENTER,
          });
          if (results.length > 0) {
            googlePlaceId = results[0].placeId;
            placeDetails = await getPlaceDetails(googlePlaceId);
          }
        } catch (e) {
          console.log(`  ⚠️  ${label}: search failed`);
        }
      }

      if (!placeDetails) {
        failed++;
        console.log(`  ❌ ${label}: could not resolve via Google Places`);
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      const lat =
        typeof placeDetails.location.lat === "number"
          ? placeDetails.location.lat
          : parseFloat(String(placeDetails.location.lat));
      const lng =
        typeof placeDetails.location.lng === "number"
          ? placeDetails.location.lng
          : parseFloat(String(placeDetails.location.lng));

      const neighborhood =
        getNeighborhoodFromPlaceDetails(placeDetails) ??
        (!Number.isNaN(lat) && !Number.isNaN(lng)
          ? await getNeighborhoodFromCoords(lat, lng)
          : null);

      const cuisineType = parseCuisineType(placeDetails.types ?? []) ?? null;

      const updateData = {
        googlePlaceId: googlePlaceId ?? undefined,
        name: placeDetails.name && !placeDetails.name.startsWith("http")
          ? placeDetails.name
          : place.name,
        address:
          placeDetails.formattedAddress && !placeDetails.formattedAddress.startsWith("http")
            ? placeDetails.formattedAddress
            : place.address,
        latitude: !Number.isNaN(lat) ? lat : null,
        longitude: !Number.isNaN(lng) ? lng : null,
        phone: placeDetails.formattedPhoneNumber ?? place.phone,
        website: placeDetails.website ?? place.website,
        googleTypes: placeDetails.types ?? [],
        priceLevel: placeDetails.priceLevel ?? place.priceLevel,
        neighborhood: neighborhood ?? place.neighborhood,
        cuisineType: cuisineType ?? place.cuisineType,
        category:
          place.category ??
          getSaikoCategory(placeDetails.name, placeDetails.types ?? []),
        googlePhotos: placeDetails.photos
          ? JSON.parse(JSON.stringify(placeDetails.photos))
          : undefined,
        hours: formatHoursForStore(placeDetails.openingHours),
        placesDataCachedAt: new Date(),
      };

      if (!dryRun) {
        await prisma.place.update({
          where: { id: place.id },
          data: updateData,
        });
      }

      enriched++;
      console.log(
        `  ✅ ${label}${dryRun ? " (dry run)" : ""}`
      );

      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      failed++;
      console.error(
        `  ❌ ${label}: ${err instanceof Error ? err.message : String(err)}`
      );
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log("\n--- Backfill Complete ---");
  console.log(`Enriched: ${enriched}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
  if (dryRun) console.log("(No changes were made — run without --dry-run to apply)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
