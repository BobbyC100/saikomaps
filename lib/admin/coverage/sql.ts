/**
 * Data Coverage Audit — SQL Queries
 *
 * Cohort Definitions (targeting entities table):
 * - All: all active entities (status != 'PERMANENTLY_CLOSED')
 * - OPEN: entities with status = 'OPEN'
 * - CANDIDATE: entities with status = 'CANDIDATE'
 * - Reachable: entities on at least one PUBLISHED list (via map_places → lists)
 *
 * All queries are SELECT-only, designed for <5s execution.
 */

// ============================================================================
// OVERVIEW VIEW
// ============================================================================

export const OVERVIEW_COUNTS_SQL = `
WITH
active_entities AS (
  SELECT p.id, p.status::text as status, p.slug, p.google_place_id, p.neighborhood
  FROM entities p
  WHERE p.status != 'PERMANENTLY_CLOSED'
),
reachable AS (
  SELECT DISTINCT mp.entity_id
  FROM map_places mp
  JOIN lists l ON l.id = mp.map_id
  WHERE l.status = 'PUBLISHED'
)
SELECT
  (SELECT COUNT(*) FROM active_entities) AS total_db,
  (SELECT COUNT(*) FROM active_entities WHERE status = 'OPEN') AS open_count,
  (SELECT COUNT(*) FROM active_entities WHERE status = 'CANDIDATE') AS candidate_count,
  (SELECT COUNT(*) FROM active_entities WHERE slug IS NOT NULL) AS addressable,
  (SELECT COUNT(*) FROM reachable) AS reachable,
  (SELECT COUNT(DISTINCT neighborhood) FROM active_entities WHERE neighborhood IS NOT NULL AND neighborhood != '') AS neighborhoods,
  (SELECT COUNT(*) FROM active_entities WHERE google_place_id IS NOT NULL) AS has_gpid;
`;

// ============================================================================
// TIER COMPLETION (for Overview tier bars)
// ============================================================================

export const TIER_COMPLETION_SQL = `
WITH ae AS (
  SELECT p.*, ces.hours_json AS ces_hours, ces.price_level AS ces_price,
         ces.reservation_url AS ces_res_url, ces.menu_url AS ces_menu_url
  FROM entities p
  LEFT JOIN canonical_entity_state ces ON ces.entity_id = p.id
  WHERE p.status != 'PERMANENTLY_CLOSED'
)
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN slug IS NOT NULL AND name IS NOT NULL AND name != ''
            AND latitude IS NOT NULL AND longitude IS NOT NULL
            AND google_place_id IS NOT NULL THEN 1 ELSE 0 END) AS tier1_complete,
  SUM(CASE WHEN (hours IS NOT NULL OR ces_hours IS NOT NULL)
            AND (phone IS NOT NULL AND phone != '')
            AND (website IS NOT NULL AND website != '') THEN 1 ELSE 0 END) AS tier2_complete,
  SUM(CASE WHEN (instagram IS NOT NULL AND instagram != '')
            AND (neighborhood IS NOT NULL AND neighborhood != '') THEN 1 ELSE 0 END) AS tier3_complete
FROM ae;
`;

// ============================================================================
// ENRICHMENT STAGE DISTRIBUTION (for Pipeline view)
// ============================================================================

export const ENRICHMENT_STAGE_SQL = `
SELECT
  COALESCE(enrichment_stage, 'none') AS stage,
  COUNT(*)::int AS count
FROM entities
WHERE status != 'PERMANENTLY_CLOSED'
GROUP BY enrichment_stage
ORDER BY enrichment_stage NULLS FIRST;
`;

// ============================================================================
// RECENT ENRICHMENT RUNS (for Pipeline view)
// ============================================================================

export const RECENT_RUNS_SQL = `
SELECT
  pcs.id,
  e.name AS entity_name,
  e.slug,
  pcs.last_attempt_status AS run_status,
  pcs.last_attempt_at,
  pcs.source,
  pcs.last_missing_groups
FROM place_coverage_status pcs
JOIN entities e ON e.id = pcs.entity_id
ORDER BY pcs.last_attempt_at DESC NULLS LAST
LIMIT 15;
`;

