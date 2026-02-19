-- Energy + Weighted Tag Engine (v1) — CTO Spec
-- Tables: energy_versions, tag_versions, energy_scores, place_tag_scores

-- energy_versions — version metadata for energy engine
CREATE TABLE "energy_versions" (
    "version" TEXT NOT NULL PRIMARY KEY,
    "weights" JSONB,
    "lexicon_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- tag_versions — version metadata for tag scoring engine
CREATE TABLE "tag_versions" (
    "version" TEXT NOT NULL PRIMARY KEY,
    "tag_weight_config" JSONB,
    "depends_on_energy_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tag_versions_depends_fkey" FOREIGN KEY ("depends_on_energy_version") REFERENCES "energy_versions"("version")
);

-- energy_scores — baseline energy classification per place
CREATE TABLE "energy_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "place_id" TEXT NOT NULL,
    "energy_score" INTEGER NOT NULL,
    "energy_confidence" DOUBLE PRECISION NOT NULL,
    "popularity_component" INTEGER,
    "language_component" INTEGER,
    "flags_component" INTEGER,
    "sensory_component" INTEGER,
    "has_popularity" BOOLEAN NOT NULL DEFAULT false,
    "has_language" BOOLEAN NOT NULL DEFAULT false,
    "has_flags" BOOLEAN NOT NULL DEFAULT false,
    "has_sensory" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "energy_scores_place_id_version_key" UNIQUE ("place_id", "version"),
    CONSTRAINT "energy_scores_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE,
    CONSTRAINT "energy_scores_version_fkey" FOREIGN KEY ("version") REFERENCES "energy_versions"("version")
);

CREATE INDEX "energy_scores_place_id_idx" ON "energy_scores"("place_id");
CREATE INDEX "energy_scores_version_idx" ON "energy_scores"("version");

-- place_tag_scores — weighted tag interpretations (0-1) per place
CREATE TABLE "place_tag_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "place_id" TEXT NOT NULL,
    "cozy_score" DOUBLE PRECISION NOT NULL,
    "date_night_score" DOUBLE PRECISION NOT NULL,
    "late_night_score" DOUBLE PRECISION NOT NULL,
    "after_work_score" DOUBLE PRECISION NOT NULL,
    "scene_score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION,
    "version" TEXT NOT NULL,
    "depends_on_energy_version" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "place_tag_scores_place_id_version_key" UNIQUE ("place_id", "version"),
    CONSTRAINT "place_tag_scores_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE,
    CONSTRAINT "place_tag_scores_version_fkey" FOREIGN KEY ("version") REFERENCES "tag_versions"("version")
);

CREATE INDEX "place_tag_scores_place_id_idx" ON "place_tag_scores"("place_id");
CREATE INDEX "place_tag_scores_version_idx" ON "place_tag_scores"("version");

-- Seed initial v1 versions
INSERT INTO "energy_versions" ("version", "weights", "lexicon_hash", "created_at") VALUES
  ('energy_v1', '{"popularity":0.40,"language":0.30,"flags":0.10,"sensory":0.10}', NULL, NOW())
ON CONFLICT ("version") DO NOTHING;

INSERT INTO "tag_versions" ("version", "tag_weight_config", "depends_on_energy_version", "created_at") VALUES
  ('tags_v1', '{"cozy":1,"date_night":1,"late_night":1,"after_work":1,"scene":1}', 'energy_v1', NOW())
ON CONFLICT ("version") DO NOTHING;
