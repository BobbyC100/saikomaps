/**
 * GET /api/admin/appearances — list appearances (filtered by subjectPlaceId or hostPlaceId)
 * POST /api/admin/appearances — create appearance
 * Admin-only.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { validateAppearanceLocation } from '@/lib/appearances/validate';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subjectPlaceId = request.nextUrl.searchParams.get('subjectPlaceId');
  const hostPlaceId = request.nextUrl.searchParams.get('hostPlaceId');
  const status = request.nextUrl.searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (subjectPlaceId) where.subjectEntityId = subjectPlaceId;
  if (hostPlaceId) where.hostEntityId = hostPlaceId;
  if (status && ['ACTIVE', 'ENDED', 'ANNOUNCED'].includes(status)) {
    where.status = status;
  }

  const appearances = await db.place_appearances.findMany({
    where,
    include: {
      subjectEntity: { select: { id: true, name: true, slug: true } },
      hostEntity: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: appearances.map((a) => ({
      id: a.id,
      subjectPlaceId: a.subjectEntityId,
      hostPlaceId: a.hostEntityId,
      latitude: a.latitude ? Number(a.latitude) : null,
      longitude: a.longitude ? Number(a.longitude) : null,
      addressText: a.addressText,
      scheduleText: a.scheduleText,
      status: a.status,
      sources: a.sources,
      confidence: a.confidence,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      subjectPlace: a.subjectEntity,
      hostPlace: a.hostEntity,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const subjectPlaceId = body.subjectPlaceId?.trim();
  const scheduleText = body.scheduleText?.trim();

  if (!subjectPlaceId) {
    return NextResponse.json(
      { success: false, error: 'subjectPlaceId is required' },
      { status: 400 }
    );
  }
  if (!scheduleText) {
    return NextResponse.json(
      { success: false, error: 'scheduleText is required' },
      { status: 400 }
    );
  }

  const hostPlaceId = body.hostPlaceId?.trim() || null;
  const latitude = body.latitude != null ? Number(body.latitude) : null;
  const longitude = body.longitude != null ? Number(body.longitude) : null;
  const addressText = body.addressText?.trim() || null;

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

  const status =
    body.status && ['ACTIVE', 'ENDED', 'ANNOUNCED'].includes(body.status)
      ? body.status
      : 'ACTIVE';

  try {
    const appearance = await db.place_appearances.create({
      data: {
        subjectEntityId: subjectPlaceId,
        hostEntityId: hostPlaceId || undefined,
        latitude: hostPlaceId ? undefined : latitude ?? undefined,
        longitude: hostPlaceId ? undefined : longitude ?? undefined,
        addressText: hostPlaceId ? undefined : addressText ?? undefined,
        scheduleText,
        status,
        sources: body.sources ?? undefined,
        confidence: body.confidence ?? undefined,
      },
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
    console.error('[admin/appearances POST]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create appearance' },
      { status: 500 }
    );
  }
}
