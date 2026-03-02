#!/usr/bin/env node
/**
 * Launch Readiness v0 — report + optional write to entity_coverage_status
 *
 * Uses config/env + config/db. Requires .env.local with DATABASE_URL and DB_ENV.
 *
 * Usage:
 *   npx tsx scripts/coverage-launch-readiness-v0.ts [options]
 *   npx tsx scripts/coverage-launch-readiness-v0.ts --limit 25 --only-missing
 *   npx tsx scripts/coverage-launch-readiness-v0.ts --write-status --execute
 *
 * Options:
 *   --limit <n>       Max entities to list (default 50)
 *   --only-missing     Show only not launch-ready
 *   --write-status     Write to entity_coverage_status (requires --execute)
 *   --dry-run          Default true; refuse write without --execute
 *   --execute          Required to actually write
 */

import { env } from '@/config/env';
import { db } from '@/config/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LaunchReadinessRow {
  entity_id: string;
  name: string;
  category: string | null;
  score: number;
  is_launch_ready: boolean;
  missing: string[];
  computed_at: Date;
}

function parseDatabaseUrl(url: string | undefined): { host: string; database: string; user: string } {
  if (!url || typeof url !== 'string') return { host: '', database: '', user: '' };
  try {
    const raw = url.trim().replace(/^["']|["']$/g, '');
    const userMatch = raw.match(/^postgres(?:ql)?:\/\/([^:]+)(?::)/);
    const hostMatch = raw.match(/@([^/:@]+)(?::\d+)?(?:\/([^?]*))?/);
    const host = hostMatch?.[1]?.trim() ?? '';
    const database = (hostMatch?.[2] ?? '').split('?')[0].trim() || '';
    const user = userMatch?.[1] ?? '';
    return { host, database, user };
  } catch {
    return { host: '', database: '', user: '' };
  }
}

function parseArgs(): {
  limit: number;
  onlyMissing: boolean;
  writeStatus: boolean;
  execute: boolean;
} {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((a) => a.startsWith('--limit=')) ?? argv.find((a) => a === '--limit');
  const limit = limitArg
    ? parseInt(
        limitArg.includes('=') ? limitArg.split('=')[1] ?? '' : argv[argv.indexOf('--limit') + 1] ?? '',
        10
      ) || 50
    : 50;
  const onlyMissing = argv.includes('--only-missing');
  const writeStatus = argv.includes('--write-status');
  const execute = argv.includes('--execute');

  return { limit, onlyMissing, writeStatus, execute };
}

async function main() {
  const { limit, onlyMissing, writeStatus, execute } = parseArgs();

  if (writeStatus && !execute) {
    console.error('Refusing to write: --write-status requires --execute. Use --execute to confirm.');
    process.exit(1);
  }

  const { host, database, user } = parseDatabaseUrl(env.DATABASE_URL);
  console.log('--- Launch Readiness v0 ---');
  console.log('DB_ENV:', env.DB_ENV);
  console.log('host:', host || '(unparseable)');
  console.log('database:', database || '(unparseable)');
  console.log('user:', user || '(unparseable)');
  console.log('');

  const prisma = db.admin;

  const rows = await prisma.$queryRaw<LaunchReadinessRow[]>`
    SELECT entity_id, name, category, score, is_launch_ready, missing, computed_at
    FROM public.v_entity_launch_readiness_v0
  `;

  const total = rows.length;
  const readyCount = rows.filter((r) => r.is_launch_ready).length;
  const notReadyCount = total - readyCount;

  console.log('Summary');
  console.log('  total entities:', total);
  console.log('  launch-ready:', readyCount);
  console.log('  not ready:', notReadyCount);
  console.log('');

  // Top missing fields aggregation
  const missingCounts: Record<string, number> = {};
  for (const r of rows) {
    const missing = (r.missing ?? []) as string[];
    for (const m of missing) {
      missingCounts[m] = (missingCounts[m] ?? 0) + 1;
    }
  }
  const topMissing = Object.entries(missingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('Top missing fields');
  for (const [key, count] of topMissing) {
    console.log(`  ${key}: ${count}`);
  }
  if (topMissing.length === 0) {
    console.log('  (none)');
  }
  console.log('');

  const toList = onlyMissing ? rows.filter((r) => !r.is_launch_ready) : rows;
  const limited = toList.slice(0, limit);

  console.log('Entities' + (onlyMissing ? ' (not launch-ready)' : '') + ` (limit ${limit})`);
  for (const r of limited) {
    const missingStr = (r.missing ?? []) as string[];
    console.log(`  ${r.entity_id} | ${r.name} | score=${r.score} | missing=[${missingStr.join(', ')}]`);
  }
  console.log('');

  if (writeStatus && execute) {
    console.log('Writing to entity_coverage_status...');
    let updated = 0;
    let created = 0;
    for (const r of rows) {
      const status = r.is_launch_ready ? 'LAUNCH_READY' : 'NEEDS_WORK';
      const missing = (r.missing ?? []) as string[];
      const missingJson = missing.length > 0 ? missing : null;

      const existing = await prisma.entity_coverage_status.findFirst({
        where: { entityId: r.entity_id },
      });

      const data = {
        launchReadinessScore: r.score,
        launchReadinessStatus: status,
        launchReadinessComputedAt: new Date(),
        launchReadinessMissing: missingJson as object | null,
      };

      if (existing) {
        await prisma.entity_coverage_status.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await prisma.entity_coverage_status.create({
          data: {
            entityId: r.entity_id,
            dedupe_key: `launch_readiness:${r.entity_id}`,
            ...data,
          },
        });
        created++;
      }
    }
    console.log(`  updated: ${updated}, created: ${created}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
