/**
 * Targeted Enrichment Stage Re-run Tool API
 * POST /api/admin/tools/enrich-stage
 *
 * Run a specific enrichment stage (1-7) for an entity without re-running the full pipeline.
 * Wraps scripts/enrich-place.ts with --only and --from flags.
 *
 * Body: { slug: string, stage: number }              — run only this stage (background)
 * Body: { slug: string, from: number }               — run from this stage onward (background)
 * Body: { slug: string }                             — run full pipeline (same as /api/admin/enrich/[slug])
 *
 * Stage reference:
 *   1 = Google Places identity commit
 *   2 = Surface discovery
 *   3 = Surface fetch
 *   4 = Surface parse
 *   5 = Identity signal extraction (AI)
 *   6 = Website enrichment
 *   7 = Tagline generation (AI)
 *
 * Coverage Operations resolution tool (see COVOPS-APPROACH-V1).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spawn } from 'child_process';
import path from 'path';

const VALID_STAGES = [1, 2, 3, 4, 5, 6, 7];
const STAGE_LABELS: Record<number, string> = {
  1: 'Google Places identity commit',
  2: 'Surface discovery',
  3: 'Surface fetch',
  4: 'Surface parse',
  5: 'Identity signal extraction (AI)',
  6: 'Website enrichment',
  7: 'Tagline generation (AI)',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, stage, from } = body as { slug?: string; stage?: number; from?: number };

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    if (stage !== undefined && !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage: ${stage}. Must be 1-7.` },
        { status: 400 },
      );
    }

    if (from !== undefined && !VALID_STAGES.includes(from)) {
      return NextResponse.json(
        { error: `Invalid from: ${from}. Must be 1-7.` },
        { status: 400 },
      );
    }

    // Verify entity exists
    const entity = await db.entities.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, status: true, enrichment_stage: true },
    });

    if (!entity) {
      return NextResponse.json({ error: `Entity not found: ${slug}` }, { status: 404 });
    }

    // Promote CANDIDATE → OPEN so enrich-place.ts can find it
    if (entity.status === 'CANDIDATE') {
      await db.entities.update({
        where: { slug },
        data: { status: 'OPEN' },
      });
    }

    // Build spawn args
    const args = ['tsx', 'scripts/enrich-place.ts', `--slug=${slug}`];
    if (stage !== undefined) args.push(`--only=${stage}`);
    else if (from !== undefined) args.push(`--from=${from}`);

    const projectRoot = path.resolve(process.cwd());
    const child = spawn('npx', args, {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });
    child.unref();

    // Build response description
    let description: string;
    if (stage !== undefined) {
      description = `Running stage ${stage} (${STAGE_LABELS[stage]}) only`;
    } else if (from !== undefined) {
      description = `Running stages ${from}-7 (from ${STAGE_LABELS[from]})`;
    } else {
      description = 'Running full enrichment pipeline (stages 1-7)';
    }

    return NextResponse.json(
      {
        slug: entity.slug,
        name: entity.name,
        status: 'queued',
        description,
        stage: stage ?? null,
        from: from ?? null,
      },
      { status: 202 },
    );
  } catch (error: any) {
    console.error('[Enrich Stage] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start enrichment stage', message: error.message },
      { status: 500 },
    );
  }
}
