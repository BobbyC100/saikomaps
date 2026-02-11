/**
 * API Route: Activity Spots as GeoJSON
 * GET /api/spots/geojson?layer=SKATE&bounds=sw_lat,sw_lng,ne_lat,ne_lng
 * Returns a GeoJSON FeatureCollection for map rendering
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LayerType } from '@prisma/client';

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: string;
    name: string;
    slug: string | null;
    layerType: string;
    spotType: string | null;
    tags: string[];
    region: string | null;
    city: string | null;
    source: string;
    sourceUrl: string | null;
    surface: string | null;
    description: string | null;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const layer = searchParams.get('layer') as LayerType | null;
    const bounds = searchParams.get('bounds'); // "sw_lat,sw_lng,ne_lat,ne_lng"

    const where: Record<string, unknown> = {
      enabled: true,
    };

    if (layer) {
      where.layerType = layer;
    }

    // Optional viewport filter (reduces payload for large datasets)
    if (bounds) {
      const [swLat, swLng, neLat, neLng] = bounds.split(',').map(Number);
      if (![swLat, swLng, neLat, neLng].some(isNaN)) {
        where.latitude = { gte: swLat, lte: neLat };
        where.longitude = { gte: swLng, lte: neLng };
      }
    }

    const spots = await db.activity_spots.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        latitude: true,
        longitude: true,
        layer_type: true,
        spot_type: true,
        tags: true,
        region: true,
        city: true,
        source: true,
        source_url: true,
        surface: true,
        description: true,
      },
    });

    const features: GeoJSONFeature[] = spots.map((s) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [s.longitude, s.latitude],
      },
      properties: {
        id: s.id,
        name: s.name,
        slug: s.slug,
        layerType: s.layer_type,
        spotType: s.spot_type,
        tags: s.tags,
        region: s.region,
        city: s.city,
        source: s.source,
        sourceUrl: s.source_url,
        surface: s.surface,
        description: s.description,
      },
    }));

    const featureCollection = {
      type: 'FeatureCollection' as const,
      features,
    };

    return NextResponse.json(featureCollection, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching spots GeoJSON:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch spots',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
