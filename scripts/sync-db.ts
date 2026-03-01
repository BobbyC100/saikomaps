/**
 * Sync places and related tables from SOURCE DB → TARGET DB.
 * Usage: npx tsx scripts/sync-db.ts --source <url> --target <url> [--apply]
 * Without --apply: dry-run only (counts by table).
 * With --apply: upserts into target; match by primary/unique keys.
 * Fails early if schema differs between DBs.
 */

import { PrismaClient } from "@prisma/client";

function parseArgs(): {
  source: string;
  target: string;
  apply: boolean;
} {
  const args = process.argv.slice(2);
  let source = "";
  let target = "";
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) {
      source = args[++i];
    } else if (args[i] === "--target" && args[i + 1]) {
      target = args[++i];
    } else if (args[i] === "--apply") {
      apply = true;
    }
  }
  if (!source || !target) {
    console.error("Usage: npx tsx scripts/sync-db.ts --source <url> --target <url> [--apply]");
    process.exit(1);
  }
  return { source, target, apply };
}

function createClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

type SchemaCheck = {
  has_places: boolean;
  has_business_status: boolean;
  has_google_places_attributes: boolean;
};

async function checkSchema(client: PrismaClient): Promise<SchemaCheck> {
  const rows = await client.$queryRawUnsafe<SchemaCheck[]>(`
    SELECT
      to_regclass('public.entities') IS NOT NULL AS has_places,
      EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='entities' AND column_name='business_status'
      ) AS has_business_status,
      EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='entities' AND column_name='google_places_attributes'
      ) AS has_google_places_attributes
  `);
  return rows[0] ?? { has_places: false, has_business_status: false, has_google_places_attributes: false };
}

async function getCounts(client: PrismaClient): Promise<Record<string, number>> {
  const [places, energy_scores, place_tag_scores, place_coverage_status] = await Promise.all([
    client.entities.count(),
    client.energy_scores.count(),
    client.place_tag_scores.count(),
    client.place_coverage_status.count(),
  ]);
  return {
    places,
    energy_scores,
    place_tag_scores,
    place_coverage_status,
  };
}

