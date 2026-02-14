/**
 * API Route: Archive Map
 * POST /api/maps/[id]/archive
 * Sets status = ARCHIVED. Removes from public listings but preserves data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const list = await db.lists.findUnique({ where: { id } });

    if (!list) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    if (list.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
