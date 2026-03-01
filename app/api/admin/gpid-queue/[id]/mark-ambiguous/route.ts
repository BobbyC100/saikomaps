/**
 * GPID Queue: Mark Ambiguous
 * POST /api/admin/gpid-queue/[id]/mark-ambiguous
 * Body: { note?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { markAmbiguousGpidQueueItem } from '@/lib/gpid-resolution-queue';
import { requireAdmin } from '@/lib/auth/guards';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAdmin();
    const session = await getServerSession(authOptions);
    const reviewedBy = session?.user?.email ?? userId ?? 'admin';

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { note } = body;

    const result = await markAmbiguousGpidQueueItem({ id, reviewedBy, note });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Response) throw err;
    console.error('[GPID Queue API] Mark ambiguous error:', err);
    return NextResponse.json(
      { error: 'Failed to mark ambiguous', message: (err as Error).message },
      { status: 500 }
    );
  }
}
