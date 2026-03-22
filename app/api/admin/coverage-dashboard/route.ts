/**
 * Coverage Dashboard v2 API
 * GET /api/admin/coverage-dashboard
 *
 * Returns data for three dashboard sections (coverage-dashboard-v2-spec.md):
 *   1. Gaps & Recommended Actions — what needs attention, with enrichment strategy awareness
 *   2. Neighborhood Overview — per-neighborhood completeness with bucket breakdowns
 *   3. System Summary — counts by the three entity state axes + recent activity
 *
 * Uses the Entity State Model v1 fields (operatingStatus, enrichmentStatus, publicationStatus)
 * alongside the existing three-bucket completeness model (Identity, Access, Offering).
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      totalEntities,
      // Entity State Model v1: counts by the three independent state axes
      operatingStatusCounts,
      enrichmentStatusCounts,
      publicationStatusCounts,
      // Neighborhood overview with bucket-level completeness
      neighborhoodData,
      // Gaps data: missing fields with counts
      gapsData,
      // Recent activity (last 7 days)
      recentActivity,
    ] = await Promise.all([
      // Total entities (all statuses, for header context)
      db.$queryRaw<{ total: number; published: number; ingested: number }[]>`
        SELECT
          COUNT(*)::int AS total,
          COUNT(CASE WHEN e.publication_status = 'PUBLISHED' THEN 1 END)::int AS published,
          COUNT(CASE WHEN e.enrichment_status = 'INGESTED' THEN 1 END)::int AS ingested
        FROM entities e
        WHERE e.status != 'PERMANENTLY_CLOSED'
      `,

      // Operating status distribution
      db.$queryRaw<{ status: string | null; count: number }[]>`
        SELECT operating_status::text AS status, COUNT(*)::int AS count
        FROM entities
        WHERE status != 'PERMANENTLY_CLOSED'
        GROUP BY operating_status
        ORDER BY count DESC
      `,

      // Enrichment status distribution
      db.$queryRaw<{ status: string | null; count: number }[]>`
        SELECT enrichment_status::text AS status, COUNT(*)::int AS count
        FROM entities
        WHERE status != 'PERMANENTLY_CLOSED'
        GROUP BY enrichment_status
        ORDER BY count DESC
      `,

      // Publication status distribution
      db.$queryRaw<{ status: string | null; count: number }[]>`
        SELECT publication_status::text AS status, COUNT(*)::int AS count
        FROM entities
        WHERE status != 'PERMANENTLY_CLOSED'
        GROUP BY publication_status
        ORDER BY count DESC
      `,

      // Neighborhood overview with bucket-level completeness and vertical distribution
      // Uses the EXISTING identity/access/offering SQL logic from the v1 funnel query,
      // but grouped per neighborhood instead of globally.
      db.$queryRaw<{
        neighborhood: string;
        total: number;
        published: number;
        identity_complete: number;
        access_complete: number;
        offering_complete: number;
        verticals: string; // JSON object: { "EAT": 5, "COFFEE": 3, ... }
      }[]>`
        WITH hood_entities AS (
          SELECT e.*,
            COALESCE(LOWER(TRIM(e.neighborhood)), 'unknown') AS hood
          FROM entities e
          WHERE e.status != 'PERMANENTLY_CLOSED' AND e.status != 'CANDIDATE'
        ),
        hood_verticals AS (
          SELECT hood,
            json_object_agg(COALESCE(primary_vertical::text, 'UNKNOWN'), cnt) AS verticals
          FROM (
            SELECT hood, primary_vertical, COUNT(*)::int AS cnt
            FROM hood_entities
            GROUP BY hood, primary_vertical
          ) sub
          GROUP BY hood
        )
        SELECT
          he.hood AS neighborhood,
          COUNT(*)::int AS total,
          COUNT(CASE WHEN he.publication_status = 'PUBLISHED' THEN 1 END)::int AS published,

          -- Identity: GPID OR weighted anchors >= 4
          COUNT(CASE WHEN he.google_place_id IS NOT NULL
            OR (
              (CASE WHEN he.website IS NOT NULL THEN 3 ELSE 0 END) +
              (CASE WHEN he.instagram IS NOT NULL THEN 2 ELSE 0 END) +
              (CASE WHEN he.tiktok IS NOT NULL THEN 2 ELSE 0 END) +
              (CASE WHEN he.phone IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN he.neighborhood IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN he.latitude IS NOT NULL AND he.longitude IS NOT NULL THEN 2 ELSE 0 END)
            ) >= 4
          THEN 1 END)::int AS identity_complete,

          -- Access: vertical-aware (enrichment-model-v1.md section 4)
          COUNT(CASE
            WHEN he.primary_vertical IN ('EAT','DRINKS','BAKERY','COFFEE','WINE') AND
              (he.website IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.website IS NOT NULL)) AND
              (he.phone IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.phone IS NOT NULL)) AND
              (he.hours IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.hours_json IS NOT NULL)) AND
              (he.instagram IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.instagram IS NOT NULL)) AND
              (he.reservation_url IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.reservation_url IS NOT NULL))
            THEN 1
            WHEN he.primary_vertical = 'CULTURE' AND
              (he.website IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.website IS NOT NULL)) AND
              (he.hours IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.hours_json IS NOT NULL)) AND
              (he.instagram IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.instagram IS NOT NULL))
            THEN 1
            WHEN he.primary_vertical = 'SHOP' AND
              (he.website IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.website IS NOT NULL)) AND
              (he.hours IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.hours_json IS NOT NULL)) AND
              (he.phone IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.phone IS NOT NULL)) AND
              (he.instagram IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.instagram IS NOT NULL))
            THEN 1
            WHEN he.primary_vertical IN ('ACTIVITY','PARKS') AND
              (he.website IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.website IS NOT NULL))
            THEN 1
            WHEN he.primary_vertical = 'NATURE' THEN 1
            WHEN he.primary_vertical IN ('STAY','WELLNESS','PURVEYORS') AND
              (he.website IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.website IS NOT NULL)) AND
              (he.hours IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.hours_json IS NOT NULL)) AND
              (he.phone IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.phone IS NOT NULL)) AND
              (he.instagram IS NOT NULL OR EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.instagram IS NOT NULL))
            THEN 1
          END)::int AS access_complete,

          -- Offering: vertical-aware
          COUNT(CASE
            WHEN he.primary_vertical IN ('EAT','DRINKS','BAKERY','COFFEE','WINE') AND
              EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = he.id AND ces.menu_url IS NOT NULL) AND
              EXISTS (SELECT 1 FROM derived_signals ds WHERE ds.entity_id = he.id AND ds.signal_key = 'offering_programs') AND
              EXISTS (SELECT 1 FROM interpretation_cache ic WHERE ic.entity_id = he.id AND ic.output_type = 'SCENESENSE_PRL' AND ic.is_current = true) AND
              EXISTS (SELECT 1 FROM coverage_sources cs WHERE cs.entity_id = he.id)
            THEN 1
            WHEN he.primary_vertical IN ('CULTURE','SHOP','ACTIVITY','PARKS') AND
              EXISTS (SELECT 1 FROM interpretation_cache ic WHERE ic.entity_id = he.id AND ic.output_type = 'SCENESENSE_PRL' AND ic.is_current = true) AND
              EXISTS (SELECT 1 FROM coverage_sources cs WHERE cs.entity_id = he.id)
            THEN 1
            WHEN he.primary_vertical = 'NATURE' AND
              EXISTS (SELECT 1 FROM interpretation_cache ic WHERE ic.entity_id = he.id AND ic.output_type = 'SCENESENSE_PRL' AND ic.is_current = true)
            THEN 1
            WHEN he.primary_vertical IN ('STAY','WELLNESS','PURVEYORS') AND
              EXISTS (SELECT 1 FROM interpretation_cache ic WHERE ic.entity_id = he.id AND ic.output_type = 'SCENESENSE_PRL' AND ic.is_current = true) AND
              EXISTS (SELECT 1 FROM coverage_sources cs WHERE cs.entity_id = he.id)
            THEN 1
          END)::int AS offering_complete,

          COALESCE(hv.verticals::text, '{}') AS verticals

        FROM hood_entities he
        LEFT JOIN hood_verticals hv ON hv.hood = he.hood
        GROUP BY he.hood, hv.verticals
        HAVING COUNT(*) >= 2
        ORDER BY COUNT(*) DESC
      `,

      // Gaps: count entities missing key fields, annotated with enrichment strategy info
      db.$queryRaw<{
        gap_type: string;
        bucket: string;
        entity_count: number;
        neighborhoods: string;
      }[]>`
        WITH active_entities AS (
          SELECT e.*
          FROM entities e
          WHERE e.status != 'PERMANENTLY_CLOSED' AND e.status != 'CANDIDATE'
        )
        -- Identity bucket gaps
        SELECT 'missing_gpid' AS gap_type, 'identity' AS bucket,
          COUNT(*)::int AS entity_count,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]') AS neighborhoods
        FROM active_entities WHERE google_place_id IS NULL

        UNION ALL
        SELECT 'missing_coords', 'identity',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities WHERE latitude IS NULL OR longitude IS NULL

        UNION ALL
        SELECT 'missing_website', 'identity',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities
        WHERE website IS NULL
          AND NOT EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = active_entities.id AND ces.website IS NOT NULL)

        UNION ALL
        -- Access bucket gaps
        SELECT 'missing_hours', 'access',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities
        WHERE hours IS NULL
          AND NOT EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = active_entities.id AND ces.hours_json IS NOT NULL)
          AND primary_vertical NOT IN ('NATURE')

        UNION ALL
        SELECT 'missing_phone', 'access',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities
        WHERE phone IS NULL
          AND NOT EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = active_entities.id AND ces.phone IS NOT NULL)
          AND primary_vertical IN ('EAT','DRINKS','BAKERY','COFFEE','WINE','SHOP','STAY','WELLNESS','PURVEYORS')

        UNION ALL
        SELECT 'missing_instagram', 'access',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities
        WHERE instagram IS NULL
          AND NOT EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = active_entities.id AND ces.instagram IS NOT NULL)
          AND primary_vertical NOT IN ('NATURE','ACTIVITY','PARKS')

        UNION ALL
        SELECT 'missing_reservation_url', 'access',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities
        WHERE reservation_url IS NULL
          AND NOT EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = active_entities.id AND ces.reservation_url IS NOT NULL)
          AND primary_vertical IN ('EAT','DRINKS','BAKERY','COFFEE','WINE')

        UNION ALL
        -- Offering bucket gaps
        SELECT 'missing_menu', 'offering',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities
        WHERE primary_vertical IN ('EAT','DRINKS','BAKERY','COFFEE','WINE')
          AND NOT EXISTS (SELECT 1 FROM canonical_entity_state ces WHERE ces.entity_id = active_entities.id AND ces.menu_url IS NOT NULL)

        UNION ALL
        SELECT 'missing_scenesense', 'offering',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities
        WHERE NOT EXISTS (
          SELECT 1 FROM interpretation_cache ic
          WHERE ic.entity_id = active_entities.id AND ic.output_type = 'SCENESENSE_PRL' AND ic.is_current = true
        )

        UNION ALL
        SELECT 'missing_editorial', 'offering',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities
        WHERE primary_vertical NOT IN ('NATURE')
          AND NOT EXISTS (SELECT 1 FROM coverage_sources cs WHERE cs.entity_id = active_entities.id)

        UNION ALL
        SELECT 'missing_offering_programs', 'offering',
          COUNT(*)::int,
          COALESCE(json_agg(DISTINCT COALESCE(LOWER(TRIM(neighborhood)), 'unknown'))::text, '[]')
        FROM active_entities
        WHERE primary_vertical IN ('EAT','DRINKS','BAKERY','COFFEE','WINE')
          AND NOT EXISTS (SELECT 1 FROM derived_signals ds WHERE ds.entity_id = active_entities.id AND ds.signal_key = 'offering_programs')
      `,

      // Recent enrichment activity (last 7 days)
      db.$queryRaw<{ date: string; enriched: number; created: number }[]>`
        SELECT
          TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
          COALESCE(enriched.count, 0)::int AS enriched,
          COALESCE(created.count, 0)::int AS created
        FROM generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          '1 day'
        ) AS d(day)
        LEFT JOIN (
          SELECT DATE(last_enriched_at) AS day, COUNT(*)::int AS count
          FROM entities
          WHERE last_enriched_at >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY DATE(last_enriched_at)
        ) enriched ON enriched.day = d.day::date
        LEFT JOIN (
          SELECT DATE(created_at) AS day, COUNT(*)::int AS count
          FROM entities
          WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY DATE(created_at)
        ) created ON created.day = d.day::date
        ORDER BY d.day
      `,
    ]);

    // Serialize bigints
    const serialize = <T>(rows: T[]): T[] =>
      rows.map((r) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
          out[k] = typeof v === 'bigint' ? Number(v) : v;
        }
        return out as T;
      });

    // Enrichment strategy: map gap types to recommended sources and cost
    // Per enrichment-strategy-v1.md: free before paid
    const gapRecommendations: Record<string, { recommended_source: string; cost: string }> = {
      missing_gpid: { recommended_source: 'google_places_api', cost: 'paid' },
      missing_coords: { recommended_source: 'google_places_api', cost: 'paid' },
      missing_website: { recommended_source: 'social_discovery_ai', cost: 'free' },
      missing_hours: { recommended_source: 'website_crawl', cost: 'free' },
      missing_phone: { recommended_source: 'website_crawl', cost: 'free' },
      missing_instagram: { recommended_source: 'social_discovery_ai', cost: 'free' },
      missing_reservation_url: { recommended_source: 'website_crawl', cost: 'free' },
      missing_menu: { recommended_source: 'website_crawl', cost: 'free' },
      missing_scenesense: { recommended_source: 'ai_extraction', cost: 'low' },
      missing_editorial: { recommended_source: 'editorial_discovery', cost: 'free' },
      missing_offering_programs: { recommended_source: 'ai_extraction', cost: 'low' },
    };

    const gaps = serialize(gapsData)
      .filter((gap) => gap.entity_count > 0)
      .map((gap) => {
        const rec = gapRecommendations[gap.gap_type] ?? { recommended_source: 'manual', cost: 'free' };
        let neighborhoods: string[] = [];
        try {
          neighborhoods = JSON.parse(gap.neighborhoods);
        } catch {
          neighborhoods = [];
        }
        return {
          gap_type: gap.gap_type,
          bucket: gap.bucket,
          entity_count: gap.entity_count,
          neighborhoods_affected: neighborhoods.filter((n: string) => n !== 'unknown').slice(0, 10),
          recommended_source: rec.recommended_source,
          cost: rec.cost,
          already_attempted: 0, // Placeholder — would need enrichment_runs join for real data
        };
      })
      .sort((a, b) => b.entity_count - a.entity_count);

    // Build neighborhood rows with parsed verticals and computed percentages
    const neighborhoods = serialize(neighborhoodData).map((row) => {
      let verticals: Record<string, number> = {};
      try {
        verticals = typeof row.verticals === 'string' ? JSON.parse(row.verticals) : (row.verticals as Record<string, number>);
      } catch {
        verticals = {};
      }
      return {
        neighborhood: row.neighborhood,
        total: row.total,
        published: row.published,
        identity_pct: row.total > 0 ? Math.round((row.identity_complete / row.total) * 100) : 0,
        access_pct: row.total > 0 ? Math.round((row.access_complete / row.total) * 100) : 0,
        offering_pct: row.total > 0 ? Math.round((row.offering_complete / row.total) * 100) : 0,
        verticals,
      };
    });

    const totals = serialize(totalEntities)[0] ?? { total: 0, published: 0, ingested: 0 };

    return NextResponse.json({
      // Header
      totalEntities: totals.total,
      publishedCount: totals.published,
      ingestedCount: totals.ingested,
      // System Summary: three state axes
      systemSummary: {
        operatingStatus: serialize(operatingStatusCounts).map((r) => ({
          status: r.status ?? 'NULL',
          count: r.count,
        })),
        enrichmentStatus: serialize(enrichmentStatusCounts).map((r) => ({
          status: r.status ?? 'NULL',
          count: r.count,
        })),
        publicationStatus: serialize(publicationStatusCounts).map((r) => ({
          status: r.status ?? 'NULL',
          count: r.count,
        })),
      },
      // Neighborhood Overview
      neighborhoods,
      // Gaps & Recommended Actions
      gaps,
      // Recent Activity
      recentActivity: serialize(recentActivity),
    });
  } catch (error) {
    console.error('[Coverage Dashboard v2 API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data', message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
