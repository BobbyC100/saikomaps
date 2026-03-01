/**
 * Data Coverage Audit — SQL Queries
 * 
 * Cohort Definitions (targeting entities table):
 * - Reachable: entities on at least one PUBLISHED list (via map_places → lists)
 * - Addressable: active entities with slug
 * - Total DB: all active entities (status != 'PERMANENTLY_CLOSED')
 * 
 * All queries are SELECT-only, designed for <5s execution.
 */

// ============================================================================
// OVERVIEW VIEW
// ============================================================================

export const OVERVIEW_COUNTS_SQL = `
WITH
active_entities AS (
  SELECT p.id
  FROM entities p
  WHERE p.status != 'PERMANENTLY_CLOSED'
),
reachable AS (
  SELECT DISTINCT mp.entity_id
  FROM map_places mp
  JOIN lists l ON l.id = mp.map_id
  WHERE l.status = 'PUBLISHED'
),
addressable AS (
  SELECT p.id
  FROM entities p
  WHERE p.status != 'PERMANENTLY_CLOSED'
    AND p.slug IS NOT NULL
)
SELECT
  (SELECT COUNT(*) FROM active_entities) AS total_db,
  (SELECT COUNT(*) FROM addressable) AS addressable,
  (SELECT COUNT(*) FROM reachable) AS reachable,
  ((SELECT COUNT(*) FROM addressable) - (SELECT COUNT(*) FROM reachable)) AS dark_inventory;
`;

export const REACHABLE_NOT_ACTIVE_SANITY_SQL = `
SELECT COUNT(*) AS reachable_not_active
FROM (
  SELECT DISTINCT mp.entity_id
  FROM map_places mp
  JOIN lists l ON l.id = mp.map_id
  WHERE l.status = 'PUBLISHED'
) r
LEFT JOIN entities p ON p.id = r.entity_id
WHERE p.id IS NULL OR p.status = 'PERMANENTLY_CLOSED';
`;

// ============================================================================
// MISSING FIELDS VIEW (Reachable cohort only)
// ============================================================================

export const REACHABLE_MISSING_FIELDS_SQL = `
WITH reachable AS (
  SELECT DISTINCT mp.entity_id
  FROM map_places mp
  JOIN lists l ON l.id = mp.map_id
  WHERE l.status = 'PUBLISHED'
),
r AS (
  SELECT p.*
  FROM entities p
  JOIN reachable rc ON rc.entity_id = p.id
  WHERE p.status != 'PERMANENTLY_CLOSED'
)
SELECT 'slug'            AS field, COUNT(*) AS missing FROM r WHERE r.slug IS NULL
UNION ALL
SELECT 'name'            AS field, COUNT(*) AS missing FROM r WHERE r.name IS NULL OR r.name = ''
UNION ALL
SELECT 'latlng'          AS field, COUNT(*) AS missing FROM r WHERE r.latitude IS NULL OR r.longitude IS NULL
UNION ALL
SELECT 'google_place_id' AS field, COUNT(*) AS missing FROM r WHERE r.google_place_id IS NULL
UNION ALL
SELECT 'hours'           AS field, COUNT(*) AS missing FROM r WHERE r.hours IS NULL
UNION ALL
SELECT 'phone'           AS field, COUNT(*) AS missing FROM r WHERE r.phone IS NULL OR r.phone = ''
UNION ALL
SELECT 'website'         AS field, COUNT(*) AS missing FROM r WHERE r.website IS NULL OR r.website = ''
UNION ALL
SELECT 'instagram'       AS field, COUNT(*) AS missing FROM r WHERE r.instagram IS NULL OR r.instagram = ''
UNION ALL
SELECT 'neighborhood'    AS field, COUNT(*) AS missing FROM r WHERE r.neighborhood IS NULL OR r.neighborhood = ''
ORDER BY missing DESC;
`;

// ============================================================================
// NEIGHBORHOODS VIEW (Reachable quality ranking)
// ============================================================================

