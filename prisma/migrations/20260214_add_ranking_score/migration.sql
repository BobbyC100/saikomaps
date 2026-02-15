-- Add ranking score fields to places table
ALTER TABLE "places" ADD COLUMN "ranking_score" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "places" ADD COLUMN "last_score_update" TIMESTAMP(3);

-- Create index for efficient ranking queries
CREATE INDEX "places_ranking_score_idx" ON "places"("ranking_score" DESC);
