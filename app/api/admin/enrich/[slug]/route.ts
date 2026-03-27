/**
 * Admin Enrich API
 * POST /api/admin/enrich/[slug] — trigger ERA enrichment pipeline for an entity.
 * GET  /api/admin/enrich/[slug] — poll enrichment status.
 *
 * POST: Marks enrichment status ENRICHING, then spawns the enrichment
 * pipeline in the background. Returns 202 immediately.
 *
 * GET: Returns current enrichment state from enrichmentStatus + enrichmentStage.
 * "done" is policy-driven and represented by enrichmentStatus === ENRICHED.
 * The caller can track: idle → queued → stage:N → done.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spawn } from 'child_process';
import path from 'path';

function normalizeSlugParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlugParam(rawSlug);

  try {
    const entity = await db.entities.findUnique({
      where: { slug },
      select: { slug: true, name: true, status: true, enrichmentStatus: true, enrichmentStage: true, lastEnrichedAt: true },
    });

    if (!entity) {
      return NextResponse.json({ error: `Entity not found: ${slug}` }, { status: 404 });
    }

    const done = entity.enrichmentStatus === 'ENRICHED';
    return NextResponse.json({
      slug: entity.slug,
      name: entity.name,
      status: entity.status,
      enrichmentStatus: entity.enrichmentStatus,
      enrichmentStage: entity.enrichmentStage,
      lastEnrichedAt: entity.lastEnrichedAt,
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
  const { slug: rawSlug } = await params;
  const slug = normalizeSlugParam(rawSlug);

  try {
    const entity = await db.entities.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, status: true, lastEnrichedAt: true },
    });

    if (!entity) {
      return NextResponse.json({ error: `Entity not found: ${slug}` }, { status: 404 });
    }

    // Mark enrichment as in progress and reset the live stage tracker.
    await db.entities.update({
      where: { slug },
      data: {
        enrichmentStatus: 'ENRICHING',
        enrichmentStage: null,
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
