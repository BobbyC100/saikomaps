-- Add prl_override to places (1-4 manual override; display PRL = override ?? computed)
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "prl_override" INTEGER;
