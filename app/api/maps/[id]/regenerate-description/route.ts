/**
 * POST /api/maps/[id]/regenerate-description
 * Regenerate AI description for a map. Owner only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, requireOwnership } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { generateMapDescription } from '@/lib/generateMapDescription';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const list = await db.lists.findUnique({
      where: { id },
      include: {
        map_places: {
          orderBy: { orderIndex: 'asc' },
          include: { places: true },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    // Check ownership
    await requireOwnership(list.userId);

    if (list.map_places.length < 2) {
      return NextResponse.json(
        { error: 'Map needs at least 2 places to generate a description' },
        { status: 422 }
      );
    }

    const places = list.map_places.map((mp) => ({
      name: mp.places.name,
      category: mp.places.category || 'eat',
      neighborhood: mp.places.neighborhood ?? undefined,
    }));

    const description = await generateMapDescription({
      title: list.title,
      places,
    });

    const updated = await db.lists.update({
      where: { id },
      data: {
        description: description || null,
        descriptionSource: description ? 'ai' : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { description: updated.description, descriptionSource: updated.descriptionSource },
    });
  } catch (error) {
    console.error('Error regenerating description:', error);
    return NextResponse.json(
      {
        error: 'Failed to regenerate description',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
