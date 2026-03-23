#!/usr/bin/env npx tsx
// =============================================================================
// Saiko Maps — LA City Recreation & Parks Facilities Ingest
//
// Fetches park/facility data from City of LA Dept of Recreation & Parks
// via Socrata Open Data API, maps facility type to amenity flags, and
// writes to civic_parks_raw staging table.
//
// Data source: https://data.lacity.org/resource/ax8j-dhzm.json
// (Department of Recreation and Parks — Facility and Park Information)
//
// Each Socrata row is a single facility (a pool, a tennis center, a beach,
// etc.) with a `locationtype` field. We map locationtype → amenity column
// and insert one row per facility.
//
// This is a non-destructive ingest — writes ONLY to civic_parks_raw.
// No writes to entities, canonical_entity_state, or any other existing table.
//
// Usage:
//   npm run ingest:civic-parks                   # dry-run (preview only)
//   npm run ingest:civic-parks -- --apply         # write to DB
//   npm run ingest:civic-parks -- --apply --force # clear + re-ingest (preserves saiko_curated rows)
//
// =============================================================================

import "dotenv/config";
import { db } from "../lib/db";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SOCRATA_BASE = "https://data.lacity.org/resource/ax8j-dhzm.json";
const PAGE_SIZE = 1000;
const SOURCE_NAME = "lacity_rec_parks";

// ---------------------------------------------------------------------------
// Types — actual Socrata response shape
// ---------------------------------------------------------------------------

interface SocrataCity {
  latitude?: string;
  longitude?: string;
  human_address?: string; // JSON string: {"address":"Venice","city":"","state":"CA","zip":"90291"}
}

