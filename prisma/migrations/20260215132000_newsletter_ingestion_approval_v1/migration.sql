-- Newsletter Ingestion Approval Framework v1
-- Adds two-table hybrid for operator-derived operational deltas

-- Create enums
CREATE TYPE "SignalSourceType" AS ENUM ('newsletter_email');
CREATE TYPE "ProposedSignalType" AS ENUM ('closure', 'hours_override', 'event', 'recurring_program', 'uncertainty');
CREATE TYPE "ProposedSignalStatus" AS ENUM ('proposed', 'approved', 'rejected', 'superseded');
CREATE TYPE "OverlayType" AS ENUM ('closure', 'hours_override', 'event', 'uncertainty');
CREATE TYPE "OverlayApprovalMethod" AS ENUM ('manual');

-- Create proposed_signals table
CREATE TABLE "proposed_signals" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "source_type" "SignalSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "signal_type" "ProposedSignalType" NOT NULL,
    "extracted_data" JSONB NOT NULL,
    "confidence_score" DOUBLE PRECISION,
    "evidence_excerpt" TEXT,
    "status" "ProposedSignalStatus" NOT NULL DEFAULT 'proposed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposed_signals_pkey" PRIMARY KEY ("id")
);

-- Create operational_overlays table
CREATE TABLE "operational_overlays" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "source_signal_id" TEXT NOT NULL,
    "overlay_type" "OverlayType" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "override_data" JSONB,
    "approval_method" "OverlayApprovalMethod" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_overlays_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on source_signal_id
CREATE UNIQUE INDEX "operational_overlays_source_signal_id_key" ON "operational_overlays"("source_signal_id");

-- Create indexes for proposed_signals
CREATE INDEX "proposed_signals_place_id_idx" ON "proposed_signals"("place_id");
CREATE INDEX "proposed_signals_status_idx" ON "proposed_signals"("status");
CREATE INDEX "proposed_signals_signal_type_idx" ON "proposed_signals"("signal_type");
CREATE INDEX "proposed_signals_created_at_idx" ON "proposed_signals"("created_at");

-- Create indexes for operational_overlays
CREATE INDEX "operational_overlays_place_id_idx" ON "operational_overlays"("place_id");
CREATE INDEX "operational_overlays_starts_at_idx" ON "operational_overlays"("starts_at");
CREATE INDEX "operational_overlays_ends_at_idx" ON "operational_overlays"("ends_at");

-- Add foreign key constraint
ALTER TABLE "operational_overlays" ADD CONSTRAINT "operational_overlays_source_signal_id_fkey" 
    FOREIGN KEY ("source_signal_id") REFERENCES "proposed_signals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
