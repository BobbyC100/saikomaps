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
 *   7 = Interpretation (AI)
 *
 * Coverage Operations resolution tool (see COVOPS-APPROACH-V1).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import os from 'os';

const VALID_STAGES = [1, 2, 3, 4, 5, 6, 7];
const STAGE_LABELS: Record<number, string> = {
  1: 'Google Places identity commit',
  2: 'Surface discovery',
  3: 'Surface fetch',
  4: 'Surface parse',
  5: 'Identity signal extraction (AI)',
  6: 'Website enrichment',
  7: 'Interpretation (AI)',
};

function normalizeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug: rawSlug, stage, from } = body as { slug?: string; stage?: number; from?: number };
    const slug = rawSlug ? normalizeSlug(rawSlug) : undefined;

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
      select: { id: true, slug: true, name: true, status: true, enrichmentStage: true },
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

    // Build spawn args — all stages now go through enrich-place.ts which handles
    // stage tracking (enrichmentStage updates) and skip logic.
    const projectRoot = path.resolve(process.cwd());
    let description: string;

    // Scripts require `node -r ./scripts/load-env.js` to load .env.local
    // (GOOGLE_PLACES_API_KEY, DATABASE_URL, etc.). Using `npx tsx` alone
    // starts a fresh process without those vars.
    const tsxBin = path.join(projectRoot, 'node_modules', '.bin', 'tsx');

    const spawnArgs = ['-r', './scripts/load-env.js', tsxBin, 'scripts/enrich-place.ts', `--slug=${slug}`];
    if (stage !== undefined) {
      spawnArgs.push(`--only=${stage}`);
      description = `Running stage ${stage} (${STAGE_LABELS[stage]}) only`;
    } else if (from !== undefined) {
      spawnArgs.push(`--from=${from}`);
      description = `Running stages ${from}-7 (from ${STAGE_LABELS[from]})`;
    } else {
      description = 'Running full enrichment pipeline (stages 1-7)';
    }
    // When targeting a specific stage, pass --force so shouldSkip() is bypassed —
    // the operator explicitly asked to re-run this stage.
    if (stage !== undefined || from !== undefined) {
      spawnArgs.push('--force');
    }

    const isServerlessRuntime = Boolean(process.env.VERCEL);
    if (isServerlessRuntime) {
      // Serverless runtimes are not reliable for detached/background child jobs.
      // Run synchronously so callers get a real success/failure result.
      const result = spawnSync('node', spawnArgs, {
        cwd: projectRoot,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (result.status !== 0) {
        const stderr = result.stderr?.toString().trim();
        const stdout = result.stdout?.toString().trim();
        const message = stderr || stdout || `enrich-place exited with status ${result.status}`;
        return NextResponse.json(
          { error: 'Failed to run enrichment stage', message },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          slug: entity.slug,
          name: entity.name,
          status: 'completed',
          stage: stage ?? null,
          from: from ?? null,
          description,
          // Shape this like other "completed" tools so Coverage Ops can auto-resolve rows.
          results: {
            enrichment: {
              saved: true,
              discovered: `stage-${stage ?? from ?? 'full'}`,
            },
          },
        },
        { status: 200 },
      );
    }

    const fs = await import('fs');
    const timestamp = Date.now();
    const defaultLogDir = path.join(projectRoot, 'data', 'logs');
    // In serverless runtimes (e.g. Vercel), /var/task is read-only. Use temp dir.
    const runtimeLogDir = process.env.VERCEL
      ? path.join(os.tmpdir(), 'saiko-logs')
      : defaultLogDir;
    const logFile = path.join(runtimeLogDir, `enrich-${slug}-${timestamp}.log`);

    let logFd: number | null = null;
    try {
      fs.mkdirSync(runtimeLogDir, { recursive: true });
      fs.writeFileSync(logFile, `[${new Date().toISOString()}] ${description} for ${slug}\n`);
      logFd = fs.openSync(logFile, 'a');
    } catch (logError: any) {
      console.warn(
        `[Enrich Stage] Logging disabled for ${slug}: ${logError?.message ?? String(logError)}`,
      );
    }

    const child = spawn('node', spawnArgs, {
      cwd: projectRoot,
      detached: false,
      stdio: logFd !== null ? ['ignore', logFd, logFd] : 'ignore',
      env: { ...process.env },
    });

    // Monitor process completion
    child.on('close', (code) => {
      try {
        if (logFd !== null) {
          fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Process exited with code: ${code}\n`);
          fs.closeSync(logFd);
        }
      } catch (_) {}
    });
    child.on('error', (err) => {
      try {
        if (logFd !== null) {
          fs.appendFileSync(logFile, `\n[ERROR] ${err.message}\n`);
          fs.closeSync(logFd);
        }
      } catch (_) {}
    });

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
