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
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        map_places: {
          orderBy: { orderIndex: 'asc' },
          include: { places: true },
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
    const googlePlaceIds = list.map_places
      .map(mp => mp.places?.googlePlaceId)
      .filter((id): id is string => id != null && id !== '');
    
    const identitySignals = await db.golden_records.findMany({
      where: {
        google_place_id: { in: googlePlaceIds },
      },
      select: {
        google_place_id: true,
        place_personality: true,
        price_tier: true,
      },
    });
    
    // Build map of google_place_id -> identity signals
    const signalsMap = new Map<string, { placePersonality: string | null; priceTier: string | null }>();
    identitySignals.forEach(record => {
      if (record.google_place_id) {
        signalsMap.set(record.google_place_id, {
          placePersonality: record.place_personality || null,
          priceTier: record.price_tier || null,
        });
      }
    });
    
    // Enrich mapPlaces with identity signals
    const enrichedMapPlaces = list.map_places.map(mp => {
      const signals = mp.places?.googlePlaceId ? signalsMap.get(mp.places.googlePlaceId) : null;
      return {
        ...mp,
        place: {
          ...mp.places,
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
        map_places: enrichedMapPlaces,
        creatorName: list.users?.name || list.users?.email?.split('@')[0], // Use name or email prefix
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
