import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/admin/places/[id]/close
 * Mark a place as closed (updates entities table)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    console.log('[Close Place API] Marking place as closed:', { id, reason });

    const updated = await prisma.entities.update({
      where: { id },
      data: {
        status: 'CLOSED',
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    console.log('[Close Place API] Successfully closed:', {
      name: updated.name,
      status: updated.status,
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
