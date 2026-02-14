/**
 * API Route: Activity Spots (Skate, Surf, etc.)
 * GET /api/spots?layer=SKATE&city=Los Angeles&region=venice-westside
 * POST /api/spots (admin - create spot)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LayerType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const layer = searchParams.get('layer') as LayerType | null;
    const city = searchParams.get('city');
    const region = searchParams.get('region');

    const where: Record<string, unknown> = {
      enabled: true,
    };

    if (layer) {
      where.layerType = layer;
    }
    if (city) {
      where.city = city;
    }
    if (region) {
      where.region = region;
    }

    const spots = await db.activity_spots.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: spots,
      count: spots.length,
    });
  } catch (error) {
    console.error('Error fetching spots:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch spots',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
