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
  'hours',
  'events_url',
]);

// Map DB column names to Prisma field names where they differ
const FIELD_MAP: Record<string, string> = { google_place_id: 'googlePlaceId' };

function parseHoursValue(value: string | null): { parsed: unknown; error?: string } {
  if (value === null) return { parsed: null };
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === 'NONE') return { parsed: null };

  // Operator-friendly fallback: allow plain text and coerce to weekday_text.
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    const lines = trimmed
      .split(/\r?\n|;\s*/)
      .map((line) => line.trim())
      .filter(Boolean);
    return { parsed: { weekday_text: lines.length > 0 ? lines : [trimmed] } };
  }
  try {
    return { parsed: JSON.parse(trimmed) };
  } catch {
    return {
      parsed: null,
      error:
        'hours must be valid JSON, or plain text like "Mon: 8:00 AM - 4:00 PM"',
    };
  }
}

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

  // events_url lives on canonical_entity_state, not entities.
  if (field === 'events_url') {
    const cleanValue = typeof value === 'string' ? value.trim() || null : null;
    try {
      const entity = await db.entities.findUnique({
        where: { id },
        select: { id: true, slug: true, name: true },
      });
      if (!entity) {
        return NextResponse.json({ error: `Entity not found: ${id}` }, { status: 404 });
      }

      const existing = await db.canonical_entity_state.findUnique({
        where: { entityId: id },
        select: { eventsUrl: true },
      });
      const previousValue = existing?.eventsUrl ?? null;

      await db.canonical_entity_state.upsert({
        where: { entityId: id },
        create: {
          entityId: id,
          name: entity.name,
          eventsUrl: cleanValue,
          sanctionedBy: 'HUMAN',
          lastSanctionedAt: new Date(),
        },
        update: {
          eventsUrl: cleanValue,
          sanctionedBy: 'HUMAN',
          lastSanctionedAt: new Date(),
        },
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
      return NextResponse.json(
        { error: 'Failed to patch entity', message: error.message },
        { status: 500 },
      );
    }
  }

  const prismaField = FIELD_MAP[field] ?? field;
  const cleanValue = typeof value === 'string' ? value.trim() || null : null;
  const isHoursField = field === 'hours';
  const hoursParsed = isHoursField ? parseHoursValue(cleanValue) : null;
  if (hoursParsed?.error) {
    return NextResponse.json({ error: hoursParsed.error }, { status: 400 });
  }

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
      data: {
        [prismaField]: isHoursField ? (hoursParsed?.parsed as object | string | number | boolean | null) : cleanValue,
      },
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
