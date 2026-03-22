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
          include: { entities: true },
        },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: 'Map not found' },
        { status: 404 }
      );
    }

    const openMapPlaces = list.map_places.filter(
      (mp) => mp.entities.businessStatus !== 'CLOSED_PERMANENTLY'
    );

    // Fetch identity signals from derived_signals (Fields v2)
    const entityIds = openMapPlaces.map(mp => mp.entities.id);

    const derivedRows = await db.derived_signals.findMany({
      where: {
        entityId: { in: entityIds },
        signalKey: 'identity_signals',
      },
      select: {
        entityId: true,
        signalValue: true,
      },
    });

    // Build map of entityId -> identity signals
    const signalsMap = new Map<string, { placePersonality: string | null; priceTier: string | null }>();
    derivedRows.forEach(row => {
      const sv = row.signalValue as Record<string, unknown> | null;
      signalsMap.set(row.entityId, {
        placePersonality: (sv?.place_personality as string) ?? null,
        priceTier: (sv?.price_tier as string) ?? null,
      });
    });
    
    // Enrich mapPlaces with identity signals (closed places already excluded)
    const enrichedMapPlaces = openMapPlaces.map(mp => {
      const signals = signalsMap.get(mp.entities.id) ?? null;
      return {
        ...mp,
        places: {
          ...mp.entities,
          placePersonality: signals?.placePersonality || null,
          priceTier: signals?.priceTier || null,
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
