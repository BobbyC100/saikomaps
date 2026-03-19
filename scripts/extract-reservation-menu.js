#!/usr/bin/env node
/**
 * Extract reservation URLs and menu links from existing merchant data.
 *
 * Sources (in priority order):
 *   1. merchant_signals.reservation_url / menu_url (already extracted)
 *   2. merchant_surface_artifacts (parse_v1 JSON — look for links)
 *   3. merchant_surfaces.raw_html (link pattern matching)
 *
 * Usage:
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/extract-reservation-menu.js
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/extract-reservation-menu.js --limit=20
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/extract-reservation-menu.js --dry-run
 */
const { Client } = require('pg');

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const dryRun = args.includes('--dry-run');

// Known reservation platforms
const RESERVATION_PATTERNS = [
  /resy\.com/i,
  /opentable\.com/i,
  /exploretock\.com/i,
  /tock\.com/i,
  /yelp\.com\/reservations/i,
  /sevenrooms\.com/i,
  /reserve\.com/i,
  /bookatable/i,
  /tablein\.com/i,
];

// Known menu platforms and patterns
const MENU_PATTERNS = [
  /\/menu/i,
  /toasttab\.com/i,
  /order\.online/i,
  /popmenu\.com/i,
  /getbento\.com/i,
  /square\.site.*menu/i,
  /squarespace.*menu/i,
  /doordash\.com\/store/i,
  /postmates\.com/i,
];

function isReservationUrl(url) {
  return RESERVATION_PATTERNS.some(p => p.test(url));
}

function isMenuUrl(url) {
  return MENU_PATTERNS.some(p => p.test(url));
}

