/**
 * GPID Resolution Queue API
 * GET /api/admin/gpid-queue - List pending items
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGpidQueueItems } from '@/lib/gpid-resolution-queue';
import { requireAdmin } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const humanStatus = (searchParams.get('human_status') as 'PENDING' | 'APPROVED' | 'REJECTED') || 'PENDING';
    const resolverStatus = searchParams.get('resolver_status') as 'MATCH' | 'AMBIGUOUS' | 'NO_MATCH' | 'ERROR' | undefined;
    const reasonCode = searchParams.get('reason_code') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = (searchParams.get('sort') as 'similarity_desc' | 'similarity_asc' | 'created_asc' | 'created_desc') || 'similarity_desc';

    const result = await getGpidQueueItems({
      humanStatus,
      resolverStatus,
      reasonCode,
      limit,
      offset,
      sortBy,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof Response) throw err;
    console.error('[GPID Queue API] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch GPID queue', message: (err as Error).message },
      { status: 500 }
    );
  }
}
