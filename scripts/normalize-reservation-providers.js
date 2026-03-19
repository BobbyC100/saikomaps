#!/usr/bin/env node
/**
 * One-time normalization: collapse reservation_provider values to lowercase slugs.
 *
 * Before: "Resy", "resy", "OpenTable", "opentable", "Tock", "tock", "SevenRooms", "Yelp"
 * After:  "resy", "opentable", "tock", "sevenrooms", "yelp"
 *
 * Also normalizes merchant_surface_scans.reservation_platform for consistency.
 *
 * Usage:
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/normalize-reservation-providers.js
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/normalize-reservation-providers.js --dry-run
 */
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');

const NORMALIZATION_MAP = {
  'Resy': 'resy',
  'OpenTable': 'opentable',
  'Tock': 'tock',
  'SevenRooms': 'sevenrooms',
  'Yelp': 'yelp',
};

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log(`=== Normalize reservation providers ${dryRun ? '(DRY RUN)' : ''} ===\n`);

  // 1. Show current state
  const { rows: before } = await client.query(`
    SELECT reservation_provider, COUNT(*)::int AS count
    FROM merchant_signals
    WHERE reservation_provider IS NOT NULL
    GROUP BY reservation_provider
    ORDER BY count DESC
  `);
  console.log('Current merchant_signals.reservation_provider values:');
  for (const r of before) {
    console.log(`  "${r.reservation_provider}": ${r.count}`);
  }
  console.log('');

  // 2. Normalize merchant_signals.reservation_provider
  let totalUpdated = 0;
  for (const [from, to] of Object.entries(NORMALIZATION_MAP)) {
    if (dryRun) {
      const { rows: [{ count }] } = await client.query(
        `SELECT COUNT(*)::int AS count FROM merchant_signals WHERE reservation_provider = $1`,
        [from]
      );
      if (count > 0) console.log(`  Would update "${from}" → "${to}": ${count} rows`);
    } else {
      const { rowCount } = await client.query(
        `UPDATE merchant_signals SET reservation_provider = $2 WHERE reservation_provider = $1`,
        [from, to]
      );
      if (rowCount > 0) {
        console.log(`  Updated "${from}" → "${to}": ${rowCount} rows`);
        totalUpdated += rowCount;
      }
    }
  }

  // 3. Normalize merchant_surface_scans.reservation_platform (same map)
  for (const [from, to] of Object.entries(NORMALIZATION_MAP)) {
    if (dryRun) {
      const { rows: [{ count }] } = await client.query(
        `SELECT COUNT(*)::int AS count FROM merchant_surface_scans WHERE reservation_platform = $1`,
        [from]
      );
      if (count > 0) console.log(`  Would update scans "${from}" → "${to}": ${count} rows`);
    } else {
      const { rowCount } = await client.query(
        `UPDATE merchant_surface_scans SET reservation_platform = $2 WHERE reservation_platform = $1`,
        [from, to]
      );
      if (rowCount > 0) {
        console.log(`  Updated scans "${from}" → "${to}": ${rowCount} rows`);
        totalUpdated += rowCount;
      }
    }
  }

  // 4. Show after state
  if (!dryRun) {
    const { rows: after } = await client.query(`
      SELECT reservation_provider, COUNT(*)::int AS count
      FROM merchant_signals
      WHERE reservation_provider IS NOT NULL
      GROUP BY reservation_provider
      ORDER BY count DESC
    `);
    console.log('\nAfter normalization:');
    for (const r of after) {
      console.log(`  "${r.reservation_provider}": ${r.count}`);
    }
    console.log(`\nTotal rows updated: ${totalUpdated}`);
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