export const REACHABLE_NEIGHBORHOOD_SCORECARD_SQL = `
WITH reachable AS (
  SELECT DISTINCT mp.entity_id
  FROM map_places mp
  JOIN lists l ON l.id = mp.map_id
  WHERE l.status = 'PUBLISHED'
),
r AS (
  SELECT
    p.id,
    COALESCE(NULLIF(p.neighborhood,''), 'Unknown') AS neighborhood,
    p.slug, p.name, p.latitude, p.longitude, p.google_place_id,
    p.hours, p.phone, p.website
  FROM entities p
  JOIN reachable rc ON rc.entity_id = p.id
  WHERE p.status != 'PERMANENTLY_CLOSED'
),
agg AS (
  SELECT
    neighborhood,
    COUNT(*) AS entities,
    SUM(CASE WHEN slug IS NOT NULL THEN 1 ELSE 0 END) AS has_slug,
    SUM(CASE WHEN name IS NOT NULL AND name <> '' THEN 1 ELSE 0 END) AS has_name,
    SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS has_latlng,
    SUM(CASE WHEN google_place_id IS NOT NULL THEN 1 ELSE 0 END) AS has_google_id,
    SUM(CASE WHEN hours IS NOT NULL THEN 1 ELSE 0 END) AS has_hours,
    SUM(CASE WHEN phone IS NOT NULL AND phone <> '' THEN 1 ELSE 0 END) AS has_phone,
    SUM(CASE WHEN website IS NOT NULL AND website <> '' THEN 1 ELSE 0 END) AS has_website,
    SUM(
      CASE
        WHEN slug IS NOT NULL
         AND name IS NOT NULL AND name <> ''
         AND latitude IS NOT NULL AND longitude IS NOT NULL
         AND google_place_id IS NOT NULL
        THEN 1 ELSE 0 END
    ) AS tier1_complete
  FROM r
  GROUP BY neighborhood
)
SELECT *
FROM agg
WHERE entities >= 5
ORDER BY (tier1_complete::float / entities) ASC, entities DESC;
`;

// ============================================================================
// RED FLAGS VIEW (Reachable Tier-1 failures)
// ============================================================================

export const REACHABLE_REDFLAGS_SQL = `
WITH reachable AS (
  SELECT DISTINCT mp.entity_id
  FROM map_places mp
  JOIN lists l ON l.id = mp.map_id
  WHERE l.status = 'PUBLISHED'
),
r AS (
  SELECT p.*
  FROM entities p
  JOIN reachable rc ON rc.entity_id = p.id
  WHERE p.status != 'PERMANENTLY_CLOSED'
)
SELECT
  id,
  slug,
  name,
  COALESCE(NULLIF(neighborhood,''), 'Unknown') AS neighborhood,
  latitude,
  longitude,
  google_place_id,
  (
    CASE WHEN slug IS NULL THEN 1 ELSE 0 END +
    CASE WHEN name IS NULL OR name = '' THEN 1 ELSE 0 END +
    CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END +
    CASE WHEN google_place_id IS NULL THEN 1 ELSE 0 END
  ) AS severity,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN slug IS NULL THEN 'missing_slug' END,
    CASE WHEN name IS NULL OR name = '' THEN 'missing_name' END,
    CASE WHEN latitude IS NULL OR longitude IS NULL THEN 'missing_latlng' END,
    CASE WHEN google_place_id IS NULL THEN 'missing_google_place_id' END
  ], NULL) AS reasons
FROM r
WHERE
  slug IS NULL
  OR name IS NULL OR name = ''
  OR latitude IS NULL OR longitude IS NULL
  OR google_place_id IS NULL
ORDER BY severity DESC
LIMIT 200;
`;

// ============================================================================
// FIELD BREAKDOWN VIEW (Cross-cohort comparison)
// ============================================================================

