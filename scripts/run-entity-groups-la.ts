#!/usr/bin/env node
/**
 * LA-only entity groups: discover + link restaurant groups to places.
 * Wraps link-groups-to-places.ts with --la-only.
 *
 * Usage:
 *   npx tsx scripts/run-entity-groups-la.ts [--dry-run] [--verbose]
 */

import { spawnSync } from 'child_process';
import path from 'path';

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  const scriptArgs = ['--la-only'];
  if (dryRun) scriptArgs.push('--dry-run');

  const scriptPath = path.join(__dirname, 'link-groups-to-places.ts');
  const result = spawnSync(
    path.join(process.cwd(), 'node_modules/.bin/tsx'),
    [scriptPath, ...scriptArgs],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env },
    }
  );

  if (verbose && result.status !== 0) {
    console.error(`Exit code: ${result.status}`);
  }
  process.exit(result.status ?? 1);
}

main();
