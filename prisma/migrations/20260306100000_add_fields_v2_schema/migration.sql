-- Fields v2 Schema — Clean Data Layer
-- Three-layer model: Observed Claims → Canonical Entity State → Derived/Interpretation
-- This migration is additive only. No existing tables or columns are modified.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE "SourceType" AS ENUM (
  'GOOGLE_PLACES',
  'EDITORIAL',
  'OPERATOR_WEBSITE',
  'SOCIAL',
  'NEWSLETTER',
  'HUMAN_REVIEW',
  'SYSTEM_IMPORT'
);

CREATE TYPE "AttributeClass" AS ENUM (
  'CANONICAL',
  'DERIVED',
  'INTERPRETATION'
);

CREATE TYPE "DecayPolicy" AS ENUM (
  'NONE',
  'TIME_BASED',
  'SOURCE_UPDATED'
);

CREATE TYPE "ExtractionMethod" AS ENUM (
  'API',
  'SCRAPE',
  'AI_EXTRACT',
  'HUMAN',
  'IMPORT'
);

CREATE TYPE "ClaimResolutionMethod" AS ENUM (
  'SLUG_EXACT',
  'GOOGLE_PLACE_ID_EXACT',
  'PLACEKEY_EXACT',
  'FUZZY_MATCH',
  'HUMAN_REVIEW',
  'NEW_ENTITY'
);

CREATE TYPE "SanctionMethod" AS ENUM (
  'AUTO_HIGH_CONFIDENCE',
  'AUTO_SOLE_SOURCE',
  'HUMAN_APPROVED',
  'HUMAN_OVERRIDE'
);

CREATE TYPE "SanctionConflictStatus" AS ENUM (
  'OPEN',
  'RESOLVED_HUMAN',
  'RESOLVED_AUTO'
);

CREATE TYPE "InterpretationType" AS ENUM (
  'TAGLINE',
  'PULL_QUOTE',
  'SCENESENSE_PRL',
  'VOICE_DESCRIPTOR'
);

-- ---------------------------------------------------------------------------
-- A. Source Registry
-- Trust-gated catalog of every data source the system accepts.
-- ---------------------------------------------------------------------------

