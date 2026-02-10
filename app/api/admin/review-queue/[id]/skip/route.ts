/**
 * Review Queue Skip API
 * POST /api/admin/review-queue/[id]/skip - Skip/defer a review queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { skipReviewQueueItem } from '@/lib/review-queue';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason, decrease_priority = true } = body;
    
    console.log('[Review Queue API] Skipping item:', { id, reason });
    
    const result = await skipReviewQueueItem({
      queueId: id,
      reason,
      decreasePriority: decrease_priority,
    });
    
    console.log('[Review Queue API] Successfully skipped:', { queueId: id });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Review Queue API] Error skipping:', error);
    return NextResponse.json(
      { error: 'Failed to skip item', message: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
