/**
 * Mark Entity as Nomadic (Pop-up)
 * POST /api/admin/entities/[id]/mark-nomadic
 *
 * Creates a minimal place_appearance row for the entity, which signals
 * to the issue scanner that this is a nomadic/pop-up entity with relaxed
 * identity and location requirements.
 *
 * Body: { scheduleText?: string, hostEntityId?: string }
 * Returns: { success: true, appearance: PlaceAppearance }
 *
 * DELETE /api/admin/entities/[id]/mark-nomadic
 * Removes all place_appearances, reverting to fixed-location entity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { scheduleText, hostEntityId } = body as {
    scheduleText?: string;
    hostEntityId?: string;
  };

  // Verify entity exists
  const entity = await db.entities.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!entity) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }

  // Check if already nomadic
  const existing = await db.place_appearances.findFirst({
    where: { subjectEntityId: id },
  });

  if (existing) {
    return NextResponse.json({
      success: true,
      already_nomadic: true,
      appearance: existing,
    });
  }

  // Create a minimal place_appearance to mark as nomadic
  const appearance = await db.place_appearances.create({
    data: {
      subjectEntityId: id,
      hostEntityId: hostEntityId ?? null,
      scheduleText: scheduleText || 'Pop-up / rotating schedule',
      status: 'ACTIVE',
      sources: { marked_by: 'admin', marked_at: new Date().toISOString() },
      confidence: 1.0,
    },
  });

  return NextResponse.json({ success: true, appearance });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const deleted = await db.place_appearances.deleteMany({
    where: { subjectEntityId: id },
  });

  return NextResponse.json({
    success: true,
    removed: deleted.count,
  });
}
