-- Rename place_id to entity_id in signals + overlays (identity-level cleanup)
-- Scope: proposed_signals, operational_overlays only. Reversible.

-- proposed_signals
ALTER TABLE "proposed_signals" RENAME COLUMN "place_id" TO "entity_id";
ALTER INDEX "proposed_signals_place_id_idx" RENAME TO "proposed_signals_entity_id_idx";

-- operational_overlays
ALTER TABLE "operational_overlays" RENAME COLUMN "place_id" TO "entity_id";
ALTER INDEX "operational_overlays_place_id_idx" RENAME TO "operational_overlays_entity_id_idx";