interface SocrataRecord {
  locationtype?: string;
  location_name?: string;
  stnumber?: string;
  stname?: string;
  stsuffix?: string;
  city?: SocrataCity;
  state?: string;
  zip?: string;
  website?: string;
  phone?: string;
  councildistrict?: string;
  geolat?: string;
  geolong?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Amenity mapping: locationtype → amenity column
// ---------------------------------------------------------------------------

type AmenityColumn =
  | "amenity_pool"
  | "amenity_tennis"
  | "amenity_basketball"
  | "amenity_baseball"
  | "amenity_soccer"
  | "amenity_multipurpose_field"
  | "amenity_fitness_zone"
  | "amenity_skate_park"
  | "amenity_picnic"
  | "amenity_playground"
  | "amenity_splash_pad"
  | "amenity_dog_park"
  | "amenity_gym"
  | "amenity_community_center"
  | "amenity_senior_center"
  | "amenity_golf"
  | "amenity_lawn_bowling"
  | null; // null = no specific amenity mapped, still ingest as facility

// Case-insensitive mapping — keys are lowercased locationtype values
// Source: actual values from data.lacity.org/resource/ax8j-dhzm.json
const LOCATION_TYPE_MAP: Record<string, AmenityColumn> = {
  // Pools (51 total: 17 year-round + 34 summer)
  "swimming pools - year round": "amenity_pool",
  "swimming pools - summer": "amenity_pool",
  // Courts & fields
  "tennis courts": "amenity_tennis",                       // 67
  // Sports
  "skate parks": "amenity_skate_park",                     // 23
  "golf courses": "amenity_golf",                          // 15
  // Fitness
  "outdoor fitness equipment": "amenity_fitness_zone",     // 67
  // Play
  "universally accessible playgrounds": "amenity_playground", // 33
  // Animals
  "dog parks": "amenity_dog_park",                         // 9
  // Community
  "recreation centers": "amenity_community_center",        // 156
  "senior centers": "amenity_senior_center",               // 34
  // Types we ingest but don't map to a specific amenity column
  "parks": null,                                           // 387
  "beaches": null,                                         // 2
  "camps": null,                                           // 4
  "gardens": null,                                         // 10
  "lakes": null,                                           // 7
  "museums": null,                                         // 15
  "rental facilities": null,                               // 3
  "theatre": null,                                         // 2
  "equestrian centers": null,                              // 4
  "public computer centers": null,                         // 76
  "hiking trails": null,                                   // 14
  "open space": null,                                      // 1
  "free wi-fi hot spots": null,                            // 6
};

function getAmenityColumn(locationType: string | undefined): AmenityColumn {
  if (!locationType) return null;
  return LOCATION_TYPE_MAP[locationType.toLowerCase().trim()] ?? null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumeric(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

function buildAddress(r: SocrataRecord): string | null {
  const parts = [r.stnumber, r.stname, r.stsuffix].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function extractCityName(r: SocrataRecord): string | null {
  if (!r.city?.human_address) return null;
  try {
    const parsed = JSON.parse(r.city.human_address);
    // The "address" field in this dataset is actually the city/neighborhood name
    return parsed.address || parsed.city || null;
  } catch {
    return null;
  }
}

function escSql(val: string): string {
  return val.replace(/'/g, "''");
}

// ---------------------------------------------------------------------------
// Fetch all pages from Socrata
// ---------------------------------------------------------------------------

async function fetchAllRecords(): Promise<SocrataRecord[]> {
  const all: SocrataRecord[] = [];
  let offset = 0;

  console.log(`\n📡 Fetching from Socrata: ${SOCRATA_BASE}`);

  while (true) {
    const url = `${SOCRATA_BASE}?$limit=${PAGE_SIZE}&$offset=${offset}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Socrata responded ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new Error(
        `Socrata returned HTML instead of JSON. The dataset ID may be wrong.\nFirst 200 chars: ${text.slice(0, 200)}`
      );
    }

    const page: SocrataRecord[] = JSON.parse(text);
    if (page.length === 0) break;

    all.push(...page);
    console.log(`   fetched ${all.length} records (offset=${offset})`);
    offset += PAGE_SIZE;

    if (page.length === PAGE_SIZE) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`✅ Total records fetched: ${all.length}\n`);
  return all;
}

// ---------------------------------------------------------------------------
// Build INSERT SQL for a batch
// ---------------------------------------------------------------------------

const AMENITY_COLUMNS = [
  "amenity_tennis",
  "amenity_basketball",
  "amenity_baseball",
  "amenity_soccer",
  "amenity_multipurpose_field",
  "amenity_fitness_zone",
  "amenity_skate_park",
  "amenity_picnic",
  "amenity_playground",
  "amenity_pool",
  "amenity_splash_pad",
  "amenity_dog_park",
  "amenity_gym",
  "amenity_community_center",
  "amenity_senior_center",
  "amenity_golf",
  "amenity_lawn_bowling",
] as const;

function buildInsertSQL(records: SocrataRecord[], fetchedAt: string): string {
  const values = records.map((r) => {
    const name = escSql(r.location_name ?? "");
    const address = buildAddress(r);
    const cityName = extractCityName(r);
    const zip = r.zip;
    const lat = toNumeric(r.geolat);
    const lng = toNumeric(r.geolong);
    const locationType = escSql(r.locationtype ?? "");
    const amenityCol = getAmenityColumn(r.locationtype);

    // Build amenity values — 1 for the matched column, 0 for all others
    const amenityValues = AMENITY_COLUMNS.map((col) =>
      col === amenityCol ? 1 : 0
    );
    const hasAmenity = amenityCol !== null;

    return `(
      '${SOURCE_NAME}',
      '${fetchedAt}'::timestamptz,
      '${name}',
      ${address ? `'${escSql(address)}'` : "NULL"},
      ${cityName ? `'${escSql(cityName)}'` : "NULL"},
      ${zip ? `'${escSql(zip)}'` : "NULL"},
      '${locationType}',
      ${lat ?? "NULL"},
      ${lng ?? "NULL"},
      ${amenityValues.join(", ")},
      ${hasAmenity ? "TRUE" : "FALSE"}
    )`;
  });

  return `
    INSERT INTO civic_parks_raw (
      source_name, fetched_at,
      park_name, address, city, zip, access_type,
      latitude, longitude,
      ${AMENITY_COLUMNS.join(", ")},
      amenities_reported
    ) VALUES ${values.join(",\n")}
  `;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const force = args.includes("--force");

  console.log("=".repeat(70));
  console.log("  Saiko — LA City Recreation & Parks Facilities Ingest");
  console.log(
    `  Mode: ${apply ? "💾 APPLY (writing to DB)" : "👀 DRY-RUN (preview only)"}`
  );
  if (force)
    console.log(
      "  ⚠️  --force: will clear lacity_rec_parks rows before insert (preserves saiko_curated)"
    );
  console.log("=".repeat(70));

  // ------------------------------------------------------------------
  // Step 1: Fetch from Socrata
  // ------------------------------------------------------------------
  const records = await fetchAllRecords();

  if (records.length === 0) {
    console.log("⚠️  No records returned from Socrata. Aborting.");
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // Step 2: Summarize
  // ------------------------------------------------------------------
  const withCoords = records.filter(
    (r) => r.geolat && r.geolong
  ).length;
  const withMappedAmenity = records.filter(
    (r) => getAmenityColumn(r.locationtype) !== null
  ).length;
  const missingName = records.filter((r) => !r.location_name).length;

  // Collect locationtype distribution
  const typeCounts: Record<string, number> = {};
  for (const r of records) {
    const t = r.locationtype ?? "(missing)";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  console.log("📊 Summary:");
  console.log(`   Total records:           ${records.length}`);
  console.log(`   With coordinates:        ${withCoords}`);
  console.log(`   With mapped amenity:     ${withMappedAmenity}`);
  console.log(`   Missing location_name:   ${missingName}`);
  console.log(`\n📋 Location types:`);
  for (const [type, count] of Object.entries(typeCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    const mapped = getAmenityColumn(type);
    console.log(
      `   ${String(count).padStart(4)} × ${type}${mapped ? ` → ${mapped}` : ""}`
    );
  }

  // Filter out records with no name
  const valid = records.filter((r) => r.location_name);
  console.log(`\n   Valid for ingest:        ${valid.length}`);

  if (!apply) {
    console.log("\n👀 DRY-RUN complete. Run with --apply to write to DB.");
    console.log("\n📋 Sample (first 10):");
    for (const r of valid.slice(0, 10)) {
      const amenity = getAmenityColumn(r.locationtype);
      console.log(
        `   ${(r.locationtype ?? "?").padEnd(25)} ${r.location_name} | ${extractCityName(r) ?? "?"} | ${amenity ?? "(no amenity)"}`
      );
    }
    process.exit(0);
  }

  // ------------------------------------------------------------------
  // Step 3: Write to DB
  // ------------------------------------------------------------------
  const fetchedAt = new Date().toISOString();

  if (force) {
    // Only clear rows from THIS source — preserve saiko_curated rows
    console.log(
      `\n🗑️  Clearing existing ${SOURCE_NAME} rows from civic_parks_raw...`
    );
    await db.$executeRawUnsafe(
      `DELETE FROM civic_parks_raw WHERE source_name = '${SOURCE_NAME}'`
    );
    console.log("   Done.");
  } else {
    const [existing] = await db.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) AS count FROM civic_parks_raw WHERE source_name = '${SOURCE_NAME}'`
    );
    const count = Number(existing?.count ?? 0);
    if (count > 0) {
      console.log(
        `\n⚠️  civic_parks_raw already has ${count} rows from ${SOURCE_NAME}. Use --force to clear and re-ingest.`
      );
      process.exit(1);
    }
  }

  // Batch insert
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    const sql = buildInsertSQL(batch, fetchedAt);
    await db.$executeRawUnsafe(sql);
    inserted += batch.length;
    process.stdout.write(`\r   Inserted ${inserted}/${valid.length}`);
  }

  console.log(`\n✅ Inserted ${inserted} records into civic_parks_raw`);

  // ------------------------------------------------------------------
  // Step 4: Verify
  // ------------------------------------------------------------------
  const [finalCount] = await db.$queryRawUnsafe<[{ count: bigint }]>(
    "SELECT COUNT(*) AS count FROM civic_parks_raw"
  );
  const [sourceCount] = await db.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) AS count FROM civic_parks_raw WHERE source_name = '${SOURCE_NAME}'`
  );
  const [curatedCount] = await db.$queryRawUnsafe<[{ count: bigint }]>(
    "SELECT COUNT(*) AS count FROM civic_parks_raw WHERE source_name = 'saiko_curated'"
  );
  const [amenityCount] = await db.$queryRawUnsafe<[{ count: bigint }]>(
    "SELECT COUNT(*) AS count FROM civic_parks_raw WHERE has_any_amenity = TRUE"
  );

  console.log("\n📊 Post-ingest verification:");
  console.log(`   Total rows:          ${Number(finalCount?.count ?? 0)}`);
  console.log(`     from ${SOURCE_NAME}:  ${Number(sourceCount?.count ?? 0)}`);
  console.log(`     from saiko_curated:  ${Number(curatedCount?.count ?? 0)}`);
  console.log(`   With amenities:      ${Number(amenityCount?.count ?? 0)}`);
  console.log(`   entity_id assigned:  0 (expected — matching not yet run)`);
  console.log("\n✅ Ingest complete. Next step: entity matching pass.");
}

main()
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
