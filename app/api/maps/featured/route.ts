/**
 * API Route: Featured Maps (for homepage)
 * GET /api/maps/featured - Published maps for homepage display
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const PLACEHOLDER_PHOTOS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=250&fit=crop',
];

function getCoverPhotos(map_places: Array<{ places: { googlePhotos: unknown } }>): string[] {
  const urls: string[] = [];
  for (const mp of map_places) {
    const gp = mp.places?.googlePhotos;
    if (gp && Array.isArray(gp) && gp.length > 0) {
      const first = gp[0] as { url?: string };
      if (first.url) urls.push(first.url);
    }
  }
  while (urls.length < 4) {
    urls.push(PLACEHOLDER_PHOTOS[urls.length % PLACEHOLDER_PHOTOS.length]);
  }
  return urls.slice(0, 4);
}

export async function GET() {
  try {
    const lists = await db.lists.findMany({
      where: { published: true },
      include: {
        users: { select: { name: true } },
        map_places: {
          take: 4,
          orderBy: { orderIndex: 'asc' },
          include: { places: { select: { googlePhotos: true } } },
        },
        _count: { select: { map_places: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 8,
    });

    const data = lists.map((list) => ({
      id: list.id,
      title: list.title,
      slug: list.slug,
      placeCount: list._count?.map_places ?? 0,
      curatorName: list.users?.name ?? 'Saiko',
      coverPhotos: getCoverPhotos(list.map_places),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching featured maps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured maps' },
      { status: 500 }
    );
  }
}
