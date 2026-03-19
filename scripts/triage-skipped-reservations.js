#!/usr/bin/env node
/**
 * Triage the "skipped" entities from the resolver — those with reservation URLs
 * but no recognized provider. Classifies each into an actionable bucket.
 *
 * Usage:
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/triage-skipped-reservations.js
 */
const { Client } = require('pg');

// Known reservation provider domains
const KNOWN_PROVIDERS = {
  'resy.com': 'resy',
  'opentable.com': 'opentable',
  'exploretock.com': 'tock',
  'tock.to': 'tock',
  'sevenrooms.com': 'sevenrooms',
  'yelp.com': 'yelp',
  'tables.toasttab.com': 'toast',
};

function classifyUrl(url, entityName) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const path = parsed.pathname.toLowerCase();

    // Check if it's actually a known provider we missed
    for (const [domain, provider] of Object.entries(KNOWN_PROVIDERS)) {
      if (host === domain || host.endsWith('.' + domain)) {
        return { bucket: 'missed_provider', provider, reason: `matches ${domain}` };
      }
    }

    // Google Maps reserve link
    if (host.includes('google.com') && path.includes('/reserve')) {
      return { bucket: 'google_reserve', provider: 'google', reason: 'Google Maps reserve link' };
    }

    // Direct merchant reservation page (same domain as restaurant)
    if (path.includes('/reserv') || path.includes('/booking') || path.includes('/book-a-table')) {
      return { bucket: 'direct_merchant', provider: null, reason: `merchant booking page: ${path}` };
    }

    // False positive — looks like a product/content page
    if (path.includes('/product') || path.includes('/catalog') || path.includes('/book-club') ||
        path.includes('/archive') || path.includes('/book-basket')) {
      return { bucket: 'false_positive', provider: null, reason: `content page: ${path}` };
    }

    // Unknown third-party platform
    return { bucket: 'unknown_platform', provider: null, reason: `unknown domain: ${host}${path.substring(0, 40)}` };
  } catch {
    return { bucket: 'bad_url', provider: null, reason: 'malformed URL' };
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('=== TRIAGE: Skipped Reservation Entities ===\n');

  const { rows } = await client.query(`
    SELECT
      ms.entity_id,
      e.name,
      e.slug,
      ms.reservation_url,
      ms.reservation_provider,
      e.website,
      e.primary_vertical
    FROM merchant_signals ms
    JOIN entities e ON e.id = ms.entity_id
    WHERE ms.reservation_url IS NOT NULL AND ms.reservation_url != ''
      AND NOT EXISTS (
        SELECT 1 FROM reservation_provider_matches rpm WHERE rpm.entity_id = ms.entity_id
      )
    ORDER BY e.name
  `);

  console.log(`Total skipped: ${rows.length}\n`);

  const buckets = {};
  for (const row of rows) {
    const result = classifyUrl(row.reservation_url, row.name);
    if (!buckets[result.bucket]) buckets[result.bucket] = [];
    buckets[result.bucket].push({ ...row, ...result });
  }

  for (const [bucket, items] of Object.entries(buckets)) {
    console.log(`=== ${bucket} (${items.length}) ===`);
    for (const item of items) {
      console.log(`  ${item.name} [${item.primary_vertical}]`);
      console.log(`    url: ${item.reservation_url.substring(0, 90)}`);
      console.log(`    reason: ${item.reason}`);
    }
    console.log('');
  }

  // Summary
  console.log('=== SUMMARY ===');
  for (const [bucket, items] of Object.entries(buckets)) {
    console.log(`  ${bucket}: ${items.length}`);
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
