-- Backfill places.primary_vertical from places.category (normalize drift).
-- Run after migration add_primary_vertical is applied.
-- Usage: psql "$DATABASE_URL" -f scripts/backfill-primary-vertical.sql

BEGIN;

UPDATE places
SET primary_vertical = CASE
  WHEN lower(trim(category)) IN ('eat','restaurant') THEN 'EAT'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'coffee' THEN 'COFFEE'::"PrimaryVertical"
  WHEN lower(trim(category)) IN ('wine','wine bar','wine shop') THEN 'WINE'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'drinks' THEN 'DRINKS'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'shop' THEN 'SHOP'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'culture' THEN 'CULTURE'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'nature' THEN 'NATURE'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'stay' THEN 'STAY'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'wellness' THEN 'WELLNESS'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'bakery' THEN 'BAKERY'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'purveyors' THEN 'PURVEYORS'::"PrimaryVertical"
  WHEN lower(trim(category)) = 'activity' THEN 'ACTIVITY'::"PrimaryVertical"
  ELSE NULL
END;

-- Audit: unmapped category values (goal: 0 or intentionally unknown)
SELECT category, COUNT(*) AS cnt
FROM places
WHERE primary_vertical IS NULL
GROUP BY category
ORDER BY COUNT(*) DESC;

COMMIT;
