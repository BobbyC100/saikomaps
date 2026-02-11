/**
 * API Route: Get Map Details / Update Map
 * GET /api/maps/[id] - Get map with locations
 * PATCH /api/maps/[id] - Update map fields, recompute status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { validateForPublish, mapToFormData } from '@/lib/mapValidation';
import type { MapStatus } from '@prisma/client';

function getUserId(session: { user?: { id?: string } } | null, request?: NextRequest): string | null {
  if (session?.user?.id) return session.user.id;
  // Dev override: ?devOwner=1 or X-Dev-Owner header lets unauthenticated user act as owner
  if (process.env.NODE_ENV === 'development' && request?.headers.get('x-dev-owner') === '1') {
    return '__dev_owner__';
  }
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

function computeMapStatus(
  list: { status: MapStatus; map_places: Array<{ descriptor?: string | null }> },
  formData: ReturnType<typeof mapToFormData>
): MapStatus {
  const placeCount = list.map_places.length;
  const { canPublish } = validateForPublish(formData, placeCount, list.map_places);

  if (list.status === 'PUBLISHED') return 'PUBLISHED';
  if (list.status === 'ARCHIVED') return 'ARCHIVED';

  return canPublish ? 'READY' : 'DRAFT';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const list = await db.list.findUnique({
      where: { id },
      include: {
        map_places: {
          orderBy: { orderIndex: 'asc' },
          include: { places: true },
        },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: 'Map not found' },
        { status: 404 }
      );
    }

    // Build locations array from mapPlaces for create flow (expects data.locations)
    const locations = (list.map_places || []).map((mp) => ({
      id: mp.id,
      name: mp.places?.name ?? '',
      address: mp.places?.address ?? null,
      category: mp.places?.category ?? null,
      orderIndex: mp.orderIndex,
    }));

    return NextResponse.json({
      success: true,
      data: { ...list, locations },
    });
  } catch (error) {
    console.error('Load map error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown load error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const list = await db.list.findUnique({
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

    if (userId !== '__dev_owner__' && list.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle ? String(body.subtitle).trim() : null;
    if (body.functionType !== undefined) updateData.functionType = body.functionType ? String(body.functionType).trim() : null;
    if (body.functionContext !== undefined) updateData.functionContext = body.functionContext ? String(body.functionContext).trim() : null;
    if (body.scopeGeography !== undefined) updateData.scopeGeography = body.scopeGeography ? String(body.scopeGeography).trim() : null;
    if (body.scopePlaceTypes !== undefined) updateData.scopePlaceTypes = Array.isArray(body.scopePlaceTypes) ? body.scopePlaceTypes : [];
    if (body.scopeExclusions !== undefined) updateData.scopeExclusions = Array.isArray(body.scopeExclusions) ? body.scopeExclusions : [];
    if (body.organizingLogic !== undefined) updateData.organizingLogic = body.organizingLogic && ['TIME_BASED', 'NEIGHBORHOOD_BASED', 'ROUTE_BASED', 'PURPOSE_BASED', 'LAYERED'].includes(body.organizingLogic) ? body.organizingLogic : null;
    if (body.organizingLogicNote !== undefined) updateData.organizingLogicNote = body.organizingLogicNote ? String(body.organizingLogicNote).trim() : null;
    if (body.notes !== undefined) updateData.notes = body.notes ? String(body.notes).trim() : null;
    if (body.description !== undefined) {
      const desc = body.description ? String(body.description).trim() : null;
      updateData.description = desc;
      updateData.descriptionSource = desc
        ? (['ai', 'edited', 'manual'].includes(body.descriptionSource) ? body.descriptionSource : 'edited')
        : null;
    }
    if (body.templateType !== undefined) {
      const t = String(body.templateType).trim();
      updateData.templateType = t || 'field-notes';
    }

    const merged = { ...list, ...updateData };
    const formData = mapToFormData(merged);
    const newStatus = computeMapStatus(
      { status: list.status, map_places: list.map_places },
      formData
    );
    updateData.status = newStatus;

    const updated = await db.list.update({
      where: { id },
      data: updateData,
      include: {
        map_places: {
          orderBy: { orderIndex: 'asc' },
          include: { places: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Map save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown save error' },
      { status: 500 }
    );
  }
}
