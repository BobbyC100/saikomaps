-- Add event program canonical fields to canonical_entity_state
ALTER TABLE "canonical_entity_state" ADD COLUMN "events_url" TEXT;
ALTER TABLE "canonical_entity_state" ADD COLUMN "catering_url" TEXT;
ALTER TABLE "canonical_entity_state" ADD COLUMN "event_inquiry_email" TEXT;
ALTER TABLE "canonical_entity_state" ADD COLUMN "event_inquiry_form_url" TEXT;
