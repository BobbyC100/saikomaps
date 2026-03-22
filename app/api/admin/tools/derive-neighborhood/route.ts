/**
 * Derive Neighborhood Tool API
 * POST /api/admin/tools/derive-neighborhood
 *
 * Body: { entityId: string }               — derive for single entity, return result inline
 * Body: { batch: true, limit?: number }     — spawn backfill script in background, return 202
 *
 * This is the first Coverage Operations resolution tool (see COVOPS-APPROACH-V1).
 * Strategy: local LA boundary polygon lookup (free, instant) → Google reverse geocode fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deriveNeighborhood } from '@/lib/geo/derive-neighborhood';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Batch mode: spawn background script ──────────────────────────────
    if (body.batch === true) {
      const projectRoot = path.resolve(process.cwd());
      const tsxBin = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
      const args = ['-r', './scripts/load-env.js', tsxBin, 'scripts/backfill-neighborhood.ts'];
      if (body.limit) args.push('--limit', String(body.limit));

      const child = spawn('node', args, {
        cwd: projectRoot,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      });
      child.unref();

      return NextResponse.json(
        { status: 'queued', message: 'Neighborhood backfill started in background' },
        { status: 202 },
      );
    }

    // ── Single entity mode ───────────────────────────────────────────────
    const { entityId } = body as { entityId?: string };
    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }

    const entity = await db.entities.findUnique({
      where: { id: entityId },
      select: { id: true, slug: true, name: true, latitude: true, longitude: true, neighborhood: true },
    });

    if (!entity) {
      return NextResponse.json({ error: `Entity not found: ${entityId}` }, { status: 404 });
    }

    const lat = entity.latitude ? Number(entity.latitude) : NaN;
    const lng = entity.longitude ? Number(entity.longitude) : NaN;

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Entity has no coordinates', entityId, slug: entity.slug },
        { status: 422 },
      );
    }

    const result = await deriveNeighborhood(lat, lng);

    if (!result) {
      return NextResponse.json({
        entityId,
        slug: entity.slug,
        name: entity.name,
        neighborhood: null,
        source: null,
        message: 'Could not derive neighborhood from boundary or Google',
      });
    }

    // Update entities table
    await db.entities.update({
      where: { id: entityId },
      data: { neighborhood: result.neighborhood },
    });

    // Update canonical_entity_state if it exists (updateMany returns 0 if no row — no error)
    await db.canonical_entity_state.updateMany({
      where: { entityId: entityId },
      data: { neighborhood: result.neighborhood },
    });

    return NextResponse.json({
      entityId,
      slug: entity.slug,
      name: entity.name,
      neighborhood: result.neighborhood,
      previousNeighborhood: entity.neighborhood,
      source: result.source,
    });
  } catch (error: any) {
    console.error('[Derive Neighborhood] Error:', error);
    return NextResponse.json(
      { error: 'Failed to derive neighborhood', message: error.message },
      { status: 500 },
    );
  }
}
