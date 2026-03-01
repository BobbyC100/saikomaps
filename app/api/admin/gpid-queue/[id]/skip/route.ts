/**
 * GPID Queue: Skip (leave pending)
 * POST /api/admin/gpid-queue/[id]/skip
 */

import { NextRequest, NextResponse } from 'next/server';
import { skipGpidQueueItem } from '@/lib/gpid-resolution-queue';
import { requireAdmin } from '@/lib/auth/guards';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const result = await skipGpidQueueItem(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Response) throw err;
    console.error('[GPID Queue API] Skip error:', err);
    return NextResponse.json(
      { error: 'Failed to skip', message: (err as Error).message },
      { status: 500 }
    );
  }
}
