/**
 * API Route: Actor by Slug
 * GET /api/actors/[slug]
 * Returns Actor + related places via PlaceActorRelationship
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug required', success: false }, { status: 400 });
    }

    const actor = await db.actor.findFirst({
      where: { slug },
      include: {
        placeActorRelationships: {
          where: { role: 'operator' },
          orderBy: { isPrimary: 'desc' },
          include: {
            place: {
              select: { id: true, slug: true, name: true, category: true, neighborhood: true },
            },
          },
        },
      },
    });

    if (!actor) {
      return NextResponse.json({ error: 'Actor not found', success: false }, { status: 404 });
    }

    const places = actor.placeActorRelationships
      .map((r) => r.place)
      .filter((p): p is NonNullable<typeof p> => p != null);

    return NextResponse.json({
      success: true,
      data: {
        actor: {
          id: actor.id,
          name: actor.name,
          slug: actor.slug,
          website: actor.website,
          description: actor.description,
        },
        places,
      },
    });
  } catch (error) {
    console.error('Error fetching actor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actor', success: false },
      { status: 500 }
    );
  }
}
