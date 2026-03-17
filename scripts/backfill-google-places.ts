/**
 * Backfill Google Places data for Place records missing photos, hours, contact info,
 * neighborhood, and cuisine_type.
 *
 * Usage:
 *   npm run backfill:google                    # places never cached (placesDataCachedAt null)
 *   npm run backfill:google -- --missing-meta  # places with null neighborhood or cuisineType
 *   npm run backfill:google -- --limit 20      # first 20 only
 *   npm run backfill:google -- --slug seco     # single place by slug
 *   npm run backfill:google -- --batch 25       # process 25 at a time with pause between batches
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
import { jaroWinklerSimilarity, normalizeName } from "@/lib/similarity";
import { scanEntities } from "@/lib/coverage/issue-scanner";
import { writeClaimAndSanction } from "@/lib/fields-v2/write-claim";

// Minimum Jaro-Winkler similarity for strict check. If this fails, we also
// try a substring check (does our name appear in Google's or vice versa).
// Only enforced when we searched by name (no pre-existing GPID).
const GPID_SEARCH_MIN_SIMILARITY = 0.55;

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
  let batchSize = 0; // 0 = no batching

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") limit = parseInt(args[++i] || "0", 10) || Infinity;
    else if (args[i] === "--slug") slug = args[++i] || null;
    else if (args[i] === "--batch") batchSize = parseInt(args[++i] || "0", 10) || 0;
    else if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--force") force = true;
    else if (args[i] === "--missing-meta") missingMeta = true;
  }

  return { limit, slug, dryRun, force, missingMeta, batchSize };
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
  const { limit, slug, dryRun, force, missingMeta, batchSize } = parseArgs();

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

  const places = await prisma.entities.findMany({
    where,
    orderBy: { createdAt: "asc" },
    ...(Number.isFinite(limit) && limit > 0 && { take: limit }),
  });

  console.log(`\nBackfill Google Places — ${places.length} place(s) to process`);
  if (batchSize > 0) console.log(`  Batch size: ${batchSize} (pausing 2s between batches)`);
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
      let searchedByName = false;
      if (!placeDetails && (place.name || place.address)) {
        const searchQuery = place.address
          ? `${place.name}, ${place.address}`
          : `${place.name}${place.neighborhood ? ` ${place.neighborhood}` : ""}, Los Angeles`;
        searchedByName = !place.address; // true when we had no address anchor
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

      // Guard: when we searched by name only (no address/GPID anchor), verify the
      // Google result actually matches the entity name. We use two checks:
      // 1. Jaro-Winkler similarity (catches close matches)
      // 2. Substring containment (catches "Tuk Tuk" ⊂ "Tuk Tuk Thai -- Thai Restaurant")
      // Only reject if BOTH checks fail — we're just linking to get GPID/coords/hours,
      // not overwriting our name.
      if (searchedByName && place.name && placeDetails.name) {
        const ourName = normalizeName(place.name);
        const googleName = normalizeName(placeDetails.name);
        const similarity = jaroWinklerSimilarity(ourName, googleName);
        const substringMatch = googleName.includes(ourName) || ourName.includes(googleName);

        if (similarity < GPID_SEARCH_MIN_SIMILARITY && !substringMatch) {
          failed++;
          console.log(
            `  ❌ ${label}: Google result "${placeDetails.name}" doesn't match (similarity=${similarity.toFixed(2)}, no substring match) — skipping. Provide a GPID or address to proceed.`
          );
          await sleep(RATE_LIMIT_MS);
          continue;
        }
        const matchMethod = substringMatch ? 'substring' : `similarity ${similarity.toFixed(2)}`;
        console.log(`  ✓ name match: "${placeDetails.name}" (${matchMethod})`);
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

      // ── Evidence-first: write observed_claims via writeClaimAndSanction ──
      // Each field from Google Places becomes a claim that gets sanctioned
      // into canonical_entity_state based on confidence thresholds.
      const sourceUrl = `https://maps.googleapis.com/maps/api/place/details?place_id=${googlePlaceId}`;
      const claimBase = {
        entityId: place.id,
        sourceId: 'google_places' as const,
        sourceUrl,
        extractionMethod: 'API' as const,
        confidence: 0.95,
        resolutionMethod: place.googlePlaceId ? 'GOOGLE_PLACE_ID_EXACT' as const : 'FUZZY_MATCH' as const,
      };

      const claims: { attributeKey: string; rawValue: unknown }[] = [];

      if (googlePlaceId) claims.push({ attributeKey: 'google_place_id', rawValue: googlePlaceId });
      // Never overwrite our curated name — only fill if we had none
      if (!place.name && placeDetails.name) claims.push({ attributeKey: 'name', rawValue: placeDetails.name });
      if (placeDetails.formattedAddress && !placeDetails.formattedAddress.startsWith("http")) {
        claims.push({ attributeKey: 'address', rawValue: placeDetails.formattedAddress });
      }
      if (!Number.isNaN(lat)) claims.push({ attributeKey: 'latitude', rawValue: lat });
      if (!Number.isNaN(lng)) claims.push({ attributeKey: 'longitude', rawValue: lng });
      if (placeDetails.formattedPhoneNumber) claims.push({ attributeKey: 'phone', rawValue: placeDetails.formattedPhoneNumber });
      if (placeDetails.website) claims.push({ attributeKey: 'website', rawValue: placeDetails.website });
      if (placeDetails.priceLevel != null) claims.push({ attributeKey: 'price_level', rawValue: placeDetails.priceLevel });
      if (neighborhood) claims.push({ attributeKey: 'neighborhood', rawValue: neighborhood });
      if (cuisineType) claims.push({ attributeKey: 'cuisine_type', rawValue: cuisineType });
      const resolvedCategory = place.category ?? getSaikoCategory(placeDetails.name, placeDetails.types ?? []);
      if (resolvedCategory) claims.push({ attributeKey: 'category', rawValue: resolvedCategory });
      if (placeDetails.photos?.length) {
        claims.push({ attributeKey: 'google_photos', rawValue: JSON.parse(JSON.stringify(placeDetails.photos)) });
      }
      const hours = formatHoursForStore(placeDetails.openingHours);
      if (hours) claims.push({ attributeKey: 'hours', rawValue: hours });

      if (!dryRun) {
        for (const claim of claims) {
          try {
            await writeClaimAndSanction(prisma, { ...claimBase, ...claim });
          } catch (claimErr: any) {
            // GPID unique constraint = two entities resolve to same Google Place.
            // Log it as a potential duplicate but continue writing other fields.
            if (claim.attributeKey === 'google_place_id' && claimErr?.code === 'P2002') {
              console.log(`  ⚠️  ${label}: GPID already claimed by another entity (potential duplicate)`);
            } else {
              throw claimErr;
            }
          }
        }
        // Non-canonical metadata: googleTypes and cache timestamp stay on entities
        await prisma.entities.update({
          where: { id: place.id },
          data: {
            googleTypes: placeDetails.types ?? [],
            placesDataCachedAt: new Date(),
          },
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

    // Batch pause: after every batchSize entities, pause and log progress
    if (batchSize > 0 && (i + 1) % batchSize === 0 && i + 1 < places.length) {
      const processed = i + 1;
      const remaining = places.length - processed;
      console.log(`\n  ⏸  Batch of ${batchSize} done (${processed}/${places.length}, ${remaining} remaining). Pausing 2s...\n`);
      await sleep(2000);
    }
  }

  console.log("\n--- Backfill Complete ---");
  console.log(`Enriched: ${enriched}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
  if (dryRun) console.log("(No changes were made — run without --dry-run to apply)");

  // Auto-rescan issues for affected entities so dashboard reflects new data
  if (!dryRun && enriched > 0 && slug) {
    console.log("\nRe-scanning issues...");
    try {
      const scanResult = await scanEntities(prisma, { slugs: [slug] });
      console.log(`  Issues: ${scanResult.issues_created} created, ${scanResult.issues_resolved} resolved, ${scanResult.issues_unchanged} unchanged`);
    } catch (e) {
      console.error("  Issue rescan failed (non-fatal):", e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