async function main() {
  const { source, target, apply } = parseArgs();

  const sourceClient = createClient(source);
  const targetClient = createClient(target);

  try {
    // Schema check: fail early if either DB is missing required schema
    const [sourceSchema, targetSchema] = await Promise.all([
      checkSchema(sourceClient),
      checkSchema(targetClient),
    ]);
    if (
      !sourceSchema.has_places ||
      !sourceSchema.has_business_status ||
      !sourceSchema.has_google_places_attributes
    ) {
      console.error(
        "FATAL: SOURCE DB schema missing required elements (entities table with business_status, google_places_attributes)."
      );
      process.exit(1);
    }
    if (
      !targetSchema.has_places ||
      !targetSchema.has_business_status ||
      !targetSchema.has_google_places_attributes
    ) {
      console.error(
        "FATAL: TARGET DB schema missing required elements (entities table with business_status, google_places_attributes)."
      );
      process.exit(1);
    }

    const [sourceCounts, targetCounts] = await Promise.all([
      getCounts(sourceClient),
      getCounts(targetClient),
    ]);

    console.log("DRY-RUN SUMMARY (counts by table)");
    console.log("  SOURCE:", sourceCounts);
    console.log("  TARGET:", targetCounts);

    if (!apply) {
      console.log("\nNo --apply: exiting. Re-run with --apply to perform upserts.");
      return;
    }

    console.log("\nApplying sync (upserts)...");

    // Sync places (upsert by id). Omit relation keys so Prisma accepts create/update.
    const placeRelationKeys = [
      "map_places", "person_places", "restaurant_groups", "category_rel",
      "parent", "children", "viewer_bookmarks", "energy_scores", "place_tag_scores",
      "place_photo_eval", "place_coverage_status",
    ];
    const places = await sourceClient.entities.findMany();
    let placesUpserted = 0;
    for (const p of places) {
      const scalar = Object.fromEntries(
        Object.entries(p).filter(([k]) => !placeRelationKeys.includes(k))
      ) as Parameters<typeof targetClient.entities.upsert>[1]["create"];
      await targetClient.entities.upsert({
        where: { id: p.id },
        create: scalar,
        update: scalar,
      });
      placesUpserted++;
    }
    console.log("  places: inserted/updated =", placesUpserted);

    // Sync energy_scores (upsert by place_id + version)
    const energyScores = await sourceClient.energy_scores.findMany();
    let energyUpserted = 0;
    for (const e of energyScores) {
      await targetClient.energy_scores.upsert({
        where: {
          entityId_version: { entityId: e.entityId, version: e.version },
        },
        create: {
          id: e.id,
          entityId: e.entityId,
          energy_score: e.energy_score,
          energy_confidence: e.energy_confidence,
          version: e.version,
          computed_at: e.computed_at,
          popularity_component: e.popularity_component,
          language_component: e.language_component,
          flags_component: e.flags_component,
          sensory_component: e.sensory_component,
          has_popularity: e.has_popularity,
          has_language: e.has_language,
          has_flags: e.has_flags,
          has_sensory: e.has_sensory,
        },
        update: {
          energy_score: e.energy_score,
          energy_confidence: e.energy_confidence,
          computed_at: e.computed_at,
          popularity_component: e.popularity_component,
          language_component: e.language_component,
          flags_component: e.flags_component,
          sensory_component: e.sensory_component,
          has_popularity: e.has_popularity,
          has_language: e.has_language,
          has_flags: e.has_flags,
          has_sensory: e.has_sensory,
        },
      });
      energyUpserted++;
    }
    console.log("  energy_scores: inserted/updated =", energyUpserted);

    // Sync place_tag_scores (upsert by place_id + version)
    const tagScores = await sourceClient.place_tag_scores.findMany();
    let tagScoresUpserted = 0;
    for (const t of tagScores) {
      await targetClient.place_tag_scores.upsert({
        where: {
          entityId_version: { entityId: t.entityId, version: t.version },
        },
        create: {
          id: t.id,
          entityId: t.entityId,
          cozy_score: t.cozy_score,
          date_night_score: t.date_night_score,
          late_night_score: t.late_night_score,
          after_work_score: t.after_work_score,
          scene_score: t.scene_score,
          confidence: t.confidence,
          version: t.version,
          depends_on_energy_version: t.depends_on_energy_version,
          computed_at: t.computed_at,
        },
        update: {
          cozy_score: t.cozy_score,
          date_night_score: t.date_night_score,
          late_night_score: t.late_night_score,
          after_work_score: t.after_work_score,
          scene_score: t.scene_score,
          confidence: t.confidence,
          computed_at: t.computed_at,
        },
      });
      tagScoresUpserted++;
    }
    console.log("  place_tag_scores: inserted/updated =", tagScoresUpserted);

    // Sync place_coverage_status (upsert by dedupe_key)
    const coverageStatus = await sourceClient.place_coverage_status.findMany();
    let coverageUpserted = 0;
    for (const c of coverageStatus) {
      await targetClient.place_coverage_status.upsert({
        where: { dedupe_key: c.dedupe_key },
        create: {
          id: c.id,
          entityId: c.entityId,
          dedupe_key: c.dedupe_key,
          last_success_at: c.last_success_at,
          last_attempt_at: c.last_attempt_at,
          last_attempt_status: c.last_attempt_status,
          last_error_code: c.last_error_code,
          last_error_message: c.last_error_message,
          last_missing_groups: c.last_missing_groups,
          source: c.source,
          updated_at: c.updated_at,
        },
        update: {
          last_success_at: c.last_success_at,
          last_attempt_at: c.last_attempt_at,
          last_attempt_status: c.last_attempt_status,
          last_error_code: c.last_error_code,
          last_error_message: c.last_error_message,
          last_missing_groups: c.last_missing_groups,
          source: c.source,
          updated_at: c.updated_at,
        },
      });
      coverageUpserted++;
    }
    console.log("  place_coverage_status: inserted/updated =", coverageUpserted);

    console.log("Done.");
  } finally {
    await sourceClient.$disconnect();
    await targetClient.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
