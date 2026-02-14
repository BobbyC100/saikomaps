/**
 * API Route: Get Public Map
 * GET /api/maps/public/[slug]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    const devOwner = process.env.NODE_ENV === 'development' && request.nextUrl.searchParams.get('devOwner') === '1';

    const list = await db.lists.findFirst({
      where: {
        slug,
        published: true, // Only show published maps
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        mapPlaces: {
          orderBy: { orderIndex: 'asc' },
          include: { place: true },
        },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: 'Map not found' },
        { status: 404 }
      );
    }

    // Fetch identity signals for places
    const googlePlaceIds = list.mapPlaces
      .map(mp => mp.place.googlePlaceId)
      .filter((id): id is string => id !== null);
    
    const identitySignals = await db.goldenRecord.findMany({
      where: {
        googlePlaceId: { in: googlePlaceIds },
      },
      select: {
        googlePlaceId: true,
        placePersonality: true,
        priceTier: true,
      },
    });
    
    // Build map of google_place_id -> identity signals
    const signalsMap = new Map<string, { placePersonality: string | null; priceTier: string | null }>();
    identitySignals.forEach(record => {
      if (record.googlePlaceId) {
        signalsMap.set(record.googlePlaceId, {
          placePersonality: record.placePersonality,
          priceTier: record.priceTier,
        });
      }
    });
    
    // Enrich mapPlaces with identity signals
    const enrichedMapPlaces = list.mapPlaces.map(mp => {
      const signals = mp.place.googlePlaceId ? signalsMap.get(mp.place.googlePlaceId) : null;
      return {
        ...mp,
        place: {
          ...mp.place,
          placePersonality: signals?.placePersonality || null,
          priceTier: signals?.priceTier || null,
        },
      };
    });

    // Check if current user is the owner (or dev override: ?devOwner=1 in development)
    const isOwner = devOwner || session?.user?.id === list.userId;

    return NextResponse.json({
      success: true,
      data: {
        ...list,
        mapPlaces: enrichedMapPlaces,
        creatorName: list.user.name || list.user.email.split('@')[0], // Use name or email prefix
        isOwner, // Include ownership flag
      },
    });
  } catch (error) {
    console.error('Error fetching public map:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch map',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
