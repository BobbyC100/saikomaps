/**
 * API Route: Publish Map
 * POST /api/maps/[id]/publish
 * Validates map, then sets status=PUBLISHED, publishedAt, slug. Returns 422 if invalid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateShortSlug } from '@/lib/utils';
import { validateForPublish, mapToFormData, generateTitleFromPlaces } from '@/lib/mapValidation';
import { generateMapDescription } from '@/lib/generateMapDescription';

const MAX_SLUG_ATTEMPTS = 10;

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.lists.findUnique({
      where: { id },
      include: {
        mapPlaces: {
          orderBy: { orderIndex: 'asc' },
          include: { place: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Map not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = mapToFormData(existing);
    const { canPublish, errors } = validateForPublish(
      formData,
      existing.mapPlaces.length,
      existing.mapPlaces
    );

    if (!canPublish) {
      console.log('[PUBLISH] Validation failed:', JSON.stringify(errors, null, 2));
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 422 }
      );
    }

    // Generate a unique slug for the public URL (retry if collision)
    let slug: string | null = null;
    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      const candidate = generateShortSlug(8);
      const taken = await db.lists.findUnique({
        where: { slug: candidate },
      });
      if (!taken) {
        slug = candidate;
        break;
      }
    }

    if (!slug) {
      return NextResponse.json(
        { error: 'Could not generate unique URL; please try again.' },
        { status: 500 }
      );
    }

    // Use title from body if provided and current title is empty
    let titleToSet = existing.title?.trim();
    if (!titleToSet) {
      try {
        const body = await request.json().catch(() => ({}));
        if (body.title && typeof body.title === 'string' && body.title.trim()) {
          titleToSet = body.title.trim().slice(0, 60);
        }
      } catch {
        // ignore
      }
      if (!titleToSet && existing.mapPlaces.length >= 2) {
        titleToSet = generateTitleFromPlaces(existing.mapPlaces) || 'Untitled Map';
      }
      if (!titleToSet) {
        titleToSet = 'Untitled Map';
      }
    }

    const updateData: Record<string, unknown> = {
      title: titleToSet,
      published: true,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      slug,
    };

    // Generate AI description if none exists and map has 2+ places
    if (existing.description == null && existing.mapPlaces.length >= 2) {
      try {
        const places = existing.mapPlaces.map((mp) => ({
          name: mp.place.name,
          category: mp.place.category || 'eat',
          neighborhood: mp.place.neighborhood ?? undefined,
        }));
        const description = await generateMapDescription({
          title: titleToSet,
          places,
        });
        if (description) {
          updateData.description = description;
          updateData.descriptionSource = 'ai';
        }
      } catch (err) {
        console.warn('[PUBLISH] Failed to generate description:', err);
      }
    }

    const list = await db.lists.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: list,
      shareUrl: `/map/${list.slug}`,
    });
  } catch (error) {
    console.error('Error publishing map:', error);
    return NextResponse.json(
      {
        error: 'Failed to publish map',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
