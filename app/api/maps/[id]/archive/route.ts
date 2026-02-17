/**
 * API Route: Archive Map
 * POST /api/maps/[id]/archive
 * Sets status = ARCHIVED. Removes from public listings but preserves data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, requireOwnership } from '@/lib/auth/guards';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();

    const { id } = await params;
    const list = await db.lists.findUnique({ where: { id } });

    if (!list) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    await requireOwnership(list.userId);

    await db.lists.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Map archived',
    });
  } catch (error) {
    console.error('Error archiving map:', error);
    return NextResponse.json(
      {
        error: 'Failed to archive map',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
