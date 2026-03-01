/**
 * Dev server wrapper
 * Loads env vars and starts Next.js dev server
 * Bypasses NODE_OPTIONS issues by not using -r flag
 * Prints DATABASE banner + lightweight probes once at startup.
 */

// Load env before any imports
require('./load-env.js');

// Guardrail: Clear NODE_OPTIONS unconditionally (dev doesn't need it)
// Prevents: /usr/local/bin/node: --r= is not allowed in NODE_OPTIONS
if (process.env.NODE_OPTIONS) {
  console.warn('⚠️  Clearing NODE_OPTIONS (was:', process.env.NODE_OPTIONS, ')');
  delete process.env.NODE_OPTIONS;
}

const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('path');

// ---------------------------------------------------------------------------
// STARTUP DATABASE BANNER (runs once)
// ---------------------------------------------------------------------------
const rawUrl = process.env.DATABASE_URL;
if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
  console.error('\nFATAL: DATABASE_URL not defined.\n');
  process.exit(1);
}

// Detect possible DATABASE_URL corruption (e.g. concatenated with placeholder)
if (
  rawUrl.includes('YOUR_NEON') ||
  rawUrl.includes('requireDATABASE_URL') ||
  rawUrl.includes('DATABASE_URL=')
) {
  console.error('\n[dev.js] FATAL: DATABASE_URL appears corrupted (contains placeholder or concatenation).');
  console.error('[dev.js] DATABASE_URL length:', rawUrl.length, '| snippet:', rawUrl.substring(0, 80) + '...');
  process.exit(1);
}

function redactPassword(url) {
  try {
    return url.replace(/^([^:]+:\/\/[^:]+):([^@]+)(@.*)$/, '$1:***$3');
  } catch {
    return '***redacted***';
  }
}

function classifyDb(url) {
  try {
    const match = url.match(/@([^/]+)\//);
    const host = (match ? match[1].split(':')[0] : '').toLowerCase();
    if (host.includes('neon.tech')) return 'NEON';
    if (host === 'localhost' || host === '127.0.0.1') return 'LOCAL';
    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

function parseDbUrl(url) {
  try {
    const atMatch = url.match(/@([^/]+)\//);
    const host = atMatch ? atMatch[1].split(':')[0] : '?';
    const pathMatch = url.match(/@[^/]+\/([^?]+)/);
    const db = pathMatch ? pathMatch[1] : '?';
    const schemaMatch = url.match(/[?&]schema=([^&]+)/);
    const schema = schemaMatch ? schemaMatch[1].toLowerCase() : 'public';
    return { host, db, schema };
  } catch {
    return { host: '?', db: '?', schema: 'public' };
  }
}

const classification = classifyDb(rawUrl);
const { host, db, schema } = parseDbUrl(rawUrl);

console.log('\n' + '='.repeat(60));
console.log('  DEV DATABASE BANNER (npm run dev)');
console.log('='.repeat(60));
console.log('  DATABASE_URL:', redactPassword(rawUrl));
console.log('  CLASSIFICATION:', classification);
console.log('  HOST:', host);
console.log('  DATABASE:', db);
console.log('  SCHEMA:', schema);
console.log('  ENV LOAD ORDER: .env → .env.local (override=true)');
console.log('='.repeat(60) + '\n');

// ---------------------------------------------------------------------------
// DEV-ONLY PROBES (run once at startup; never crash the server)
// ---------------------------------------------------------------------------
async function runProbes() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const schemaRows = await prisma.$queryRawUnsafe(`
      SELECT
        to_regclass('public.places') IS NOT NULL AS has_places,
        EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public'
            AND table_name='places'
            AND column_name='business_status'
        ) AS has_business_status,
        EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public'
            AND table_name='places'
            AND column_name='google_places_attributes'
        ) AS has_google_places_attributes
    `);
    const s = Array.isArray(schemaRows) && schemaRows[0] ? schemaRows[0] : {};
    console.log(
      'DB PROBE schema: places=' + !!s.has_places + ' business_status=' + !!s.has_business_status + ' google_places_attributes=' + !!s.has_google_places_attributes
    );

    const countRows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS places_count FROM public.places');
    const placesCount = Array.isArray(countRows) && countRows[0] && typeof countRows[0].places_count === 'number' ? countRows[0].places_count : 0;
    console.log('DB PROBE data: places_count=' + placesCount);

    if (classification === 'LOCAL' && placesCount < 100) {
      console.log('  WARNING: LOCAL DB HAS LOW DATA — EXPECT 404s');
    }
  } catch (err) {
    console.log('DB PROBE schema: (query failed:', err && err.message ? err.message : err, ')');
    console.log('DB PROBE data: (skipped)');
  } finally {
    await prisma.$disconnect();
  }
}

// Run probes then start Next dev server (banner + probes run once at startup)
const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next');

const DEV_PORT = 3000;
const BIND_CHECK_POLL_MS = 500;
const BIND_CHECK_DEADLINE_MS = 3000;

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onDone = (ok) => {
      try {
        socket.destroy();
      } catch (_) {}
      resolve(ok);
    };
    socket.setTimeout(500);
    socket.on('connect', () => onDone(true));
    socket.on('error', () => onDone(false));
    socket.on('timeout', () => onDone(false));
    socket.connect(port, host);
  });
}

