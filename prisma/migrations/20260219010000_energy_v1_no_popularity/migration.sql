-- Energy v1: no popularity (Option A)
-- popular_times NOT available from Google Places API.
-- Confidence weights: language 0.50, flags 0.30, sensory 0.20.

UPDATE "energy_versions"
SET "weights" = '{"language":0.50,"flags":0.30,"sensory":0.20,"popularity":0}'
WHERE "version" = 'energy_v1';
