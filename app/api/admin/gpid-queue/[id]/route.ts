/**
 * GPID Queue: Get single item
 * GET /api/admin/gpid-queue/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGpidQueueItem } from '@/lib/gpid-resolution-queue';
import { requireAdmin } from '@/lib/auth/guards';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const item = await getGpidQueueItem(id);
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (err: unknown) {
    if (err instanceof Response) throw err;
    console.error('[GPID Queue API] Get item error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch item', message: (err as Error).message },
      { status: 500 }
    );
  }
}