export const FIELDS_BREAKDOWN_REACHABLE_SQL = `
WITH cohort AS (
  SELECT p.*
  FROM entities p
  JOIN (
    SELECT DISTINCT mp.entity_id
    FROM map_places mp
    JOIN lists l ON l.id = mp.map_id
    WHERE l.status = 'PUBLISHED'
  ) rc ON rc.entity_id = p.id
  WHERE p.status != 'PERMANENTLY_CLOSED'
)
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN slug IS NOT NULL THEN 1 ELSE 0 END) AS has_slug,
  SUM(CASE WHEN name IS NOT NULL AND name <> '' THEN 1 ELSE 0 END) AS has_name,
  SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS has_latlng,
  SUM(CASE WHEN google_place_id IS NOT NULL THEN 1 ELSE 0 END) AS has_google_id,
  SUM(CASE WHEN hours IS NOT NULL THEN 1 ELSE 0 END) AS has_hours,
  SUM(CASE WHEN phone IS NOT NULL AND phone <> '' THEN 1 ELSE 0 END) AS has_phone,
  SUM(CASE WHEN website IS NOT NULL AND website <> '' THEN 1 ELSE 0 END) AS has_website,
  SUM(CASE WHEN instagram IS NOT NULL AND instagram <> '' THEN 1 ELSE 0 END) AS has_instagram,
  SUM(CASE WHEN neighborhood IS NOT NULL AND neighborhood <> '' THEN 1 ELSE 0 END) AS has_neighborhood
FROM cohort;
`;

export const FIELDS_BREAKDOWN_ADDRESSABLE_SQL = `
WITH cohort AS (
  SELECT p.*
  FROM entities p
  WHERE p.status != 'PERMANENTLY_CLOSED'
    AND p.slug IS NOT NULL
)
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN slug IS NOT NULL THEN 1 ELSE 0 END) AS has_slug,
  SUM(CASE WHEN name IS NOT NULL AND name <> '' THEN 1 ELSE 0 END) AS has_name,
  SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS has_latlng,
  SUM(CASE WHEN google_place_id IS NOT NULL THEN 1 ELSE 0 END) AS has_google_id,
  SUM(CASE WHEN hours IS NOT NULL THEN 1 ELSE 0 END) AS has_hours,
  SUM(CASE WHEN phone IS NOT NULL AND phone <> '' THEN 1 ELSE 0 END) AS has_phone,
  SUM(CASE WHEN website IS NOT NULL AND website <> '' THEN 1 ELSE 0 END) AS has_website,
  SUM(CASE WHEN instagram IS NOT NULL AND instagram <> '' THEN 1 ELSE 0 END) AS has_instagram,
  SUM(CASE WHEN neighborhood IS NOT NULL AND neighborhood <> '' THEN 1 ELSE 0 END) AS has_neighborhood
FROM cohort;
`;

export const FIELDS_BREAKDOWN_TOTALDB_SQL = `
WITH cohort AS (
  SELECT p.*
  FROM entities p
  WHERE p.status != 'PERMANENTLY_CLOSED'
)
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN slug IS NOT NULL THEN 1 ELSE 0 END) AS has_slug,
  SUM(CASE WHEN name IS NOT NULL AND name <> '' THEN 1 ELSE 0 END) AS has_name,
  SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS has_latlng,
  SUM(CASE WHEN google_place_id IS NOT NULL THEN 1 ELSE 0 END) AS has_google_id,
  SUM(CASE WHEN hours IS NOT NULL THEN 1 ELSE 0 END) AS has_hours,
  SUM(CASE WHEN phone IS NOT NULL AND phone <> '' THEN 1 ELSE 0 END) AS has_phone,
  SUM(CASE WHEN website IS NOT NULL AND website <> '' THEN 1 ELSE 0 END) AS has_website,
  SUM(CASE WHEN instagram IS NOT NULL AND instagram <> '' THEN 1 ELSE 0 END) AS has_instagram,
  SUM(CASE WHEN neighborhood IS NOT NULL AND neighborhood <> '' THEN 1 ELSE 0 END) AS has_neighborhood
FROM cohort;
`;