function extractUrlsFromJson(json) {
  const urls = [];
  const str = typeof json === 'string' ? json : JSON.stringify(json);
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  let match;
  while ((match = urlRegex.exec(str)) !== null) {
    urls.push(match[0].replace(/[",;\]}>)]+$/, '')); // Clean trailing punctuation
  }
  return [...new Set(urls)];
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Step 1: Promote from merchant_signals (already extracted, just need to wire through)
  console.log('\n=== Step 1: Promote from merchant_signals ===');

  if (!dryRun) {
    // Reservation URLs from merchant_signals → close issues
    const { rowCount: resFromSignals } = await client.query(`
      UPDATE entity_issues ei SET status = 'resolved', updated_at = NOW()
      WHERE ei.issue_type = 'missing_reservations' AND ei.status = 'open'
        AND EXISTS (
          SELECT 1 FROM merchant_signals ms
          WHERE ms.entity_id = ei.entity_id
            AND ms.reservation_url IS NOT NULL AND ms.reservation_url != ''
        )
    `);
    console.log(`  Resolved missing_reservations from merchant_signals: ${resFromSignals}`);

    // Menu URLs from merchant_signals → close issues
    const { rowCount: menuFromSignals } = await client.query(`
      UPDATE entity_issues ei SET status = 'resolved', updated_at = NOW()
      WHERE ei.issue_type = 'missing_menu_link' AND ei.status = 'open'
        AND EXISTS (
          SELECT 1 FROM merchant_signals ms
          WHERE ms.entity_id = ei.entity_id
            AND ms.menu_url IS NOT NULL AND ms.menu_url != ''
        )
    `);
    console.log(`  Resolved missing_menu_link from merchant_signals: ${menuFromSignals}`);
  } else {
    const { rows: [r] } = await client.query(`
      SELECT
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM merchant_signals ms
          WHERE ms.entity_id = ei.entity_id
            AND ms.reservation_url IS NOT NULL AND ms.reservation_url != ''
        ) THEN 1 END)::int AS res_resolvable,
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM merchant_signals ms
          WHERE ms.entity_id = ei.entity_id
            AND ms.menu_url IS NOT NULL AND ms.menu_url != ''
        ) THEN 1 END)::int AS menu_resolvable
      FROM entity_issues ei
      WHERE ei.status = 'open'
        AND ei.issue_type IN ('missing_reservations', 'missing_menu_link')
    `);
    console.log(`  Would resolve reservations: ${r.res_resolvable}`);
    console.log(`  Would resolve menu links:   ${r.menu_resolvable}`);
  }

  // Step 2: Scan parse_v1 artifacts for reservation/menu URLs
  console.log('\n=== Step 2: Scan artifacts for reservation + menu URLs ===');

  const limitClause = limit ? `LIMIT ${limit}` : '';
  const { rows: artifacts } = await client.query(`
    SELECT
      ms.entity_id,
      e.name,
      msa.content,
      msa.id AS artifact_id
    FROM merchant_surface_artifacts msa
    JOIN merchant_surfaces ms ON ms.id = msa.merchant_surface_id
    JOIN entities e ON e.id = ms.entity_id
    WHERE msa.artifact_type = 'parse_v1'
      AND ms.entity_id IN (
        SELECT entity_id FROM entity_issues
        WHERE status = 'open'
          AND issue_type IN ('missing_reservations', 'missing_menu_link')
      )
    ${limitClause}
  `);

  console.log(`  Artifacts to scan: ${artifacts.length}`);

  let resFound = 0;
  let menuFound = 0;
  const entityReservations = new Map(); // entity_id → url
  const entityMenus = new Map(); // entity_id → url

  for (const art of artifacts) {
    try {
      const content = typeof art.content === 'string' ? JSON.parse(art.content) : art.content;
      const urls = extractUrlsFromJson(content);

      for (const url of urls) {
        if (!entityReservations.has(art.entity_id) && isReservationUrl(url)) {
          entityReservations.set(art.entity_id, url);
          resFound++;
        }
        if (!entityMenus.has(art.entity_id) && isMenuUrl(url)) {
          entityMenus.set(art.entity_id, url);
          menuFound++;
        }
      }
    } catch {
      // Skip malformed JSON
    }
  }

  console.log(`  Reservation URLs found: ${resFound}`);
  console.log(`  Menu URLs found:        ${menuFound}`);

  // Write found URLs to merchant_signals
  if (!dryRun && (entityReservations.size > 0 || entityMenus.size > 0)) {
    console.log('\n  Writing to merchant_signals...');

    for (const [entityId, url] of entityReservations) {
      await client.query(`
        INSERT INTO merchant_signals (entity_id, reservation_url, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (entity_id) DO UPDATE SET reservation_url = COALESCE(merchant_signals.reservation_url, $2), updated_at = NOW()
      `, [entityId, url]).catch(() => {});
    }

    for (const [entityId, url] of entityMenus) {
      await client.query(`
        INSERT INTO merchant_signals (entity_id, menu_url, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (entity_id) DO UPDATE SET menu_url = COALESCE(merchant_signals.menu_url, $2), updated_at = NOW()
      `, [entityId, url]).catch(() => {});
    }

    // Resolve issues for newly found URLs
    const { rowCount: resResolved } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'missing_reservations' AND status = 'open'
        AND entity_id = ANY($1::text[])
    `, [Array.from(entityReservations.keys())]);

    const { rowCount: menuResolved } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'missing_menu_link' AND status = 'open'
        AND entity_id = ANY($1::text[])
    `, [Array.from(entityMenus.keys())]);

    console.log(`  Resolved reservation issues: ${resResolved}`);
    console.log(`  Resolved menu issues:        ${menuResolved}`);
  }

  // Show sample of found URLs
  if (entityReservations.size > 0) {
    console.log('\n  Sample reservation URLs:');
    let i = 0;
    for (const [eid, url] of entityReservations) {
      if (i++ >= 5) break;
      const art = artifacts.find(a => a.entity_id === eid);
      console.log(`    ${art?.name || eid} → ${url}`);
    }
  }

  if (entityMenus.size > 0) {
    console.log('\n  Sample menu URLs:');
    let i = 0;
    for (const [eid, url] of entityMenus) {
      if (i++ >= 5) break;
      const art = artifacts.find(a => a.entity_id === eid);
      console.log(`    ${art?.name || eid} → ${url}`);
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log('Done.');

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
