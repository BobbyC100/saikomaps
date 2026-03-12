/**
 * Admin Enrich API
 * POST /api/admin/enrich/[slug] — trigger ERA enrichment pipeline for an entity.
 *
 * Marks entity status OPEN (so enrich-place.ts can find it), then spawns
 * the enrichment pipeline in the background. Returns 202 immediately.
 *
 * Client can poll the place API or check entities.last_enriched_at / enrichment_stage
 * for progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spawn } from 'child_process';
import path from 'path';

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
