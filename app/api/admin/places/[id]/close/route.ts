import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

    // Update golden_record
    const updated = await prisma.golden_records.update({
      where: { canonical_id: id },
      data: {
        lifecycle_status: status === 'PERMANENTLY_CLOSED' ? 'CLOSED_PERMANENTLY' : 'ARCHIVED',
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
