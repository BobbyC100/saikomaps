/**
 * API Route: Single Activity Spot
 * GET /api/spots/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const spot = await db.activitySpot.findFirst({
      where: {
        id,
        enabled: true,
      },
    });

    if (!spot) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: spot,
    });
  } catch (error) {
    console.error('Error fetching spot:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch spot',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
