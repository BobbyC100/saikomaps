/**
 * Issue Scanner Tool API
 * POST /api/admin/tools/scan-issues
 *
 * Scan entities and generate/update entity_issues rows.
 * Phase 1 of Coverage Operations (COVOPS-APPROACH-V1).
 *
 * Actions:
 *   { action: "scan" }                              — scan all non-CANDIDATE entities (inline)
 *   { action: "scan", slug: string }                — scan single entity (inline)
 *   { action: "scan", entityId: string }            — scan single entity by ID (inline)
 *   { action: "summary" }                           — return current issue counts by type/status
 *   { action: "resolve", issueId: string }          — manually resolve an issue
 *   { action: "suppress", issueId: string, reason } — suppress an issue (confirmed_none, etc.)
 *
 * Coverage Operations resolution tool (see COVOPS-APPROACH-V1).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scanEntities, ISSUE_RULES } from '@/lib/coverage/issue-scanner';
import { scanForDuplicates } from '@/lib/coverage/duplicate-scanner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (scan | summary | resolve | suppress)' },
        { status: 400 },
      );
    }

    // ── Scan: generate/update entity_issues ──
    if (action === 'scan') {
      const { slug, entityId, dryRun, includeDuplicates } = body as {
        slug?: string;
        entityId?: string;
        dryRun?: boolean;
        includeDuplicates?: boolean;
      };

      const result = await scanEntities(db, {
        slugs: slug ? [slug] : undefined,
        entityIds: entityId ? [entityId] : undefined,
        dryRun: dryRun ?? false,
        verbose: false,
      });

      // Run duplicate scanner on full scans (no slug/entityId filter)
      let duplicates = null;
      if (!slug && !entityId && includeDuplicates !== false) {
        duplicates = await scanForDuplicates(db, { dryRun: dryRun ?? false });
      }

      return NextResponse.json({
        action: 'scan',
        dryRun: dryRun ?? false,
        ...result,
        ...(duplicates ? { duplicates } : {}),
      });
    }

    // ── Summary: current issue landscape ──
    if (action === 'summary') {
      // Count by status
      const byStatus = await db.$queryRaw<{ status: string; count: number }[]>`
        SELECT status, COUNT(*)::int AS count
        FROM entity_issues
        GROUP BY status
        ORDER BY count DESC
      `;

      // Count by problem_class + status
      const byClass = await db.$queryRaw<{ problem_class: string; status: string; count: number }[]>`
        SELECT problem_class, status, COUNT(*)::int AS count
        FROM entity_issues
        GROUP BY problem_class, status
        ORDER BY problem_class, status
      `;

      // Count by issue_type (active only)
      const byType = await db.$queryRaw<{ issue_type: string; severity: string; count: number }[]>`
        SELECT issue_type, severity, COUNT(*)::int AS count
        FROM entity_issues
        WHERE status NOT IN ('resolved', 'suppressed')
        GROUP BY issue_type, severity
        ORDER BY count DESC
      `;

      // Total active
      const totalActive = byStatus
        .filter((r) => !['resolved', 'suppressed'].includes(r.status))
        .reduce((sum, r) => sum + r.count, 0);

      // Blocking publish count
      const blockingRows = await db.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT entity_id)::int AS count
        FROM entity_issues
        WHERE blocking_publish = true AND status NOT IN ('resolved', 'suppressed')
      `;

      return NextResponse.json({
        action: 'summary',
        total_active: totalActive,
        blocking_publish_entities: blockingRows[0]?.count ?? 0,
        by_status: byStatus,
        byClass: byClass,
        byType: byType,
        availableRules: ISSUE_RULES.map((r) => ({
          issueType: r.issueType,
          problemClass: r.problemClass,
          severity: r.severity,
          blockingPublish: r.blockingPublish,
          recommendedTool: r.recommendedTool,
        })),
      });
    }

    // ── Resolve: manually resolve an issue ──
    if (action === 'resolve') {
      const { issueId } = body as { issueId?: string };
      if (!issueId) {
        return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
      }

      const issue = await db.entity_issues.findUnique({ where: { id: issueId } });
      if (!issue) {
        return NextResponse.json({ error: `Issue not found: ${issueId}` }, { status: 404 });
      }

      if (issue.status === 'resolved') {
        return NextResponse.json({ issueId, status: 'already_resolved' });
      }

      await db.entity_issues.update({
        where: { id: issueId },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: 'HUMAN',
        },
      });

      return NextResponse.json({ issueId, issueType: issue.issueType, status: 'resolved' });
    }

    // ── Suppress: mark issue as confirmed_none / not_applicable ──
    if (action === 'suppress') {
      const { issueId, reason } = body as { issueId?: string; reason?: string };
      if (!issueId) {
        return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
      }
      if (!reason) {
        return NextResponse.json(
          { error: 'reason is required (confirmed_none | not_applicable | wont_fix)' },
          { status: 400 },
        );
      }

      const issue = await db.entity_issues.findUnique({ where: { id: issueId } });
      if (!issue) {
        return NextResponse.json({ error: `Issue not found: ${issueId}` }, { status: 404 });
      }

      await db.entity_issues.update({
        where: { id: issueId },
        data: {
          status: 'suppressed',
          suppressedReason: reason,
          resolvedAt: new Date(),
          resolvedBy: 'HUMAN',
        },
      });

      return NextResponse.json({
        issueId,
        issueType: issue.issueType,
        status: 'suppressed',
        reason,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Must be scan | summary | resolve | suppress` },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('[Scan Issues] Error:', error);
    return NextResponse.json(
      { error: 'Failed to execute issue scan action', message: error.message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/tools/scan-issues
 *
 * Quick summary of active issues. Lightweight alternative to POST { action: "summary" }.
 * Add ?detail=true to get individual issue rows with entity name/slug (for the triage board UI).
 */
