/**
 * Health Check Endpoint
 *
 * Returns 200 if the app is running and the database is reachable.
 * Returns 503 if the database connection fails.
 *
 * Wire this URL to an uptime monitor (UptimeRobot, Better Uptime, Vercel Checks, etc.)
 * Expected response time: <500ms
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const start = Date.now();

  try {
    // Lightweight query — confirms connection pool + DB are alive
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
        db: 'connected',
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        db: 'unreachable',
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
