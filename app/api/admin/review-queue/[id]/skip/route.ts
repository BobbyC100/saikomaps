/**
 * Review Queue Skip API
 * POST /api/admin/review-queue/[id]/skip - Skip/defer a review queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { skipReviewQueueItem } from '@/lib/review-queue';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason, decrease_priority = true } = body;
    
    
    const result = await skipReviewQueueItem({
      queueId: id,
      reason,
      decreasePriority: decrease_priority,
    });
    
    
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
