/**
 * API Route: Get Published Maps for Explore Page
 * GET /api/maps/explore
 *
 * Query params:
 *   - q: search query (optional)
 *   - neighborhood: filter by neighborhood (optional)
 *   - category: filter by category (optional)
 *   - sort: 'recent' | 'popular' | 'alphabetical' (default: 'recent')
 *   - limit: number of results (default: 20, max: 50)
 *   - offset: pagination offset (default: 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getGooglePhotoUrl, getPhotoRefFromStored } from '@/lib/google-places';
import { requireActiveCityId } from '@/lib/active-city';
import { publicPlaceWhere } from '@/lib/coverage-gate';

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '';

function getCoverPhotoUrl(photos: unknown): string | null {
  if (!photos || !Array.isArray(photos) || photos.length === 0) return null;
  const first = photos[0] as { photo_reference?: string; photoReference?: string; name?: string };
  const ref = getPhotoRefFromStored(first);
  if (!ref || !GOOGLE_MAPS_API_KEY) return null;
  try {
    return getGooglePhotoUrl(ref, 400);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Fetch LA city ID once at the start
    const cityId = await requireActiveCityId();

    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() || '';
    const neighborhood = searchParams.get('neighborhood') || '';
    const category = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || 'recent';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
      published: true,
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { subtitle: { contains: q, mode: 'insensitive' } },
      ];
    }

    let orderBy: Record<string, string> = { publishedAt: 'desc' };
    if (sort === 'alphabetical') {
      orderBy = { title: 'asc' };
    } else if (sort === 'popular') {
      orderBy = { viewCount: 'desc' };
    }

    const [maps, totalCount] = await Promise.all([
      db.lists.findMany({
        where,
        include: {
          users: { select: { id: true, name: true, email: true } },
          map_places: {
            take: 4,
            orderBy: { orderIndex: 'asc' },
            where: {
              places: publicPlaceWhere(cityId, true), // LA places with approved coverage (or legacy JSON)
            },
            include: {
              places: {
                select: {
                  id: true,
                  name: true,
                  googlePhotos: true,
                  neighborhood: true,
                  category: true,
                },
              },
            },
          },
          _count: { select: { map_places: true } },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      db.lists.count({ where }),
    ]);

    const PLACEHOLDER_PHOTOS = [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=250&fit=crop',
    ];

    const transformedMaps = maps.map((map) => {
      const coverPhotos: string[] = [];
      if (map.coverImageUrl) {
        coverPhotos.push(map.coverImageUrl);
      }
      for (const mp of map.map_places) {
        if (coverPhotos.length >= 4) break;
        const url = getCoverPhotoUrl(mp.places?.googlePhotos);
        if (url) coverPhotos.push(url);
      }
      while (coverPhotos.length < 4) {
        coverPhotos.push(PLACEHOLDER_PHOTOS[coverPhotos.length % PLACEHOLDER_PHOTOS.length]);
      }

      const neighborhoods = [
        ...new Set(
          map.map_places
            .map((mp) => mp.places?.neighborhood)
            .filter((n): n is string => Boolean(n))
        ),
      ].slice(0, 3);

      const categories = [
        ...new Set(
          map.map_places
            .map((mp) => mp.places?.category)
            .filter((c): c is string => Boolean(c))
        ),
      ].slice(0, 3);

      return {
        id: map.id,
        title: map.title,
        subtitle: map.subtitle,
        slug: map.slug,
        placeCount: map.map_places.length, // Use filtered count, not total
        coverPhotos: coverPhotos.slice(0, 4),
        curatorName:
          map.users?.name || map.users?.email?.split('@')[0] || 'Unknown',
        curatorId: map.users?.id ?? '',
        neighborhoods,
        categories,
        publishedAt: map.publishedAt?.toISOString() ?? null,
        viewCount: map.viewCount ?? 0,
      };
    });

    // Filter out maps with zero LA places
    const mapsWithLaPlaces = transformedMaps.filter(m => m.placeCount > 0);

    return NextResponse.json({
      success: true,
      data: {
        maps: mapsWithLaPlaces,
        pagination: {
          total: mapsWithLaPlaces.length,
          limit,
          offset,
          hasMore: offset + mapsWithLaPlaces.length < mapsWithLaPlaces.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching explore maps:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch maps',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