function runNextDev(nextBinPath, args) {
  const hasPort = args.some((a) => a === '-p' || a === '--port');
  const devArgs = [...args];
  if (!hasPort) {
    devArgs.push('-p', String(DEV_PORT));
  }
  // Skip -H 0.0.0.0 for diagnostics: NEXT_DEV_SKIP_HOST=1 npm run dev
  if (!process.env.NEXT_DEV_SKIP_HOST) {
    devArgs.push('-H', '0.0.0.0');
  } else {
    console.log('[dev.js] NEXT_DEV_SKIP_HOST=1 — using default host (no -H 0.0.0.0)');
  }

  const env = {
    ...process.env,
    // Skip Turbopack disable for diagnostics: NEXT_DEV_USE_TURBOPACK=1 npm run dev
    NEXT_DISABLE_TURBOPACK: process.env.NEXT_DEV_USE_TURBOPACK ? '0' : '1',
  };

  const cmd = ['node', nextBinPath, 'dev', ...devArgs];
  console.log('[dev.js] Command:', cmd.join(' '));
  console.log('[dev.js] NEXT_DISABLE_TURBOPACK=' + env.NEXT_DISABLE_TURBOPACK);

  const child = spawn('node', [nextBinPath, 'dev', ...devArgs], {
    stdio: 'inherit',
    env,
  });

  console.log('[dev.js] child.pid:', child.pid);

  child.on('exit', (code, signal) => {
    console.error('\n[dev.js] *** CHILD EXIT *** code=', code, 'signal=', signal ?? 'none');
  });

  const forward = (sig) => {
    try {
      child.kill(sig);
    } catch (_) {}
  };
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  child.on('error', (err) => {
    console.error('\n[dev.js] *** CHILD ERROR *** Failed to start next dev:', err);
  });

  const startTime = Date.now();
  const twoSecondMark = startTime + 2000;
  const bindCheckDeadline = startTime + BIND_CHECK_DEADLINE_MS;
  let bindCheckSucceeded = false;
  let twoSecondLogged = false;

  async function pollUntilBound() {
    while (Date.now() < bindCheckDeadline) {
      const ok = await checkPort(DEV_PORT);
      if (ok) {
        bindCheckSucceeded = true;
        console.log('[dev.js] Port', DEV_PORT, 'LISTENING');
        // Log whether child is still alive 5s after bind (helps debug premature exit)
        setTimeout(() => {
          try {
            process.kill(child.pid, 0);
            console.log('[dev.js] Child still alive 5s after Port LISTENING (pid=', child.pid, ')');
          } catch (_) {
            console.error('[dev.js] *** Child EXITED within 5s of Port LISTENING ***');
          }
        }, 5000);
        return;
      }
      const now = Date.now();
      if (now >= twoSecondMark && !twoSecondLogged) {
        twoSecondLogged = true;
        console.log('[dev.js] Port', DEV_PORT, 'check (2s): NOT listening');
      }
      await new Promise((r) => setTimeout(r, BIND_CHECK_POLL_MS));
    }
    if (!bindCheckSucceeded) {
      console.error('\n[dev.js] FATAL: Server did not bind to port', DEV_PORT, 'within', BIND_CHECK_DEADLINE_MS / 1000, 's.');
      console.error('[dev.js] Run: lsof -nP -iTCP:' + DEV_PORT + ' -sTCP:LISTEN');
      process.exit(1);
    }
  }

  const bindCheckPromise = pollUntilBound();

  return new Promise((resolve) => {
    child.on('close', (code, signal) => {
      console.error('\n[dev.js] *** CHILD CLOSE *** code=', code, 'signal=', signal ?? 'none');
      if (signal) {
        resolve(1);
      } else {
        resolve(code ?? 0);
      }
    });
    bindCheckPromise.catch((err) => {
      console.error('[dev.js] Bind check error:', err);
      resolve(1);
    });
  });
}

(async () => {
  try {
    await runProbes();
  } catch (e) {
    console.error('[dev.js] Probe error:', e);
  }

  const nextArgs = process.argv.slice(2);
  const exitCode = await runNextDev(nextBin, nextArgs);
  process.exit(exitCode);
})();
