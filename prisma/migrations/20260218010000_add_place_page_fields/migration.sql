-- Add place page fields for Status cell, Editorial cell, and vibe tag display
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "transit_accessible" BOOLEAN;
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "thematic_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "contextual_connection" TEXT;
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "curator_attribution" TEXT;
