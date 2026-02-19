/**
 * API Route: Saved Places (Bookmarks)
 * POST: Toggle bookmark for a place
 * GET: Check if place is bookmarked (query: ?slug=xxx)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireUserId, getOptionalUserId } from '@/lib/auth/guards';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const body = await request.json();
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : null;
    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    const place = await db.places.findUnique({ where: { slug } });
    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    const existing = await db.viewer_bookmarks.findUnique({
      where: {
        viewerUserId_placeId: { viewerUserId: userId, placeId: place.id },
      },
    });

    if (existing) {
      await db.viewer_bookmarks.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ saved: false });
    }

    await db.viewer_bookmarks.create({
      data: {
        id: randomUUID(),
        viewerUserId: userId,
        placeId: place.id,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[saved-places] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle bookmark' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getOptionalUserId();
    if (!userId) {
      return NextResponse.json({ saved: false });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ error: 'slug query param is required' }, { status: 400 });
    }

    const place = await db.places.findUnique({ where: { slug } });
    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    const bookmark = await db.viewer_bookmarks.findUnique({
      where: {
        viewerUserId_placeId: { viewerUserId: userId, placeId: place.id },
      },
    });

    return NextResponse.json({ saved: !!bookmark });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[saved-places] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to check bookmark' },
      { status: 500 }
    );
  }
}
