#!/usr/bin/env npx tsx
// =============================================================================
// Saiko Maps — Parks Facility Matching Pass
//
// Scores each facility row in civic_parks_raw against candidate parent parks,
// then creates entities (PARKS vertical) and park_facility_relationships.
//
// Scoring model (from entity model v2 spec):
//   - Name similarity (Jaro-Winkler):  weight 0.4
//   - Geo distance (meters):           weight 0.3
//   - Shared address / zip:            weight 0.15
//   - Name contains park name:         weight 0.15
//
// Thresholds:
//   - Auto-link:   score >= 0.7
//   - Review queue: 0.4 <= score < 0.7
//   - Standalone:  score < 0.4
//
// Usage:
//   npm run match:parks                    # dry-run
//   npm run match:parks -- --apply         # create entities + relationships
//   npm run match:parks -- --apply --force # re-run (clears previous PARKS entities)
//
// =============================================================================

import "dotenv/config";
import { db } from "../lib/db";
import { jaroWinklerSimilarity } from "../lib/similarity";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StagingRow {
  id: number;
  source_name: string;
  park_name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  access_type: string | null;
  latitude: number | null;
  longitude: number | null;
  amenity_tennis: number;
  amenity_basketball: number;
  amenity_baseball: number;
  amenity_soccer: number;
  amenity_multipurpose_field: number;
  amenity_fitness_zone: number;
  amenity_skate_park: number;
  amenity_picnic: number;
  amenity_playground: number;
  amenity_pool: number;
  amenity_splash_pad: number;
  amenity_dog_park: number;
  amenity_gym: number;
  amenity_community_center: number;
  amenity_senior_center: number;
  amenity_golf: number;
  amenity_lawn_bowling: number;
  has_any_amenity: boolean;
  entity_id: string | null;
}

