/**
 * Admin Enrich API
 * POST /api/admin/enrich/[slug] — trigger ERA enrichment pipeline for an entity.
 * GET  /api/admin/enrich/[slug] — poll enrichment status.
 *
 * POST: Marks entity status OPEN (so enrich-place.ts can find it), then spawns
 * the enrichment pipeline in the background. Returns 202 immediately.
 *
 * GET: Returns current enrichment state from entities.enrichment_stage + last_enriched_at.
 * Enrichment is considered "done" when enrichment_stage is non-null (any stage was written).
 * The caller can track: idle → queued → stage:N → done.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spawn } from 'child_process';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const entity = await db.entities.findUnique({
      where: { slug },
      select: { slug: true, name: true, status: true, enrichment_stage: true, last_enriched_at: true },
    });

    if (!entity) {
      return NextResponse.json({ error: `Entity not found: ${slug}` }, { status: 404 });
    }

    const done = entity.enrichment_stage !== null;
    return NextResponse.json({
      slug: entity.slug,
      name: entity.name,
      status: entity.status,
      enrichment_stage: entity.enrichment_stage,
      last_enriched_at: entity.last_enriched_at,
      done,
    });
  } catch (error: any) {
    console.error('[Enrich Status API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch enrichment status', message: error.message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const entity = await db.entities.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, status: true, last_enriched_at: true },
    });

    if (!entity) {
      return NextResponse.json({ error: `Entity not found: ${slug}` }, { status: 404 });
    }

    // Promote CANDIDATE → OPEN so the enrichment pipeline can locate it
    if (entity.status === 'CANDIDATE') {
      await db.entities.update({
        where: { slug },
        data: { status: 'OPEN' },
      });
    }

    // Spawn enrichment pipeline in the background (fire-and-forget)
    const projectRoot = path.resolve(process.cwd());
    const child = spawn(
      'npx',
      ['tsx', 'scripts/enrich-place.ts', `--slug=${slug}`],
      {
        cwd: projectRoot,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      }
    );
    child.unref();

    return NextResponse.json(
      { slug, name: entity.name, status: 'queued', message: 'Enrichment started in background' },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('[Enrich API] Error:', error);
    return NextResponse.json({ error: 'Failed to start enrichment', message: error.message }, { status: 500 });
  }
}
