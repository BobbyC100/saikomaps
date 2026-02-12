/**
 * Review Queue API
 * GET /api/admin/review-queue - List pending review items
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReviewQueueItems } from '@/lib/review-queue';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status') || 'pending';
    const conflictType = searchParams.get('conflict_type') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const result = await getReviewQueueItems({
      status,
      conflictType,
      limit,
      offset,
    });
    
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Review Queue API] Error fetching:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review queue', message: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
