-- Audit unmapped category values after backfill.
-- Usage: psql "$DATABASE_URL" -f scripts/audit-unmapped-primary-vertical.sql

SELECT category, COUNT(*) AS cnt
FROM places
WHERE primary_vertical IS NULL
GROUP BY category
ORDER BY COUNT(*) DESC;
