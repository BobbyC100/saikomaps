/**
 * Coverage Dashboard API
 * GET /api/admin/coverage-dashboard
 *
 * Returns the unified data model for the coverage dashboard:
 * - Pipeline funnel (entity counts by stage)
 * - Action batches (grouped by what you can do about them)
 * - Neighborhood breakdown
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      totalEntities,
      statusCounts,
      funnelData,
      issueData,
      neighborhoodData,
      recentActivity,
    ] = await Promise.all([
      // Total non-permanently-closed entities
      db.entities.count({ where: { status: { not: 'PERMANENTLY_CLOSED' } } }),

      // Counts by entity status
      db.$queryRaw<{ status: string; count: number }[]>`
        SELECT status::text, COUNT(*)::int AS count
        FROM entities
        WHERE status != 'PERMANENTLY_CLOSED'
        GROUP BY status
        ORDER BY count DESC
      `,

      // Pipeline funnel — entity-level stage distribution
      db.$queryRaw<{
        has_website: number;
        has_gpid: number;
        has_coords: number;
        has_surfaces: number;
        has_tagline: number;
        has_identity_signals: number;
        total: number;
      }[]>`
        SELECT
          COUNT(*)::int AS total,
          COUNT(CASE WHEN e.website IS NOT NULL THEN 1 END)::int AS has_website,
          COUNT(CASE WHEN e.google_place_id IS NOT NULL THEN 1 END)::int AS has_gpid,
          COUNT(CASE WHEN e.latitude IS NOT NULL AND e.longitude IS NOT NULL THEN 1 END)::int AS has_coords,
          COUNT(CASE WHEN EXISTS (
            SELECT 1 FROM merchant_surfaces ms WHERE ms.entity_id = e.id
          ) THEN 1 END)::int AS has_surfaces,
          COUNT(CASE WHEN EXISTS (
            SELECT 1 FROM derived_signals ds WHERE ds.entity_id = e.id AND ds.signal_key = 'identity_signals'
          ) THEN 1 END)::int AS has_identity_signals,
          COUNT(CASE WHEN EXISTS (
            SELECT 1 FROM interpretation_cache ic WHERE ic.entity_id = e.id AND ic.output_type = 'TAGLINE' AND ic.is_current = true
          ) THEN 1 END)::int AS has_tagline
        FROM entities e
        WHERE e.status != 'PERMANENTLY_CLOSED' AND e.status != 'CANDIDATE'
      `,

      // Issue counts grouped by action type
      db.$queryRaw<{ issue_type: string; severity: string; count: number; blocking: number }[]>`
        SELECT
          issue_type,
          severity,
          COUNT(*)::int AS count,
          COUNT(CASE WHEN blocking_publish = true THEN 1 END)::int AS blocking
        FROM entity_issues
        WHERE status = 'open'
        GROUP BY issue_type, severity
        ORDER BY
          CASE severity
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
          END,
          count DESC
      `,

      // Neighborhood breakdown
      db.$queryRaw<{
        neighborhood: string;
        total: number;
        has_gpid: number;
        has_website: number;
        has_tagline: number;
        avg_completion: number;
      }[]>`
        SELECT
          COALESCE(LOWER(TRIM(e.neighborhood)), 'unknown') AS neighborhood,
          COUNT(*)::int AS total,
          COUNT(CASE WHEN e.google_place_id IS NOT NULL THEN 1 END)::int AS has_gpid,
          COUNT(CASE WHEN e.website IS NOT NULL THEN 1 END)::int AS has_website,
          COUNT(CASE WHEN EXISTS (
            SELECT 1 FROM interpretation_cache ic
            WHERE ic.entity_id = e.id AND ic.output_type = 'TAGLINE' AND ic.is_current = true
          ) THEN 1 END)::int AS has_tagline,
          ROUND(
            (
              COUNT(CASE WHEN e.google_place_id IS NOT NULL THEN 1 END)::numeric +
              COUNT(CASE WHEN e.website IS NOT NULL THEN 1 END)::numeric +
              COUNT(CASE WHEN e.instagram IS NOT NULL THEN 1 END)::numeric +
              COUNT(CASE WHEN e.phone IS NOT NULL THEN 1 END)::numeric +
              COUNT(CASE WHEN e.latitude IS NOT NULL THEN 1 END)::numeric +
              COUNT(CASE WHEN e.neighborhood IS NOT NULL THEN 1 END)::numeric
            ) / (COUNT(*)::numeric * 6) * 100
          , 1)::float8 AS avg_completion
        FROM entities e
        WHERE e.status != 'PERMANENTLY_CLOSED' AND e.status != 'CANDIDATE'
        GROUP BY COALESCE(LOWER(TRIM(e.neighborhood)), 'unknown')
        HAVING COUNT(*) >= 2
        ORDER BY total DESC
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

    // Build action batches from issues
    const actionMap: Record<string, {
      label: string;
      description: string;
      tool: string;
      issueTypes: string[];
      count: number;
      blocking: number;
      severity: string;
    }> = {};

    const toolMapping: Record<string, { label: string; description: string; tool: string }> = {
      unresolved_identity: { label: 'Resolve Identity', description: 'Run Smart Enrich to find website + GPID', tool: 'smart-enrich' },
      missing_gpid: { label: 'Find GPID', description: 'Batch GPID resolution via Google Places', tool: 'seed-gpid-queue' },
      enrichment_incomplete: { label: 'Run Full Enrichment', description: 'Run the 7-stage pipeline', tool: 'enrich-place' },
      missing_coords: { label: 'Run Google Places', description: 'Stage 1: fetch coords, hours, address', tool: 'enrich-stage-1' },
      missing_hours: { label: 'Run Google Places', description: 'Stage 1: fetch coords, hours, address', tool: 'enrich-stage-1' },
      missing_price_level: { label: 'Run Google Places', description: 'Stage 1: fetch coords, hours, address', tool: 'enrich-stage-1' },
      operating_status_unknown: { label: 'Run Google Places', description: 'Stage 1: fetch coords, hours, address', tool: 'enrich-stage-1' },
      missing_neighborhood: { label: 'Derive Neighborhood', description: 'Reverse geocode from existing coords', tool: 'derive-neighborhood' },
      missing_website: { label: 'Discover Website', description: 'AI web search to find official site', tool: 'discover-social' },
      missing_phone: { label: 'Run Google Places', description: 'Stage 1: fetch coords, hours, address', tool: 'enrich-stage-1' },
      missing_instagram: { label: 'Discover Instagram', description: 'AI web search to find official IG', tool: 'discover-social' },
      missing_tiktok: { label: 'Discover TikTok', description: 'AI web search to find TikTok', tool: 'discover-social' },
      missing_menu_link: { label: 'Run Website Enrichment', description: 'Stage 6: extract menu/reservation links', tool: 'enrich-stage-6' },
      missing_reservations: { label: 'Run Website Enrichment', description: 'Stage 6: extract menu/reservation links', tool: 'enrich-stage-6' },
      google_says_closed: { label: 'Review Closures', description: 'Manual review: mark closed or override', tool: 'manual' },
      potential_duplicate: { label: 'Review Duplicates', description: 'Manual review: merge or dismiss', tool: 'manual' },
    };

    for (const row of serialize(issueData)) {
      const mapping = toolMapping[row.issue_type];
      if (!mapping) continue;

      const key = mapping.tool;
      if (!actionMap[key]) {
        actionMap[key] = {
          label: mapping.label,
          description: mapping.description,
          tool: mapping.tool,
          issueTypes: [],
          count: 0,
          blocking: 0,
          severity: row.severity,
        };
      }
      if (!actionMap[key].issueTypes.includes(row.issue_type)) {
        actionMap[key].issueTypes.push(row.issue_type);
      }
      actionMap[key].count += row.count;
      actionMap[key].blocking += row.blocking;
      // Keep highest severity
      const severityOrder = ['critical', 'high', 'medium', 'low'];
      if (severityOrder.indexOf(row.severity) < severityOrder.indexOf(actionMap[key].severity)) {
        actionMap[key].severity = row.severity;
      }
    }

    const actions = Object.values(actionMap).sort((a, b) => {
      const severityOrder = ['critical', 'high', 'medium', 'low'];
      const diff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
      if (diff !== 0) return diff;
      return b.count - a.count;
    });

    const funnel = serialize(funnelData)[0] ?? {
      total: 0, has_website: 0, has_gpid: 0, has_coords: 0,
      has_surfaces: 0, has_identity_signals: 0, has_tagline: 0,
    };

    return NextResponse.json({
      totalEntities,
      statuses: serialize(statusCounts),
      funnel,
      actions,
      neighborhoods: serialize(neighborhoodData),
      recentActivity: serialize(recentActivity),
    });
  } catch (error) {
    console.error('[Coverage Dashboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data', message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