// ============================================================================
// TIER HEALTH — field-level stats for all tiers (reuse in Tier Health view)
// ============================================================================

export const TIER_FIELD_STATS_SQL = `
WITH ae AS (
  SELECT p.*, ces.hours_json AS ces_hours, ces.price_level AS ces_price,
         ces.reservation_url AS ces_res_url, ces.menu_url AS ces_menu_url
  FROM entities p
  LEFT JOIN canonical_entity_state ces ON ces.entity_id = p.id
  WHERE p.status != 'PERMANENTLY_CLOSED'
),
total AS (SELECT COUNT(*) AS cnt FROM ae)
SELECT * FROM (
  -- Tier 1
  SELECT 1 AS tier, 'slug' AS field,
    SUM(CASE WHEN slug IS NOT NULL THEN 1 ELSE 0 END)::int AS has,
    SUM(CASE WHEN slug IS NULL THEN 1 ELSE 0 END)::int AS missing,
    (SELECT cnt FROM total)::int AS total FROM ae
  UNION ALL
  SELECT 1, 'name',
    SUM(CASE WHEN name IS NOT NULL AND name != '' THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN name IS NULL OR name = '' THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  SELECT 1, 'latlng',
    SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  SELECT 1, 'google_place_id',
    SUM(CASE WHEN google_place_id IS NOT NULL THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN google_place_id IS NULL THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  -- Tier 2
  SELECT 2, 'hours',
    SUM(CASE WHEN hours IS NOT NULL OR ces_hours IS NOT NULL THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN hours IS NULL AND ces_hours IS NULL THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  SELECT 2, 'phone',
    SUM(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN phone IS NULL OR phone = '' THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  SELECT 2, 'website',
    SUM(CASE WHEN website IS NOT NULL AND website != '' THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN website IS NULL OR website = '' THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  SELECT 2, 'price_level',
    SUM(CASE WHEN price_level IS NOT NULL OR ces_price IS NOT NULL THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN price_level IS NULL AND ces_price IS NULL THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  SELECT 2, 'menu_url',
    SUM(CASE WHEN ces_menu_url IS NOT NULL AND ces_menu_url != '' THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN ces_menu_url IS NULL OR ces_menu_url = '' THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  SELECT 2, 'reservation_url',
    SUM(CASE WHEN reservation_url IS NOT NULL AND reservation_url != '' OR ces_res_url IS NOT NULL AND ces_res_url != '' THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN (reservation_url IS NULL OR reservation_url = '') AND (ces_res_url IS NULL OR ces_res_url = '') THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  -- Tier 3
  SELECT 3, 'instagram',
    SUM(CASE WHEN instagram IS NOT NULL AND instagram != '' THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN instagram IS NULL OR instagram = '' THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  SELECT 3, 'neighborhood',
    SUM(CASE WHEN neighborhood IS NOT NULL AND neighborhood != '' THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN neighborhood IS NULL OR neighborhood = '' THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
  UNION ALL
  SELECT 3, 'description',
    SUM(CASE WHEN description IS NOT NULL AND description != '' THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN description IS NULL OR description = '' THEN 1 ELSE 0 END)::int,
    (SELECT cnt FROM total)::int FROM ae
) sub
ORDER BY tier, missing DESC;
`;

// ============================================================================
// RED FLAG ENTITIES — Tier 1 failures (top 50 per tier for drill-down)
// ============================================================================

