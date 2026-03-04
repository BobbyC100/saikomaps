/**
 * POST /api/admin/places/[id]/timefold
 *
 * Editorial state transitions for TimeFOLD v1.
 * Admin-only. Never auto-approves.
 *
 * Actions:
 *   propose  — set class + status=PROPOSED (system or manual pre-stage)
 *   approve  — set status=APPROVED (makes phrase public)
 *   suppress — set status=SUPPRESSED (halts rendering immediately)
 *
 * WO: S.K.A.I./WO-TIMEFOLD-001 v1.1
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { isValidTimeFOLDClass } from '@/lib/timefold/consumer';

type Action = 'propose' | 'approve' | 'suppress';

interface RequestBody {
  action: Action;
  /** Required for 'propose'. Must be 'STABILITY' or 'NEWNESS'. */
  timefoldClass?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth gate — admin only
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Place ID required' }, { status: 400 });
  }

  // Parse body
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, timefoldClass } = body;

  if (!['propose', 'approve', 'suppress'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Must be: propose | approve | suppress' },
      { status: 400 }
    );
  }

  // Verify entity exists
  const entity = await db.entities.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      timefoldClass: true,
      timefoldStatus: true,
    },
  });

  if (!entity) {
    return NextResponse.json({ error: 'Place not found' }, { status: 404 });
  }

  const now = new Date();

  // ---------------------------------------------------------------------------
  // Action: propose
  // ---------------------------------------------------------------------------
  if (action === 'propose') {
    if (!timefoldClass || !isValidTimeFOLDClass(timefoldClass)) {
      return NextResponse.json(
        { error: 'timefoldClass is required for propose. Must be: STABILITY | NEWNESS' },
        { status: 400 }
      );
    }

    const updated = await db.entities.update({
      where: { id },
      data: {
        timefoldClass,
        timefoldStatus: 'PROPOSED',
        timefoldProposedAt: now,
        timefoldProposedBy: adminId,
      },
      select: {
        id: true,
        name: true,
        timefoldClass: true,
        timefoldStatus: true,
        timefoldProposedAt: true,
        timefoldProposedBy: true,
      },
    });

    return NextResponse.json({ success: true, place: updated });
  }

  // ---------------------------------------------------------------------------
  // Action: approve
  // ---------------------------------------------------------------------------
  if (action === 'approve') {
    if (!entity.timefoldClass) {
      return NextResponse.json(
        { error: 'Cannot approve: timefoldClass not set. Propose a class first.' },
        { status: 409 }
      );
    }

    if (entity.timefoldStatus === 'APPROVED') {
      return NextResponse.json(
        { error: 'Already approved.' },
        { status: 409 }
      );
    }

    const updated = await db.entities.update({
      where: { id },
      data: {
        timefoldStatus: 'APPROVED',
        timefoldApprovedAt: now,
        timefoldApprovedBy: adminId,
        // Clear any prior suppression timestamps on re-approval
        timefoldSuppressedAt: null,
        timefoldSuppressedBy: null,
      },
      select: {
        id: true,
        name: true,
        timefoldClass: true,
        timefoldStatus: true,
        timefoldApprovedAt: true,
        timefoldApprovedBy: true,
      },
    });

    return NextResponse.json({ success: true, place: updated });
  }

  // ---------------------------------------------------------------------------
  // Action: suppress
  // ---------------------------------------------------------------------------
  if (action === 'suppress') {
    if (entity.timefoldStatus === 'SUPPRESSED') {
      return NextResponse.json(
        { error: 'Already suppressed.' },
        { status: 409 }
      );
    }

    const updated = await db.entities.update({
      where: { id },
      data: {
        timefoldStatus: 'SUPPRESSED',
        timefoldSuppressedAt: now,
        timefoldSuppressedBy: adminId,
      },
      select: {
        id: true,
        name: true,
        timefoldClass: true,
        timefoldStatus: true,
        timefoldSuppressedAt: true,
        timefoldSuppressedBy: true,
      },
    });

    return NextResponse.json({ success: true, place: updated });
  }

  // Should be unreachable
  return NextResponse.json({ error: 'Unhandled action' }, { status: 500 });
}
