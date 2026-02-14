/**
 * Profile Page — User's maps and saved maps
 * Route: /profile (authenticated)
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ProfilePageClient } from './ProfilePageClient';

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

const PLACEHOLDER_PHOTOS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=150&fit=crop',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=150&fit=crop',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=150&fit=crop',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&h=150&fit=crop',
];

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    redirect('/login');
  }

  let userMaps: Awaited<ReturnType<typeof db.list.findMany>> = [];
  let savedMapsRows: Awaited<ReturnType<typeof db.savedMap.findMany>> = [];
  let user: { name: string | null; curatorNote: string | null; scopePills: string[]; coverageSources: string[]; avatarUrl: string | null } | null = null;

  try {
    [userMaps, savedMapsRows, user] = await Promise.all([
      db.list.findMany({
        where: { userId },
        include: {
          map_places: {
            take: 4,
            orderBy: { orderIndex: 'asc' },
            include: { places: { select: { googlePhotos: true } } },
          },
          _count: { select: { map_places: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      db.savedMap.findMany({
        where: { userId },
        include: {
          lists: {
            include: {
              users: { select: { name: true } },
              map_places: {
                take: 4,
                orderBy: { orderIndex: 'asc' },
                include: { places: { select: { googlePhotos: true } } },
              },
              _count: { select: { map_places: true } },
            },
          },
        },
        orderBy: { savedAt: 'desc' },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          curatorNote: true,
          scopePills: true,
          coverageSources: true,
          avatarUrl: true,
        },
      }),
    ]);
  } catch (error) {
    console.error('[Profile] Failed to load profile data:', error);
    // Continue with empty data — page will show empty states
  }

  const stats = {
    mapCount: userMaps.length,
    placeCount: userMaps.reduce((sum, m) => sum + (m._count?.map_places ?? 0), 0),
    savedCount: savedMapsRows.length,
  };

  const userMapsData = userMaps.map((m) => ({
    id: m.id,
    title: m.title,
    slug: m.slug,
    published: m.published ?? false,
    locationCount: m._count?.map_places ?? 0,
    viewCount: m.viewCount ?? 0,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    coverPhotos: getCoverPhotos(m.map_places),
  }));

  const savedMapsData = savedMapsRows.map((sm) => ({
    id: sm.lists.id,
    title: sm.lists.title,
    slug: sm.lists.slug,
    published: sm.lists.published ?? false,
    locationCount: sm.lists._count?.map_places ?? 0,
    creatorName: sm.lists.users?.name ?? 'Unknown',
    coverPhotos: getCoverPhotos(sm.lists.map_places),
  }));

  return (
    <ProfilePageClient
      user={{
        name: user?.name ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        curatorNote: user?.curatorNote ?? null,
        scopePills: user?.scopePills ?? [],
        coverageSources: user?.coverageSources ?? [],
      }}
      userMaps={userMapsData}
      savedMaps={savedMapsData}
      stats={stats}
    />
  );
}

function getCoverPhotos(
  mapPlaces: Array<{ places: { googlePhotos: unknown } }>
): string[] {
  const urls: string[] = [];
  for (const mp of mapPlaces) {
    const gp = mp.places?.googlePhotos;
    if (gp && Array.isArray(gp) && gp.length > 0) {
      const first = gp[0] as { url?: string; photo_reference?: string; photoReference?: string };
      if (first.url) {
        urls.push(first.url);
      }
    }
  }
  while (urls.length < 4) {
    urls.push(PLACEHOLDER_PHOTOS[urls.length % PLACEHOLDER_PHOTOS.length]);
  }
  return urls.slice(0, 4);
}
