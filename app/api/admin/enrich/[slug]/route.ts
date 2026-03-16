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

    const stageNum = entity.enrichment_stage ? parseInt(entity.enrichment_stage, 10) : null;
    // "done" means stage 7 reached (enrichment_stage is the live progress tracker;
    // last_enriched_at is historical and should NOT be used for done detection since
    // it persists across re-runs)
    const done = stageNum === 7;
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

    // Promote CANDIDATE → OPEN so the enrichment pipeline can locate it,
    // and reset enrichment_stage + last_enriched_at so pipeline re-runs all stages
    await db.entities.update({
      where: { slug },
      data: {
        ...(entity.status === 'CANDIDATE' ? { status: 'OPEN' } : {}),
        enrichment_stage: null,
        last_enriched_at: null,
      },
    });

    // Spawn enrichment pipeline in the background with logging
    const projectRoot = path.resolve(process.cwd());
    const fs = await import('fs');
    const logFile = path.join(projectRoot, 'data', 'logs', `enrich-${slug}-${Date.now()}.log`);

    // Write startup log
    fs.writeFileSync(logFile, `[${new Date().toISOString()}] Starting enrichment for ${slug}\n`);

    const logFd = fs.openSync(logFile, 'a');

    const tsxBin = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
    const child = spawn(
      'node',
      ['-r', './scripts/load-env.js', tsxBin, 'scripts/enrich-place.ts', `--slug=${slug}`],
      {
        cwd: projectRoot,
        detached: false,  // Changed from true - let parent track the process
        stdio: ['ignore', logFd, logFd],
        env: { ...process.env },
      }
    );

    // Close log fd in parent; child has its own copy
    logFd;  // Keep reference to prevent GC issues

    // Monitor process and close log when done
    child.on('close', (code) => {
      try {
        fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Process exited with code: ${code}\n`);
        fs.closeSync(logFd);
      } catch (e) {
        // Log already closed, ignore
      }
    });

    child.on('error', (err) => {
      try {
        fs.appendFileSync(logFile, `\n[ERROR] ${err.message}\n`);
        fs.closeSync(logFd);
      } catch (e) {
        // Log already closed, ignore
      }
    });

    // Don't wait for child to complete - let it run in background
    // but don't unref() so we can monitor its completion

    return NextResponse.json(
      { slug, name: entity.name, status: 'queued', message: 'Enrichment started in background' },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('[Enrich API] Error:', error);
    return NextResponse.json({ error: 'Failed to start enrichment', message: error.message }, { status: 500 });
  }
}
