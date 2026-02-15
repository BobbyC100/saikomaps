/**
 * Backfill Google Places data for Place records missing photos, hours, contact info,
 * neighborhood, and cuisine_type.
 *
 * Default: processes active LA County places (scope: active, region: la_county)
 * Failed lookups are marked with placesDataCachedAt so we don't retry forever.
 *
 * Usage:
 *   npm run backfill:google                           # places never cached (placesDataCachedAt null)
 *   npm run backfill:google -- --la-county            # DEPRECATED: use --region la_county
 *   npm run backfill:google -- --scope active         # filter by scope
 *   npm run backfill:google -- --region la_county     # filter by region
 *   npm run backfill:google -- --curated              # filter by provenance (old method)
 *   npm run backfill:google -- --missing-meta         # places with null neighborhood or cuisineType
 *   npm run backfill:google -- --limit 20             # first 20 only
 *   npm run backfill:google -- --slug seco            # single place by slug
 *   npm run backfill:google -- --dry-run              # preview without updating
 *   npm run backfill:google -- --force                # re-enrich all places
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

const CURATED_ONLY = process.argv.includes('--curated');
const SCOPE = process.argv.includes('--scope')
  ? process.argv[process.argv.indexOf('--scope') + 1]
  : 'active'; // Default to active
const REGION = process.argv.includes('--region')
  ? process.argv[process.argv.indexOf('--region') + 1]
  : 'la_county'; // Default to LA County
const RATE_LIMIT_MS = 150;

// LA center for location bias when searching by name only
const LA_CENTER = { latitude: 34.0522, longitude: -118.2437 };

// LA County neighborhoods/cities — curated places in these areas only (from tag-la-county, la-county-coverage)
const LA_COUNTY_AREAS = [
  "Central LA", "Downtown", "DTLA", "Arts District", "Little Tokyo", "Chinatown",
  "Historic Core", "Financial District",
  "Santa Monica", "Venice", "Marina del Rey", "Culver City", "Westwood", "Brentwood",
  "Pacific Palisades", "West LA", "Palms", "Mar Vista", "Playa Vista",
  "Hollywood", "West Hollywood", "Los Feliz", "Silver Lake", "Echo Park",
  "Highland Park", "Eagle Rock", "Atwater Village",
  "Manhattan Beach", "Hermosa Beach", "Redondo Beach", "El Segundo", "Hawthorne",
  "Torrance", "Gardena", "Inglewood", "Lawndale",
  "South LA", "Watts", "Compton", "Lynwood", "South Gate", "Huntington Park",
  "Boyle Heights", "East LA", "Lincoln Heights", "El Sereno", "Montebello",
  "Monterey Park", "Alhambra", "San Gabriel", "Rosemead", "Temple City",
  "Pasadena", "South Pasadena", "Arcadia", "Monrovia", "Sierra Madre",
  "San Marino", "Glendale", "La Cañada Flintridge",
  "Sherman Oaks", "Studio City", "North Hollywood", "Burbank", "Van Nuys",
  "Encino", "Tarzana", "Reseda", "Northridge", "Granada Hills", "Porter Ranch",
  "Woodland Hills", "Canoga Park", "Chatsworth", "Pacoima", "San Fernando",
  "Toluca Lake", "Valley Village", "Panorama City", "Tujunga",
  "San Pedro", "Wilmington", "Harbor City", "Long Beach",
  "Downtown Los Angeles", "Westlake", "Koreatown", "East Hollywood", "Fairfax",
  "Melrose", "Central", "Ocean Park", "Wilshire Montana", "Pico", "Sunset Park",
  "Mid-City", "Sawtelle", "Westside Village", "West Los Angeles", "Northeast",
  "Pico-Robertson", "South Los Angeles", "View Park", "Leimert Park", "West Adams",
  "Baldwin Hills", "Jefferson Park", "South Park", "South Central", "Slauson Corridor",
  "Slauson", "Westchester", "Northeast Torrance", "Five Points", "Clarkdale",
  "Valley Village", "Universal City", "Winnetka", "Northeast Los Angeles",
  "Mount Washington", "Glassell Park", "South Arroyo", "Hastings Ranch", "El Monte",
  "Rowland Heights", "Garvey", "San Marino", "Altadena", "Palos Verdes",
  "Pico Rivera", "Malibu", "Calabasas", "Agoura Hills", "Thousand Oaks", "Los Angeles",
  "Beverly Hills",
];

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let slug: string | null = null;
  let dryRun = false;
  let force = false;
  let missingMeta = false;
  let laCounty = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") limit = parseInt(args[++i] || "0", 10) || Infinity;
    else if (args[i] === "--slug") slug = args[++i] || null;
    else if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--force") force = true;
    else if (args[i] === "--missing-meta") missingMeta = true;
    else if (args[i] === "--la-county") laCounty = true;
  }

  return { limit, slug, dryRun, force, missingMeta, laCounty };
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
  const { limit, slug, dryRun, force, missingMeta, laCounty } = parseArgs();

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

  // Add scope/region filters (default: active LA County)
  if (!slug) {
    if (SCOPE) where.scope = SCOPE as any;
    if (REGION) where.region = REGION;
  }

  // Optional: restrict to curated places only (those with provenance)
  let curatedIds: string[] = [];
  if (CURATED_ONLY && !slug) {
    curatedIds = await prisma.provenance.findMany({ select: { place_id: true } }).then((r) => r.map((p) => p.place_id));
    if (curatedIds.length > 0) {
      where = { ...where, id: { in: curatedIds } };
    }
  }

  // Restrict to curated places in LA County only (by neighborhood)
  let skippedNotLACounty = 0;
  if (laCounty && !slug) {
    const totalNeedingBackfill = await prisma.places.count({
      where: {
        ...(force ? {} : missingMeta ? { googlePlaceId: { not: null }, OR: [{ neighborhood: null }, { cuisineType: null }] } : { placesDataCachedAt: null }),
        ...(curatedIds.length > 0 && { id: { in: curatedIds } }),
      },
    });
    where = {
      ...where,
      neighborhood: { in: LA_COUNTY_AREAS },
    };
    const laCountyCount = await prisma.places.count({ where });
    skippedNotLACounty = totalNeedingBackfill - laCountyCount;
  }

  const places = await prisma.places.findMany({
    where,
    orderBy: { createdAt: "asc" },
    ...(Number.isFinite(limit) && limit > 0 && { take: limit }),
  });

  console.log(`\nBackfill Google Places — ${places.length} place(s) to process`);
  if (!slug) console.log("(Curated places only)\n");
  if (laCounty) console.log("(LA County only — filtered by neighborhood)\n");
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
        // Mark as attempted so we don't retry forever (Google doesn't have this place)
        if (!dryRun) {
          await prisma.places.update({
            where: { id: place.id },
            data: { placesDataCachedAt: new Date() },
          });
        }
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

      // Check if google_place_id already exists (duplicate check)
      if (googlePlaceId) {
        const existingPlace = await prisma.places.findUnique({
          where: { googlePlaceId: googlePlaceId },
        });

        if (existingPlace && existingPlace.id !== place.id) {
          failed++;
          console.log(
            `  ⚠️  ${label}: Google Place ID already assigned to "${existingPlace.name}" (${existingPlace.slug}) - marking as attempted`
          );
          // Mark as attempted to prevent retry
          if (!dryRun) {
            await prisma.places.update({
              where: { id: place.id },
              data: { placesDataCachedAt: new Date() },
            });
          }
          await sleep(RATE_LIMIT_MS);
          continue;
        }
      }

      const hoursData = formatHoursForStore(placeDetails.openingHours);
      
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
        hours: hoursData ?? undefined,
        placesDataCachedAt: new Date(),
      };

      if (!dryRun) {
        await prisma.places.update({
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
  if (skippedNotLACounty > 0) {
    console.log(`Skipped (not LA County): ${skippedNotLACounty}`);
  }
  if (dryRun) console.log("(No changes were made — run without --dry-run to apply)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
