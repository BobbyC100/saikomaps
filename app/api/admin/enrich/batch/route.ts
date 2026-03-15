/**
 * Batch Enrich API
 * POST /api/admin/enrich/batch — queue multiple slugs for sequential enrichment.
 *
 * Accepts: { slugs: string[] }
 *
 * Promotes all CANDIDATE entities to OPEN, then spawns a single background
 * process that enriches each slug sequentially. Returns 202 immediately —
 * the browser does NOT need to stay open.
 *
 * Progress can be checked later via GET /api/admin/enrich/batch (returns
 * status of the most recent batch run) or per-entity via the coverage page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// In-memory batch state (survives as long as the dev server is running)
let currentBatch: {
  id: string;
  slugs: string[];
  started: string;
  completed: string[];
  failed: string[];
  status: 'running' | 'done' | 'error';
} | null = null;

export async function GET() {
  if (!currentBatch) {
    return NextResponse.json({ batch: null, message: 'No batch has been run yet' });
  }
  return NextResponse.json({ batch: currentBatch });
}

export async function POST(request: NextRequest) {
  try {
    const { slugs } = await request.json();

    if (!Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json({ error: 'Provide { slugs: string[] }' }, { status: 400 });
    }

    // Validate all slugs exist
    const entities = await db.entities.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, status: true },
    });

    const foundSlugs = new Set(entities.map((e) => e.slug));
    const missing = slugs.filter((s: string) => !foundSlugs.has(s));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Entities not found: ${missing.join(', ')}` },
        { status: 404 }
      );
    }

    // Promote all CANDIDATE → OPEN
    const candidates = entities.filter((e) => e.status === 'CANDIDATE');
    if (candidates.length > 0) {
      await db.entities.updateMany({
        where: { id: { in: candidates.map((e) => e.id) } },
        data: { status: 'OPEN' },
      });
    }

    // Set up batch tracking
    const batchId = `batch-${Date.now()}`;
    currentBatch = {
      id: batchId,
      slugs,
      started: new Date().toISOString(),
      completed: [],
      failed: [],
      status: 'running',
    };

    // Create a wrapper script that runs enrich-place.ts for each slug sequentially
    const projectRoot = path.resolve(process.cwd());
    const logsDir = path.join(projectRoot, 'data', 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const logFile = path.join(logsDir, `enrich-batch-${Date.now()}.log`);
    const slugList = slugs.join('\n');

    // Write a tiny shell script that loops through slugs
    const scriptContent = `#!/bin/bash
set -e
cd "${projectRoot}"

SLUGS="${slugList}"

echo "[batch-enrich] Starting batch of ${slugs.length} slugs at $(date)" >> "${logFile}"

for slug in $SLUGS; do
  echo "[batch-enrich] Enriching $slug at $(date)" >> "${logFile}"
  node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug="$slug" >> "${logFile}" 2>&1 || {
    echo "[batch-enrich] FAILED: $slug" >> "${logFile}"
  }
  echo "[batch-enrich] Finished $slug at $(date)" >> "${logFile}"
done

echo "[batch-enrich] Batch complete at $(date)" >> "${logFile}"
`;

    const scriptPath = path.join(logsDir, `batch-${Date.now()}.sh`);
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    const child = spawn('bash', [scriptPath], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });
    child.unref();

    return NextResponse.json(
      {
        batchId,
        slugs: slugs.length,
        promoted: candidates.length,
        message: `Enrichment queued for ${slugs.length} places. Runs in background — safe to close this page.`,
        logFile,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('[Batch Enrich API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start batch enrichment', message: error.message },
      { status: 500 }
    );
  }
}
