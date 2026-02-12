/**
 * API Route: Profile
 * GET /api/profile - Current user's profile with stats
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        curatorNote: true,
        scopePills: true,
        coverageSources: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get stats: maps count, places count, saved (bookmarks) count
    const [mapsCount, placesCount, savedCount] = await Promise.all([
      db.lists.count({ where: { userId } }),
      db.map_places.count({
        where: { lists: { userId } },
      }),
      db.viewer_bookmarks.count({
        where: { viewerUserId: userId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        curatorNote: user.curatorNote,
        scopePills: user.scopePills,
        coverageSources: user.coverageSources,
        createdAt: user.createdAt,
        stats: {
          mapsCount,
          placesCount,
          savedCount,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
