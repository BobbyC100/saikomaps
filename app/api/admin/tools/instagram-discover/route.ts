/**
 * Instagram Discovery & Ingestion Tool API
 * POST /api/admin/tools/instagram-discover
 *
 * Operator actions for Instagram handle discovery and media ingestion.
 * Wraps existing scripts as one-click operator actions.
 *
 * Actions:
 *   { action: "backfill" }                              — extract handles from merchant_surfaces → entities.instagram (batch, background)
 *   { action: "ingest", slug: string }                  — fetch Instagram media for one entity via Graph API (background)
 *   { action: "ingest", batch: true }                   — fetch Instagram media for all entities with handles (background)
 *   { action: "set", entityId: string, handle: string } — manually set handle for one entity (inline)
 *   { action: "set", entityId: string, none: true }     — confirm entity has no Instagram (inline)
 *
 * Coverage Operations resolution tool (see COVOPS-APPROACH-V1).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action) {
      return NextResponse.json({ error: 'action is required (backfill | ingest | set)' }, { status: 400 });
    }

    const projectRoot = path.resolve(process.cwd());
    const tsxBin = path.join(projectRoot, 'node_modules', '.bin', 'tsx');

    // ── Backfill: extract handles from merchant_surfaces → entities.instagram ──
    if (action === 'backfill') {
      const args = ['-r', './scripts/load-env.js', tsxBin, 'scripts/backfill-instagram-handles.ts'];
      if (body.force) args.push('--force');
      if (body.dryRun) args.push('--dry-run');

      const child = spawn('node', args, {
        cwd: projectRoot,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      });
      child.unref();

      return NextResponse.json(
        { status: 'queued', action: 'backfill', message: 'Instagram handle backfill started in background' },
        { status: 202 },
      );
    }

    // ── Ingest: fetch Instagram media via Graph API ──
    if (action === 'ingest') {
      const args = ['-r', './scripts/load-env.js', tsxBin, 'scripts/ingest-instagram.ts'];

      if (body.batch) {
        args.push('--batch');
        if (body.mediaLimit) args.push(`--media-limit=${body.mediaLimit}`);
        if (body.delay) args.push(`--delay=${body.delay}`);
      } else if (body.slug) {
        const entity = await db.entities.findUnique({
          where: { slug: body.slug },
          select: { id: true, slug: true, name: true, instagram: true },
        });

        if (!entity) {
          return NextResponse.json({ error: `Entity not found: ${body.slug}` }, { status: 404 });
        }
        if (!entity.instagram || entity.instagram === 'NONE') {
          return NextResponse.json(
            { error: 'Entity has no Instagram handle', slug: entity.slug, name: entity.name },
            { status: 422 },
          );
        }

        args.push(`--username=${entity.instagram}`, `--entity-id=${entity.id}`);
        if (body.mediaLimit) args.push(`--media-limit=${body.mediaLimit}`);
      } else {
        return NextResponse.json(
          { error: 'ingest requires slug (single) or batch: true' },
          { status: 400 },
        );
      }

      if (body.dryRun) args.push('--dry-run');

      const child = spawn('node', args, {
        cwd: projectRoot,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      });
      child.unref();

      return NextResponse.json(
        {
          status: 'queued',
          action: 'ingest',
          slug: body.slug ?? null,
          batch: body.batch ?? false,
          message: body.batch
            ? 'Batch Instagram ingestion started in background'
            : `Instagram ingestion started for ${body.slug}`,
        },
        { status: 202 },
      );
    }

    // ── Set: manually set or confirm-none Instagram handle (inline) ──
    if (action === 'set') {
      const { entityId, handle, none } = body as {
        entityId?: string;
        handle?: string;
        none?: boolean;
      };

      if (!entityId) {
        return NextResponse.json({ error: 'entityId is required for set action' }, { status: 400 });
      }

      const entity = await db.entities.findUnique({
        where: { id: entityId },
        select: { id: true, slug: true, name: true, instagram: true },
      });

      if (!entity) {
        return NextResponse.json({ error: `Entity not found: ${entityId}` }, { status: 404 });
      }

      // Confirm none
      if (none) {
        await db.entities.update({
          where: { id: entityId },
          data: { instagram: 'NONE' },
        });

        return NextResponse.json({
          entityId,
          slug: entity.slug,
          name: entity.name,
          instagram: 'NONE',
          previousInstagram: entity.instagram,
          confirmedNone: true,
        });
      }

      // Set handle
      if (!handle) {
        return NextResponse.json(
          { error: 'handle is required (or set none: true to confirm no Instagram)' },
          { status: 400 },
        );
      }

      // Clean handle: extract from URL, strip @
      let cleanHandle = handle.trim();
      if (cleanHandle.includes('instagram.com/')) {
        const match = cleanHandle.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
        if (match) cleanHandle = match[1];
      }
      cleanHandle = cleanHandle.replace(/^@/, '').replace(/\/$/, '');

      if (!/^[a-zA-Z0-9._]+$/.test(cleanHandle)) {
        return NextResponse.json(
          { error: `Invalid Instagram handle format: "${cleanHandle}"` },
          { status: 400 },
        );
      }

      await db.entities.update({
        where: { id: entityId },
        data: { instagram: cleanHandle },
      });

      return NextResponse.json({
        entityId,
        slug: entity.slug,
        name: entity.name,
        instagram: cleanHandle,
        previousInstagram: entity.instagram,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Must be backfill | ingest | set` },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('[Instagram Discover] Error:', error);
    return NextResponse.json(
      { error: 'Failed to execute Instagram action', message: error.message },
      { status: 500 },
    );
  }
}
