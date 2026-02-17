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
      .map(mp => mp.places.googlePlaceId)
      .filter((id): id is string => id !== null);
    
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
    const signalsMap = new Map<string, { place_personality: string | null; price_tier: string | null }>();
    identitySignals.forEach(record => {
      if (record.google_place_id) {
        signalsMap.set(record.google_place_id, {
          place_personality: record.place_personality,
          price_tier: record.price_tier,
        });
      }
    });
    
    // Enrich mapPlaces with identity signals
    const enrichedMapPlaces = list.map_places.map(mp => {
      const signals = mp.places.googlePlaceId ? signalsMap.get(mp.places.googlePlaceId) : null;
      return {
        ...mp,
        places: {
          ...mp.places,
          place_personality: signals?.place_personality || null,
          price_tier: signals?.price_tier || null,
        },
      };
    });

    // Check if current user is the owner
    const isOwner = session?.user?.id === list.userId;

    return NextResponse.json({
      success: true,
      data: {
        ...list,
        mapPlaces: enrichedMapPlaces,
        creatorName: list.users.name || list.users.email.split('@')[0], // Use name or email prefix
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
