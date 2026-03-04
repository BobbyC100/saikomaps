import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, TraceSource, TraceEventType } from '@prisma/client';
import { writeTrace } from '@/lib/traces';

const prisma = new PrismaClient();

/**
 * POST /api/admin/places/[id]/close
 * Mark a place as closed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status = 'PERMANENTLY_CLOSED', reason } = body;

    console.log('[Close Place API] Marking place as closed:', { id, status, reason });

    const newLifecycleStatus = status === 'PERMANENTLY_CLOSED' ? 'CLOSED_PERMANENTLY' : 'ARCHIVED';

    // Fetch current state for TRACES
    const existing = await prisma.golden_records.findUnique({
      where: { canonical_id: id },
      select: { lifecycle_status: true },
    });

    // Update golden_record
    const updated = await prisma.golden_records.update({
      where: { canonical_id: id },
      data: {
        lifecycle_status: newLifecycleStatus,
        archive_reason: 'CLOSED',
        archived_at: new Date(),
        archived_by: 'admin',
        updated_at: new Date(),
      },
      select: {
        canonical_id: true,
        name: true,
        lifecycle_status: true,
      },
    });

    console.log('[Close Place API] Successfully closed:', {
      name: updated.name,
      status: updated.lifecycle_status,
    });

    // TRACES: HUMAN_OVERRIDE — manual admin status change
    await writeTrace({
      entityId: id,
      source: TraceSource.admin,
      eventType: TraceEventType.HUMAN_OVERRIDE,
      fieldName: 'lifecycle_status',
      oldValue: existing?.lifecycle_status ?? null,
      newValue: { lifecycle_status: newLifecycleStatus, reason: reason ?? 'admin_close' },
    });

    return NextResponse.json({
      success: true,
      place: updated,
    });
  } catch (error: any) {
    console.error('[Close Place API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to close place' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
