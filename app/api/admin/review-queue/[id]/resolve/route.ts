/**
 * Review Queue Resolution API
 * POST /api/admin/review-queue/[id]/resolve - Resolve a review queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveReviewQueueItem } from '@/lib/review-queue';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;
    const body = await request.json();
    const { resolution, resolution_notes, canonical_id } = body;
    
    
    // TODO: Get user from auth session
    const resolvedBy = 'admin';
    
    const result = await resolveReviewQueueItem({
      queueId: id,
      resolution,
      resolutionNotes: resolution_notes,
      resolvedBy,
      canonicalId: canonical_id,
    });
    
    // Log to audit trail
    const decisionTimeMs = Date.now() - startTime;
    await prisma.review_audit_log.create({
      data: {
        queue_id: id,
        resolved_by: resolvedBy,
        resolution,
        decision_time_ms: decisionTimeMs,
      },
    });
    
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Review Queue API] Error resolving:', error);
    return NextResponse.json(
      { error: 'Failed to resolve item', message: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
