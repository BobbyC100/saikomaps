/**
 * GET /api/admin/coverage/launch-readiness
 * Fetch readiness rows from v_entity_launch_readiness_v0 for UI/manual review.
 *
 * Query params:
 *   onlyMissing=true|false  (default false)
 *   limit=<n>               (default 200)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/config/db';

interface LaunchReadinessRow {
  entity_id: string;
  name: string;
  category: string | null;
  score: number;
  is_launch_ready: boolean;
  missing: string[];
  computed_at: Date;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const onlyMissing = searchParams.get('onlyMissing') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 500);

    const prisma = db.admin;
    const rows = onlyMissing
      ? await prisma.$queryRaw<LaunchReadinessRow[]>`
          SELECT entity_id, name, category, score, is_launch_ready, missing, computed_at
          FROM public.v_entity_launch_readiness_v0
          WHERE is_launch_ready = false
          ORDER BY score DESC
          LIMIT ${limit}
        `
      : await prisma.$queryRaw<LaunchReadinessRow[]>`
          SELECT entity_id, name, category, score, is_launch_ready, missing, computed_at
          FROM public.v_entity_launch_readiness_v0
          ORDER BY score DESC
          LIMIT ${limit}
        `;

    return NextResponse.json({ rows });
  } catch (err: unknown) {
    if (err instanceof Response) throw err;
    console.error('[Launch Readiness API] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch launch readiness', message: (err as Error).message },
      { status: 500 }
    );
  }
}
