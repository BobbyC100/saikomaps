/**
 * PATCH /api/admin/appearances/[id] — update appearance
 * Admin-only.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { validateAppearanceLocation } from '@/lib/appearances/validate';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Appearance ID required' },
      { status: 400 }
    );
  }

  let body: {
    subjectPlaceId?: string;
    hostPlaceId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    addressText?: string | null;
    scheduleText?: string;
    status?: 'ACTIVE' | 'ENDED' | 'ANNOUNCED';
    sources?: unknown;
    confidence?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const existing = await db.place_appearances.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: 'Appearance not found' },
      { status: 404 }
    );
  }

  const hostPlaceId =
    body.hostPlaceId !== undefined
      ? (body.hostPlaceId?.trim() || null)
      : existing.hostEntityId;
  const latitude =
    body.latitude !== undefined
      ? (body.latitude != null ? Number(body.latitude) : null)
      : (existing.latitude ? Number(existing.latitude) : null);
  const longitude =
    body.longitude !== undefined
      ? (body.longitude != null ? Number(body.longitude) : null)
      : (existing.longitude ? Number(existing.longitude) : null);
  const addressText =
    body.addressText !== undefined
      ? (body.addressText?.trim() || null)
      : existing.addressText;

  const loc = validateAppearanceLocation({
    hostPlaceId,
    latitude,
    longitude,
    addressText,
  });
  if (!loc.valid) {
    return NextResponse.json(
      { success: false, error: loc.error },
      { status: 400 }
    );
  }

  const scheduleText = body.scheduleText?.trim() ?? existing.scheduleText;
  if (!scheduleText) {
    return NextResponse.json(
      { success: false, error: 'scheduleText cannot be empty' },
      { status: 400 }
    );
  }

  const status =
    body.status && ['ACTIVE', 'ENDED', 'ANNOUNCED'].includes(body.status)
      ? body.status
      : undefined;

  const updateData: Record<string, unknown> = {
    scheduleText,
    ...(body.subjectPlaceId?.trim() && { subjectEntityId: body.subjectPlaceId.trim() }),
    ...(status !== undefined && { status }),
    ...(body.sources !== undefined && { sources: body.sources }),
    ...(body.confidence !== undefined && { confidence: body.confidence }),
  };

  if (hostPlaceId != null && hostPlaceId !== '') {
    updateData.hostEntityId = hostPlaceId;
    updateData.latitude = null;
    updateData.longitude = null;
    updateData.addressText = null;
  } else {
    updateData.hostEntityId = null;
    updateData.latitude = latitude;
    updateData.longitude = longitude;
    updateData.addressText = addressText;
  }

  try {
    const appearance = await db.place_appearances.update({
      where: { id },
      data: updateData,
      include: {
        subjectEntity: { select: { id: true, name: true, slug: true } },
        hostEntity: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: appearance.id,
        subjectPlaceId: appearance.subjectEntityId,
        hostPlaceId: appearance.hostEntityId,
        latitude: appearance.latitude ? Number(appearance.latitude) : null,
        longitude: appearance.longitude ? Number(appearance.longitude) : null,
        addressText: appearance.addressText,
        scheduleText: appearance.scheduleText,
        status: appearance.status,
        sources: appearance.sources,
        confidence: appearance.confidence,
        createdAt: appearance.createdAt,
        updatedAt: appearance.updatedAt,
        subjectPlace: appearance.subjectEntity,
        hostPlace: appearance.hostEntity,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('place_appearances_location_check') || msg.includes('violates check constraint')) {
      return NextResponse.json(
        { success: false, error: loc.error },
        { status: 400 }
      );
    }
    if (msg.includes('foreign key') || msg.includes('violates foreign key')) {
      return NextResponse.json(
        { success: false, error: 'subjectPlaceId or hostPlaceId references a non-existent place' },
        { status: 400 }
      );
    }
    console.error('[admin/appearances PATCH]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update appearance' },
      { status: 500 }
    );
  }
}
