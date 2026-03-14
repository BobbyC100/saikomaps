/**
 * Entity Field Patch API
 * PATCH /api/admin/entities/[id]/patch
 *
 * Allows operators to set specific fields on an entity from Coverage Ops.
 * Only whitelisted fields can be patched to prevent accidental damage.
 *
 * Body: { field: string, value: string | null }
 * Returns: { entityId, field, value, previousValue }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const PATCHABLE_FIELDS = new Set([
  'website',
  'phone',
  'instagram',
  'tiktok',
  'neighborhood',
  'google_place_id',
  'status',
]);

// Map DB column names to Prisma field names where they differ
const FIELD_MAP: Record<string, string> = { google_place_id: 'googlePlaceId' };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { field, value } = body as { field?: string; value?: string | null };

  if (!field) {
    return NextResponse.json({ error: 'field is required' }, { status: 400 });
  }

  if (!PATCHABLE_FIELDS.has(field)) {
    return NextResponse.json(
      { error: `Field not patchable: ${field}. Allowed: ${[...PATCHABLE_FIELDS].join(', ')}` },
      { status: 400 },
    );
  }

  const prismaField = FIELD_MAP[field] ?? field;
  const cleanValue = typeof value === 'string' ? value.trim() || null : null;

  try {
    const entity = await db.entities.findUnique({
      where: { id },
      select: { id: true, slug: true, name: true, [prismaField]: true },
    });

    if (!entity) {
      return NextResponse.json({ error: `Entity not found: ${id}` }, { status: 404 });
    }

    const previousValue = (entity as Record<string, unknown>)[prismaField] ?? null;

    await db.entities.update({
      where: { id },
      data: { [prismaField]: cleanValue },
    });

    return NextResponse.json({
      entityId: id,
      slug: entity.slug,
      name: entity.name,
      field,
      value: cleanValue,
      previousValue,
    });
  } catch (error: any) {
    console.error('[Entity Patch] Error:', error);

    // Handle unique constraint violations with a helpful message
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      let conflictName = 'another entity';
      let conflictId: string | null = null;
      let conflictSlug: string | null = null;
      try {
        const conflict = await db.entities.findFirst({
          where: { [prismaField]: cleanValue },
          select: { id: true, name: true, slug: true },
        });
        if (conflict) {
          conflictName = `"${conflict.name}" (${conflict.slug})`;
          conflictId = conflict.id;
          conflictSlug = conflict.slug;
        }
      } catch { /* ignore */ }

      return NextResponse.json(
        {
          error: `Already assigned to ${conflictName}. This may be a duplicate entity.`,
          conflictEntityId: conflictId,
          conflictEntitySlug: conflictSlug,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to patch entity', message: error.message },
      { status: 500 },
    );
  }
}
