/**
 * API Route: Get Map Details / Update Map
 * GET /api/maps/[id] - Get map with locations
 * PATCH /api/maps/[id] - Update map fields, recompute status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, requireOwnership } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { validateForPublish, mapToFormData } from '@/lib/mapValidation';
import type { MapStatus } from '@prisma/client';

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

    const list = await db.lists.findUnique({
      where: { id },
      include: {
        map_places: {
          orderBy: { orderIndex: 'asc' },
          include: { entities: true },
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
      name: mp.entities?.name ?? '',
      address: mp.entities?.address ?? null,
      category: mp.entities?.category ?? null,
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
    const userId = await requireUserId();

    const { id } = await params;
    const list = await db.lists.findUnique({
      where: { id },
      include: {
        map_places: {
          orderBy: { orderIndex: 'asc' },
          include: { entities: true },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    await requireOwnership(list.userId);

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

    const updated = await db.lists.update({
      where: { id },
      data: updateData,
      include: {
        map_places: {
          orderBy: { orderIndex: 'asc' },
          include: { entities: true },
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