export const TIER1_ISSUES_SQL = `
SELECT
  id, slug, name, status::text as entity_status,
  COALESCE(NULLIF(neighborhood,''), 'Unknown') AS neighborhood,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN slug IS NULL THEN 'missing_slug' END,
    CASE WHEN name IS NULL OR name = '' THEN 'missing_name' END,
    CASE WHEN latitude IS NULL OR longitude IS NULL THEN 'missing_latlng' END,
    CASE WHEN google_place_id IS NULL THEN 'missing_gpid' END
  ], NULL) AS issues
FROM entities
WHERE status != 'PERMANENTLY_CLOSED'
  AND (slug IS NULL OR name IS NULL OR name = '' OR latitude IS NULL OR longitude IS NULL OR google_place_id IS NULL)
ORDER BY
  (CASE WHEN slug IS NULL THEN 1 ELSE 0 END +
   CASE WHEN name IS NULL OR name = '' THEN 1 ELSE 0 END +
   CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END +
   CASE WHEN google_place_id IS NULL THEN 1 ELSE 0 END) DESC
LIMIT 50;
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
// MISSING FIELDS VIEW — All entities (not just Reachable)
// ============================================================================

export const ALL_MISSING_FIELDS_SQL = `
WITH r AS (
  SELECT p.*
  FROM entities p
  WHERE p.status != 'PERMANENTLY_CLOSED'
)
SELECT 'slug'            AS field, COUNT(*) AS missing, (SELECT COUNT(*) FROM r) AS total FROM r WHERE r.slug IS NULL
UNION ALL
SELECT 'name'            AS field, COUNT(*) AS missing, (SELECT COUNT(*) FROM r) AS total FROM r WHERE r.name IS NULL OR r.name = ''
UNION ALL
SELECT 'latlng'          AS field, COUNT(*) AS missing, (SELECT COUNT(*) FROM r) AS total FROM r WHERE r.latitude IS NULL OR r.longitude IS NULL
UNION ALL
SELECT 'google_place_id' AS field, COUNT(*) AS missing, (SELECT COUNT(*) FROM r) AS total FROM r WHERE r.google_place_id IS NULL
UNION ALL
SELECT 'hours'           AS field, COUNT(*) AS missing, (SELECT COUNT(*) FROM r) AS total FROM r WHERE r.hours IS NULL
UNION ALL
SELECT 'phone'           AS field, COUNT(*) AS missing, (SELECT COUNT(*) FROM r) AS total FROM r WHERE r.phone IS NULL OR r.phone = ''
UNION ALL
SELECT 'website'         AS field, COUNT(*) AS missing, (SELECT COUNT(*) FROM r) AS total FROM r WHERE r.website IS NULL OR r.website = ''
UNION ALL
SELECT 'instagram'       AS field, COUNT(*) AS missing, (SELECT COUNT(*) FROM r) AS total FROM r WHERE r.instagram IS NULL OR r.instagram = ''
UNION ALL
SELECT 'neighborhood'    AS field, COUNT(*) AS missing, (SELECT COUNT(*) FROM r) AS total FROM r WHERE r.neighborhood IS NULL OR r.neighborhood = ''
ORDER BY missing DESC;
`;

// Keep old name for backwards compat
export const REACHABLE_MISSING_FIELDS_SQL = ALL_MISSING_FIELDS_SQL;

// ============================================================================
// NEIGHBORHOODS VIEW — All entities
// ============================================================================

export const ALL_NEIGHBORHOOD_SCORECARD_SQL = `
WITH r AS (
  SELECT
    p.id,
    COALESCE(NULLIF(p.neighborhood,''), 'Unknown') AS neighborhood,
    p.slug, p.name, p.latitude, p.longitude, p.google_place_id,
    p.hours, p.phone, p.website, p.status::text as entity_status
  FROM entities p
  WHERE p.status != 'PERMANENTLY_CLOSED'
),
agg AS (
  SELECT
    neighborhood,
    COUNT(*) AS entities,
    SUM(CASE WHEN entity_status = 'OPEN' THEN 1 ELSE 0 END) AS open_count,
    SUM(CASE WHEN entity_status = 'CANDIDATE' THEN 1 ELSE 0 END) AS candidate_count,
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
WHERE entities >= 3
ORDER BY (tier1_complete::float / entities) ASC, entities DESC;
`;

export const REACHABLE_NEIGHBORHOOD_SCORECARD_SQL = ALL_NEIGHBORHOOD_SCORECARD_SQL;

// ============================================================================
// RED FLAGS VIEW — All entities missing Tier 1 fields
// ============================================================================

export const ALL_REDFLAGS_SQL = `
WITH r AS (
  SELECT p.*
  FROM entities p
  WHERE p.status != 'PERMANENTLY_CLOSED'
)
SELECT
  id,
  slug,
  name,
  status::text as entity_status,
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

export const REACHABLE_REDFLAGS_SQL = ALL_REDFLAGS_SQL;

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