CREATE TABLE "source_registry" (
  "id"                      TEXT NOT NULL,
  "display_name"            TEXT NOT NULL,
  "source_type"             "SourceType" NOT NULL,
  "trust_tier"              INTEGER NOT NULL,
  "requires_human_approval" BOOLEAN NOT NULL DEFAULT false,
  "base_domain"             TEXT,
  "is_active"               BOOLEAN NOT NULL DEFAULT true,
  "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "source_registry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "source_registry_trust_tier_idx" ON "source_registry"("trust_tier");
CREATE INDEX "source_registry_is_active_idx" ON "source_registry"("is_active");

-- ---------------------------------------------------------------------------
-- B. Attribute Registry
-- Classifies every attribute key the system tracks.
-- ---------------------------------------------------------------------------

CREATE TABLE "attribute_registry" (
  "attribute_key"      TEXT NOT NULL,
  "display_name"       TEXT NOT NULL,
  "attribute_class"    "AttributeClass" NOT NULL,
  "identity_critical"  BOOLEAN NOT NULL DEFAULT false,
  "sanction_threshold" DECIMAL(3,2) NOT NULL DEFAULT 0.70,
  "decay_policy"       "DecayPolicy" NOT NULL DEFAULT 'NONE',

  CONSTRAINT "attribute_registry_pkey" PRIMARY KEY ("attribute_key")
);

-- ---------------------------------------------------------------------------
-- C. Observed Claims
-- Immutable source observations. Never updated — only superseded.
-- ---------------------------------------------------------------------------

CREATE TABLE "observed_claims" (
  "claim_id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "entity_id"             TEXT NOT NULL,
  "attribute_key"         TEXT NOT NULL,
  "raw_value"             JSONB NOT NULL,
  "normalized_value"      TEXT,
  "source_id"             TEXT NOT NULL,
  "source_url"            TEXT,
  "observed_at"           TIMESTAMP(3) NOT NULL,
  "extracted_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "extraction_method"     "ExtractionMethod" NOT NULL,
  "confidence"            DECIMAL(4,3),
  "resolution_method"     "ClaimResolutionMethod" NOT NULL,
  "resolution_confidence" DECIMAL(4,3),
  "supersedes_claim_id"   TEXT,
  "is_active"             BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "observed_claims_pkey" PRIMARY KEY ("claim_id"),
  CONSTRAINT "observed_claims_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE,
  CONSTRAINT "observed_claims_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "source_registry"("id"),
  CONSTRAINT "observed_claims_attribute_key_fkey"
    FOREIGN KEY ("attribute_key") REFERENCES "attribute_registry"("attribute_key"),
  CONSTRAINT "observed_claims_supersedes_claim_id_fkey"
    FOREIGN KEY ("supersedes_claim_id") REFERENCES "observed_claims"("claim_id")
);

CREATE INDEX "observed_claims_entity_id_attribute_key_idx"
  ON "observed_claims"("entity_id", "attribute_key");
CREATE INDEX "observed_claims_entity_id_is_active_idx"
  ON "observed_claims"("entity_id", "is_active");
CREATE INDEX "observed_claims_source_id_idx"
  ON "observed_claims"("source_id");
CREATE INDEX "observed_claims_extracted_at_idx"
  ON "observed_claims"("extracted_at");

-- ---------------------------------------------------------------------------
-- D. Canonical Entity State
-- Sanctioned projection: one row per entity, narrow and typed.
-- ---------------------------------------------------------------------------

CREATE TABLE "canonical_entity_state" (
  "entity_id"                TEXT NOT NULL,
  "name"                     TEXT NOT NULL,
  "google_place_id"          TEXT UNIQUE,
  "latitude"                 DECIMAL(10,7),
  "longitude"                DECIMAL(11,7),
  "address"                  TEXT,
  "neighborhood"             TEXT,
  "phone"                    TEXT,
  "website"                  TEXT,
  "instagram"                TEXT,
  "hours_json"               JSONB,
  "price_level"              INTEGER,
  "reservation_url"          TEXT,
  "menu_url"                 TEXT,
  "winelist_url"             TEXT,
  "description"              TEXT,
  "cuisine_type"             TEXT,
  "category"                 TEXT,
  "tips"                     TEXT[] NOT NULL DEFAULT '{}',
  "google_photos"            JSONB,
  "google_places_attributes" JSONB,
  "last_sanctioned_at"       TIMESTAMP(3),
  "sanctioned_by"            TEXT,

  CONSTRAINT "canonical_entity_state_pkey" PRIMARY KEY ("entity_id"),
  CONSTRAINT "canonical_entity_state_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE
);

CREATE INDEX "canonical_entity_state_google_place_id_idx"
  ON "canonical_entity_state"("google_place_id");
CREATE INDEX "canonical_entity_state_neighborhood_idx"
  ON "canonical_entity_state"("neighborhood");

-- ---------------------------------------------------------------------------
-- F. Canonical Sanctions
-- Audit trail: which claim backs which canonical value.
-- Partial unique index enforces one "current" sanction per (entity, attribute).
-- ---------------------------------------------------------------------------

CREATE TABLE "canonical_sanctions" (
  "sanction_id"     TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "entity_id"       TEXT NOT NULL,
  "attribute_key"   TEXT NOT NULL,
  "claim_id"        TEXT NOT NULL,
  "sanctioned_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sanctioned_by"   TEXT NOT NULL,
  "sanction_method" "SanctionMethod" NOT NULL,
  "is_current"      BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "canonical_sanctions_pkey" PRIMARY KEY ("sanction_id"),
  CONSTRAINT "canonical_sanctions_claim_id_fkey"
    FOREIGN KEY ("claim_id") REFERENCES "observed_claims"("claim_id"),
  CONSTRAINT "canonical_sanctions_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "canonical_entity_state"("entity_id") ON DELETE CASCADE
);

CREATE INDEX "canonical_sanctions_entity_id_attribute_key_idx"
  ON "canonical_sanctions"("entity_id", "attribute_key");
CREATE INDEX "canonical_sanctions_claim_id_idx"
  ON "canonical_sanctions"("claim_id");
CREATE INDEX "canonical_sanctions_entity_id_attribute_key_is_current_idx"
  ON "canonical_sanctions"("entity_id", "attribute_key", "is_current");

-- Partial unique index: only one current sanction per (entity, attribute)
CREATE UNIQUE INDEX "canonical_sanctions_one_current_per_attribute"
  ON "canonical_sanctions"("entity_id", "attribute_key")
  WHERE "is_current" = true;

-- ---------------------------------------------------------------------------
-- G. Sanction Conflicts
-- Human-review queue for unresolvable claim conflicts.
-- ---------------------------------------------------------------------------

CREATE TABLE "sanction_conflicts" (
  "conflict_id"       TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "entity_id"         TEXT NOT NULL,
  "attribute_key"     TEXT NOT NULL,
  "claim_ids"         TEXT[] NOT NULL,
  "conflict_reason"   TEXT NOT NULL,
  "status"            "SanctionConflictStatus" NOT NULL DEFAULT 'OPEN',
  "resolved_claim_id" TEXT,
  "resolved_by"       TEXT,
  "resolved_at"       TIMESTAMP(3),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sanction_conflicts_pkey" PRIMARY KEY ("conflict_id")
);

CREATE INDEX "sanction_conflicts_entity_id_status_idx"
  ON "sanction_conflicts"("entity_id", "status");
CREATE INDEX "sanction_conflicts_attribute_key_status_idx"
  ON "sanction_conflicts"("attribute_key", "status");
CREATE INDEX "sanction_conflicts_status_idx"
  ON "sanction_conflicts"("status");

-- ---------------------------------------------------------------------------
-- H. Derived Signals
-- Computed outputs from claims / canonical state. Versioned. Never canonical.
-- ---------------------------------------------------------------------------

CREATE TABLE "derived_signals" (
  "signal_id"       TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "entity_id"       TEXT NOT NULL,
  "signal_key"      TEXT NOT NULL,
  "signal_value"    JSONB NOT NULL,
  "signal_version"  TEXT NOT NULL,
  "input_claim_ids" TEXT[] NOT NULL DEFAULT '{}',
  "computed_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "derived_signals_pkey" PRIMARY KEY ("signal_id"),
  CONSTRAINT "derived_signals_entity_id_signal_key_signal_version_key"
    UNIQUE ("entity_id", "signal_key", "signal_version"),
  CONSTRAINT "derived_signals_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE
);

CREATE INDEX "derived_signals_entity_id_idx" ON "derived_signals"("entity_id");
CREATE INDEX "derived_signals_signal_key_idx" ON "derived_signals"("signal_key");

-- ---------------------------------------------------------------------------
-- I. Interpretation Cache
-- Taglines, pull quotes, SceneSense outputs. Never canonical.
-- ---------------------------------------------------------------------------

CREATE TABLE "interpretation_cache" (
  "cache_id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "entity_id"        TEXT NOT NULL,
  "output_type"      "InterpretationType" NOT NULL,
  "content"          JSONB NOT NULL,
  "prompt_version"   TEXT NOT NULL,
  "model_version"    TEXT,
  "generated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at"       TIMESTAMP(3),
  "input_signal_ids" TEXT[] NOT NULL DEFAULT '{}',
  "is_current"       BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "interpretation_cache_pkey" PRIMARY KEY ("cache_id"),
  CONSTRAINT "interpretation_cache_entity_id_output_type_prompt_version_key"
    UNIQUE ("entity_id", "output_type", "prompt_version"),
  CONSTRAINT "interpretation_cache_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE
);

CREATE INDEX "interpretation_cache_entity_id_idx"
  ON "interpretation_cache"("entity_id");
CREATE INDEX "interpretation_cache_entity_id_output_type_is_current_idx"
  ON "interpretation_cache"("entity_id", "output_type", "is_current");
