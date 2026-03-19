#!/usr/bin/env node
/**
 * Backfill business_status + price_level from Google Places Details.
 * Targets entities that have GPID but missing business_status or price_level.
 * Also closes stale hours/phone issues by re-scanning.
 *
 * Usage:
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/backfill-status-and-price.js
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/backfill-status-and-price.js --limit=10
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/backfill-status-and-price.js --dry-run
 */
const { Client } = require('pg');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_PLACES_API_KEY not set');
  process.exit(1);
}

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const dryRun = args.includes('--dry-run');

const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const FIELDS = 'place_id,business_status,price_level';

async function fetchDetails(gpid) {
  const url = `${DETAILS_URL}?place_id=${encodeURIComponent(gpid)}&fields=${FIELDS}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') return null;
  return json.result;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const limitClause = limit ? `LIMIT ${limit}` : '';
  const { rows: entities } = await client.query(`
    SELECT id, name, google_place_id, business_status, price_level
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED', 'CANDIDATE')
      AND google_place_id IS NOT NULL
      AND (business_status IS NULL OR price_level IS NULL)
    ORDER BY name ASC
    ${limitClause}
  `);

  console.log(`\n🔍 Backfill business_status + price_level`);
  console.log(`   Entities to process: ${entities.length}`);
  if (dryRun) console.log('   Mode: DRY RUN');
  console.log('');

  let updated = 0;
  let failed = 0;
  let noData = 0;

  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    const progress = `[${i + 1}/${entities.length}]`;

    try {
      const details = await fetchDetails(e.google_place_id);
      if (!details) {
        console.log(`${progress} ❌ ${e.name} → no result`);
        failed++;
        continue;
      }

      const setClauses = [];
      const params = [];
      let paramIdx = 1;
      const filled = [];

      if (!e.business_status && details.business_status) {
        setClauses.push(`business_status = $${paramIdx++}`);
        params.push(details.business_status);
        filled.push(`status=${details.business_status}`);
      }

      if (e.price_level === null && details.price_level !== undefined) {
        setClauses.push(`price_level = $${paramIdx++}`);
        params.push(details.price_level);
        filled.push(`price=${details.price_level}`);
      }

      if (setClauses.length === 0) {
        // Google doesn't have this data either
        noData++;
        if (i < 20 || i % 50 === 0) {
          console.log(`${progress} · ${e.name} → Google has no status/price data`);
        }
        continue;
      }

      params.push(e.id);

      if (!dryRun) {
        await client.query(
          `UPDATE entities SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
          params
        );
      }

      console.log(`${progress} ✅ ${e.name} → ${filled.join(', ')}`);
      updated++;
    } catch (err) {
      console.log(`${progress} ❌ ${e.name} → ${err.message}`);
      failed++;
    }

    // Rate limit: ~8 QPS
    if (i < entities.length - 1) {
      await new Promise(r => setTimeout(r, 130));
    }
  }

  // Also close stale issues where data now exists
  if (!dryRun) {
    const { rowCount: staleHours } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'missing_hours' AND status = 'open'
        AND entity_id IN (SELECT id FROM entities WHERE hours IS NOT NULL)
    `);
    const { rowCount: stalePhone } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'missing_phone' AND status = 'open'
        AND entity_id IN (SELECT id FROM entities WHERE phone IS NOT NULL AND phone != '')
    `);
    const { rowCount: staleWebsite } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'missing_website' AND status = 'open'
        AND entity_id IN (SELECT id FROM entities WHERE website IS NOT NULL AND website != '')
    `);
    const { rowCount: staleStatus } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'operating_status_unknown' AND status = 'open'
        AND entity_id IN (SELECT id FROM entities WHERE business_status IS NOT NULL AND business_status != '')
    `);
    console.log(`\n🧹 Resolved stale issues:`);
    console.log(`  missing_hours:              ${staleHours}`);
    console.log(`  missing_phone:              ${stalePhone}`);
    console.log(`  missing_website:            ${staleWebsite}`);
    console.log(`  operating_status_unknown:   ${staleStatus}`);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Done. Updated ${updated} | No data ${noData} | Failed ${failed} of ${entities.length}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