export async function GET(request: NextRequest) {
  try {
    const detail = request.nextUrl.searchParams.get('detail') === 'true';

    if (detail) {
      // Return individual issue rows with entity join — for Coverage Ops UI
      const issues = await db.$queryRaw<{
        id: string;
        entity_id: string;
        entity_name: string;
        entity_slug: string;
        problem_class: string;
        issue_type: string;
        status: string;
        severity: string;
        blocking_publish: boolean;
        recommended_tool: string | null;
        detail: unknown;
        suppressed_reason: string | null;
        created_at: Date;
        updated_at: Date;
      }[]>`
        SELECT
          ei.id, ei.entity_id, ei.problem_class, ei.issue_type,
          ei.status, ei.severity, ei.blocking_publish,
          ei.recommended_tool, ei.detail, ei.suppressed_reason,
          ei.created_at, ei.updated_at,
          e.name AS entity_name, e.slug AS entity_slug
        FROM entity_issues ei
        JOIN entities e ON e.id = ei.entity_id
        WHERE ei.status != 'resolved'
        ORDER BY
          CASE ei.severity
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
          END,
          ei.created_at ASC
        LIMIT 500
      `;

      const active = issues.filter((i) => i.status !== 'suppressed');
      const suppressed = issues.filter((i) => i.status === 'suppressed');

      return NextResponse.json({
        total_active: active.length,
        total_suppressed: suppressed.length,
        issues: active,
        suppressed,
      });
    }

    // Default: aggregate summary
    const rows = await db.$queryRaw<{ issue_type: string; problem_class: string; severity: string; status: string; count: number }[]>`
      SELECT issue_type, problem_class, severity, status, COUNT(*)::int AS count
      FROM entity_issues
      WHERE status NOT IN ('resolved', 'suppressed')
      GROUP BY issue_type, problem_class, severity, status
      ORDER BY count DESC
    `;

    const total = rows.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      total_active_issues: total,
      issues: rows,
    });
  } catch (error: any) {
    console.error('[Scan Issues GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issue summary', message: error.message },
      { status: 500 },
    );
  }
}
