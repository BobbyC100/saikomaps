-- Coverage sources: editorial links per entity (v1)
CREATE TABLE "coverage_sources" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "excerpt" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_sources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "coverage_sources_entity_id_idx" ON "coverage_sources"("entity_id");
CREATE UNIQUE INDEX "coverage_sources_entity_id_url_key" ON "coverage_sources"("entity_id", "url");

ALTER TABLE "coverage_sources" ADD CONSTRAINT "coverage_sources_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
