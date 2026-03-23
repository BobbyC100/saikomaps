/**
 * TimeFOLD Editorial Gate API
 * POST /api/admin/entities/[id]/timefold
 *
 * Actions:
 *   { action: 'approve' }    — sets approved_by on the current TIMEFOLD entry
 *   { action: 'suppress' }   — marks the current TIMEFOLD entry as suppressed (approved_by = '__suppressed')
 *   { action: 'propose', class: 'STABILITY' | 'NEWNESS', phrase: string }
 *                             — manually proposes a TimeFOLD entry (writes to interpretation_cache)
 *
 * The editorial gate: nothing renders on the consumer page until approved_by is set.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const TIMEFOLD_PHRASES: Record<string, string> = {
  STABILITY: 'Established local presence.',
  NEWNESS: 'Recently opened.',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action } = body as { action?: string };

  if (!action || !['approve', 'suppress', 'propose'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be one of: approve, suppress, propose' },
      { status: 400 },
    );
  }

  try {
    // Verify entity exists
    const entity = await db.entities.findUnique({
      where: { id },
      select: { id: true, slug: true, name: true },
    });
    if (!entity) {
      return NextResponse.json({ error: `Entity not found: ${id}` }, { status: 404 });
    }

    if (action === 'propose') {
      // Manual proposal — operator writes a TimeFOLD entry directly
      const { class: tfClass, phrase } = body as { class?: string; phrase?: string };

      if (!tfClass || !['STABILITY', 'NEWNESS'].includes(tfClass)) {
        return NextResponse.json(
          { error: 'class must be STABILITY or NEWNESS' },
          { status: 400 },
        );
      }

      // Use the locked phrase for the class — no custom phrases
      const lockedPhrase = TIMEFOLD_PHRASES[tfClass];

      const content = {
        class: tfClass,
        phrase: lockedPhrase,
        proposed_by: 'operator',
        approved_by: null, // still needs editorial approval
      };

      // Mark old entries as not current
      await db.interpretation_cache.updateMany({
        where: { entityId: id, outputType: 'TIMEFOLD' as any, isCurrent: true },
        data: { isCurrent: false },
      });

      // Write the new proposal
      await db.interpretation_cache.create({
        data: {
          entityId: id,
          outputType: 'TIMEFOLD' as any,
          content: content as any,
          promptVersion: 'manual-v1',
          isCurrent: true,
          generatedAt: new Date(),
        },
      });

      return NextResponse.json({
        entityId: id,
        action: 'propose',
        timefold: content,
      });
    }

    // approve or suppress — operates on the current TIMEFOLD entry
    const current = await db.interpretation_cache.findFirst({
      where: { entityId: id, outputType: 'TIMEFOLD' as any, isCurrent: true },
      select: { cacheId: true, content: true, promptVersion: true },
    });

    if (!current) {
      return NextResponse.json(
        { error: 'No current TIMEFOLD entry to act on. Propose one first.' },
        { status: 404 },
      );
    }

    const existingContent = current.content as Record<string, unknown>;
    const updatedContent = {
      ...existingContent,
      approved_by: action === 'approve' ? 'operator' : '__suppressed',
    };

    await db.interpretation_cache.update({
      where: { cacheId: current.cacheId },
      data: { content: updatedContent as any },
    });

    return NextResponse.json({
      entityId: id,
      action,
      timefold: updatedContent,
    });
  } catch (error: unknown) {
    console.error('[TimeFOLD Gate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update TimeFOLD', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