interface MatchResult {
  facility: StagingRow;
  parentPark: StagingRow | null;
  score: number;
  tier: "auto" | "review" | "standalone";
  breakdown: {
    nameSim: number;
    distScore: number;
    addressMatch: number;
    nameContains: number;
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const WEIGHTS = {
  nameSimilarity: 0.3,
  geoDistance: 0.25,
  sharedAddress: 0.15,
  nameContains: 0.3,
};

const AUTO_THRESHOLD = 0.55;
const REVIEW_THRESHOLD = 0.35;
const MAX_DISTANCE_M = 3000; // beyond this, distance score = 0

function haversineMeters(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scorePair(facility: StagingRow, park: StagingRow): MatchResult["breakdown"] {
  const fName = normalize(facility.park_name);
  const pName = normalize(park.park_name);

  // 1. Name similarity
  const nameSim = jaroWinklerSimilarity(fName, pName);

  // 2. Geo distance
  let distScore = 0;
  if (
    facility.latitude && facility.longitude &&
    park.latitude && park.longitude
  ) {
    const dist = haversineMeters(
      Number(facility.latitude), Number(facility.longitude),
      Number(park.latitude), Number(park.longitude)
    );
    distScore = dist <= MAX_DISTANCE_M ? 1 - dist / MAX_DISTANCE_M : 0;
  }

  // 3. Shared address / zip
  let addressMatch = 0;
  if (facility.zip && park.zip && facility.zip === park.zip) {
    addressMatch = 0.5;
  }
  if (
    facility.address && park.address &&
    normalize(facility.address) === normalize(park.address)
  ) {
    addressMatch = 1;
  }

  // 4. Name contains park name
  let nameContains = 0;
  if (pName && fName.includes(pName)) {
    nameContains = 1;
  } else if (pName) {
    // Check if first two words of park name appear in facility name
    const parkWords = pName.split(" ").slice(0, 2).join(" ");
    if (parkWords.length > 3 && fName.includes(parkWords)) {
      nameContains = 0.7;
    }
  }

  return { nameSim, distScore, addressMatch, nameContains };
}

function compositeScore(b: MatchResult["breakdown"]): number {
  return (
    b.nameSim * WEIGHTS.nameSimilarity +
    b.distScore * WEIGHTS.geoDistance +
    b.addressMatch * WEIGHTS.sharedAddress +
    b.nameContains * WEIGHTS.nameContains
  );
}

// ---------------------------------------------------------------------------
// Amenity helpers
// ---------------------------------------------------------------------------

const AMENITY_COLUMNS = [
  "amenity_tennis", "amenity_basketball", "amenity_baseball",
  "amenity_soccer", "amenity_multipurpose_field", "amenity_fitness_zone",
  "amenity_skate_park", "amenity_picnic", "amenity_playground",
  "amenity_pool", "amenity_splash_pad", "amenity_dog_park",
  "amenity_gym", "amenity_community_center", "amenity_senior_center",
  "amenity_golf", "amenity_lawn_bowling",
] as const;

const AMENITY_LABELS: Record<string, string> = {
  amenity_tennis: "Tennis",
  amenity_basketball: "Basketball",
  amenity_baseball: "Baseball",
  amenity_soccer: "Soccer",
  amenity_multipurpose_field: "Multi-Purpose Field",
  amenity_fitness_zone: "Fitness Zone",
  amenity_skate_park: "Skate Park",
  amenity_picnic: "Picnic",
  amenity_playground: "Playground",
  amenity_pool: "Swimming Pool",
  amenity_splash_pad: "Splash Pad",
  amenity_dog_park: "Dog Park",
  amenity_gym: "Gym",
  amenity_community_center: "Community Center",
  amenity_senior_center: "Senior Center",
  amenity_golf: "Golf",
  amenity_lawn_bowling: "Lawn Bowling",
};

function getAmenityTags(row: StagingRow): string[] {
  const tags: string[] = [];
  for (const col of AMENITY_COLUMNS) {
    if ((row as any)[col] > 0) {
      tags.push(AMENITY_LABELS[col] ?? col);
    }
  }
  return tags;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function deriveCategory(row: StagingRow): string {
  const tags = getAmenityTags(row);
  if (tags.length === 1) return tags[0];
  if (row.access_type?.toLowerCase() === "parks") return "Park";
  if (tags.length > 0) return tags[0];
  return row.access_type ?? "Park";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const force = args.includes("--force");

  console.log("=".repeat(70));
  console.log("  Saiko — Parks Facility Matching Pass");
  console.log(`  Mode: ${apply ? "💾 APPLY" : "👀 DRY-RUN"}`);
  console.log("=".repeat(70));

  // ------------------------------------------------------------------
  // Step 0: Clean up partial state if --force (BEFORE loading data)
  // ------------------------------------------------------------------
  if (force && apply) {
    console.log("\n🗑️  --force: cleaning up previous PARKS entities and relationships...");
    await db.$executeRawUnsafe("DELETE FROM park_facility_relationships");
    await db.$executeRawUnsafe("DELETE FROM entities WHERE primary_vertical = 'PARKS'");
    await db.$executeRawUnsafe("UPDATE civic_parks_raw SET processed = FALSE, entity_id = NULL");
    console.log("   Done.");
  }

  // ------------------------------------------------------------------
  // Step 1: Load staging data
  // ------------------------------------------------------------------
  const allRows = await db.$queryRawUnsafe<StagingRow[]>(
    "SELECT * FROM civic_parks_raw WHERE processed = FALSE ORDER BY id"
  );
  console.log(`\n📦 Loaded ${allRows.length} unprocessed staging rows`);

  // Separate parks (potential parents) from facilities (potential children)
  const parks = allRows.filter(
    (r) => r.access_type?.toLowerCase() === "parks" || r.access_type === null && !r.has_any_amenity
  );
  const facilities = allRows.filter(
    (r) => r.has_any_amenity || (r.access_type && r.access_type.toLowerCase() !== "parks")
  );
  // Some rows might be parks WITH amenities from curated data — treat as parks
  const curatedParks = allRows.filter(
    (r) => r.source_name === "saiko_curated"
  );

  // Build candidate parent pool: staging parks + any existing PARKS entities
  const existingParks = await db.$queryRawUnsafe<{ id: string; name: string; address: string | null; latitude: any; longitude: any }[]>(
    "SELECT id, name, address, latitude, longitude FROM entities WHERE primary_vertical = 'PARKS' AND status = 'OPEN'"
  );

  console.log(`   Parks (staging):        ${parks.length}`);
  console.log(`   Facilities (staging):   ${facilities.length}`);
  console.log(`   Curated entries:        ${curatedParks.length}`);
  console.log(`   Existing PARKS entities: ${existingParks.length}`);

  // ------------------------------------------------------------------
  // Step 2: Score each facility against candidate parks
  // ------------------------------------------------------------------
  const results: MatchResult[] = [];

  for (const fac of allRows) {
    let bestScore = 0;
    let bestPark: StagingRow | null = null;
    let bestBreakdown = { nameSim: 0, distScore: 0, addressMatch: 0, nameContains: 0 };

    // Score against staging parks
    for (const park of parks) {
      if (park.id === fac.id) continue;
      const bd = scorePair(fac, park);
      const s = compositeScore(bd);
      if (s > bestScore) {
        bestScore = s;
        bestPark = park;
        bestBreakdown = bd;
      }
    }

    const tier: MatchResult["tier"] =
      bestScore >= AUTO_THRESHOLD ? "auto" :
      bestScore >= REVIEW_THRESHOLD ? "review" :
      "standalone";

    results.push({
      facility: fac,
      parentPark: tier !== "standalone" ? bestPark : null,
      score: bestScore,
      tier,
      breakdown: bestBreakdown,
    });
  }

  // ------------------------------------------------------------------
  // Step 3: Summary
  // ------------------------------------------------------------------
  const autoLinks = results.filter((r) => r.tier === "auto");
  const reviews = results.filter((r) => r.tier === "review");
  const standalones = results.filter((r) => r.tier === "standalone");

  console.log("\n📊 Matching Results:");
  console.log(`   Auto-link (≥0.7):   ${autoLinks.length}`);
  console.log(`   Review (0.4–0.7):   ${reviews.length}`);
  console.log(`   Standalone (<0.4):  ${standalones.length}`);

  // Show top auto-links
  console.log("\n📋 Top auto-links (first 10):");
  for (const r of autoLinks.slice(0, 10)) {
    console.log(
      `   ${r.score.toFixed(2)} | ${r.facility.park_name} → ${r.parentPark?.park_name ?? "(none)"}`
    );
  }

  // Show review queue
  if (reviews.length > 0) {
    console.log("\n📋 Review queue (first 10):");
    for (const r of reviews.slice(0, 10)) {
      console.log(
        `   ${r.score.toFixed(2)} | ${r.facility.park_name} → ${r.parentPark?.park_name ?? "(none)"}`
      );
    }
  }

  // Show standalones
  console.log(`\n📋 Standalone facilities (first 10):`);
  for (const r of standalones.slice(0, 10)) {
    console.log(`   ${r.facility.park_name} | ${r.facility.city ?? "?"}`);
  }

  if (!apply) {
    console.log("\n👀 DRY-RUN complete. Run with --apply to create entities.");
    process.exit(0);
  }

  // ------------------------------------------------------------------
  // Step 4: Create entities
  // ------------------------------------------------------------------
  console.log("\n💾 Creating entities...");

  // Load existing slugs from DB to avoid collisions
  const existingSlugs = new Set<string>(
    (await db.$queryRawUnsafe<{ slug: string }[]>("SELECT slug FROM entities")).map((r) => r.slug)
  );
  const createdSlugs = new Set<string>();
  let entitiesCreated = 0;
  let entitiesSkipped = 0;
  let relationshipsCreated = 0;

  // Helper: create entity from staging row
  async function createEntityFromStaging(row: StagingRow): Promise<string> {
    let baseSlug = slugify(row.park_name);
    let slug = baseSlug;
    let attempt = 0;
    while (createdSlugs.has(slug) || existingSlugs.has(slug)) {
      attempt++;
      slug = `${baseSlug}-parks-${attempt}`;
    }
    createdSlugs.add(slug);
    existingSlugs.add(slug);

    const id = crypto.randomUUID();
    const category = deriveCategory(row);
    const amenityTags = getAmenityTags(row);

    await db.$executeRawUnsafe(`
      INSERT INTO entities (
        id, slug, name, address, latitude, longitude,
        primary_vertical, category, thematic_tags,
        status, created_at, updated_at
      ) VALUES (
        '${id}', '${slug}', '${(row.park_name).replace(/'/g, "''")}',
        ${row.address ? `'${row.address.replace(/'/g, "''")}'` : "NULL"},
        ${row.latitude ?? "NULL"}, ${row.longitude ?? "NULL"},
        'PARKS', '${category.replace(/'/g, "''")}',
        ARRAY[${amenityTags.map((t) => `'${t}'`).join(",")}]::text[],
        'OPEN', NOW(), NOW()
      )
    `);

    // Mark staging row as processed
    await db.$executeRawUnsafe(
      `UPDATE civic_parks_raw SET processed = TRUE, entity_id = '${id}' WHERE id = ${row.id}`
    );

    entitiesCreated++;
    return id;
  }

  // First pass: create entities for standalone parks (locationtype=Parks with no amenity)
  // and standalone facilities
  const parkEntityMap = new Map<number, string>(); // staging_id → entity_id

  // Create all unique parks first
  const uniqueParks = new Set<number>();
  for (const r of results) {
    if (r.parentPark) {
      uniqueParks.add(r.parentPark.id);
    }
  }
  // Also add standalone parks (locationtype=Parks rows)
  for (const row of parks) {
    uniqueParks.add(row.id);
  }

  console.log(`   Creating ${uniqueParks.size} park entities...`);
  for (const parkId of uniqueParks) {
    const row = allRows.find((r) => r.id === parkId);
    if (!row) continue;
    const entityId = await createEntityFromStaging(row);
    parkEntityMap.set(parkId, entityId);
    process.stdout.write(`\r   Parks: ${parkEntityMap.size}/${uniqueParks.size}`);
  }
  console.log();

  // Create facility entities and link them
  console.log(`   Creating facility entities + relationships...`);
  for (const r of results) {
    // Skip rows that are parks (already created above)
    if (uniqueParks.has(r.facility.id)) continue;

    const entityId = await createEntityFromStaging(r.facility);

    // Create relationship if auto-linked
    if (r.tier === "auto" && r.parentPark) {
      const parentEntityId = parkEntityMap.get(r.parentPark.id);
      if (parentEntityId) {
        await db.$executeRawUnsafe(`
          INSERT INTO park_facility_relationships (
            id, parent_entity_id, child_entity_id, relationship_type, confidence, source
          ) VALUES (
            '${crypto.randomUUID()}', '${parentEntityId}', '${entityId}',
            'CONTAINS', ${r.score}, 'auto_match'
          ) ON CONFLICT (parent_entity_id, child_entity_id, relationship_type) DO NOTHING
        `);
        relationshipsCreated++;
      }
    }

    process.stdout.write(`\r   Entities: ${entitiesCreated} | Relationships: ${relationshipsCreated}`);
  }

  console.log(`\n\n✅ Matching pass complete:`);
  console.log(`   Entities created:       ${entitiesCreated}`);
  console.log(`   Relationships created:  ${relationshipsCreated}`);
  console.log(`   Review queue:           ${reviews.length} (not auto-linked, needs human review)`);

  // ------------------------------------------------------------------
  // Step 5: Verify
  // ------------------------------------------------------------------
  const [totalEntities] = await db.$queryRawUnsafe<[{ count: bigint }]>(
    "SELECT COUNT(*) AS count FROM entities WHERE primary_vertical = 'PARKS'"
  );
  const [totalRels] = await db.$queryRawUnsafe<[{ count: bigint }]>(
    "SELECT COUNT(*) AS count FROM park_facility_relationships"
  );
  const [processedStaging] = await db.$queryRawUnsafe<[{ count: bigint }]>(
    "SELECT COUNT(*) AS count FROM civic_parks_raw WHERE processed = TRUE"
  );

  console.log("\n📊 Post-match verification:");
  console.log(`   PARKS entities:         ${Number(totalEntities?.count ?? 0)}`);
  console.log(`   Relationships:          ${Number(totalRels?.count ?? 0)}`);
  console.log(`   Staging rows processed: ${Number(processedStaging?.count ?? 0)}`);
}

main()
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
