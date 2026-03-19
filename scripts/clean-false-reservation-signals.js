#!/usr/bin/env node
/**
 * Clean false positive reservation URLs from merchant_signals.
 *
 * The extract-reservation-menu.js script uses broad regex patterns that
 * match URLs containing "book" or "reserv" even when they're not reservation
 * platforms (e.g., bookstores, book clubs, generic /book-a-room pages).
 *
 * This script identifies and cleans:
 *   1. URLs on the entity's own domain that are clearly not reservation platforms
 *      (e.g., /book-clubs, /products/book-*, /book-soup-archive)
 *   2. URLs where the provider is "other" and the URL doesn't lead to a real
 *      booking flow (heuristic: same domain as entity website)
 *
 * Usage:
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/clean-false-reservation-signals.js --dry-run
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/clean-false-reservation-signals.js
 */
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');

/** URL path patterns that are clearly NOT reservation booking flows */
const FALSE_POSITIVE_PATH_PATTERNS = [
  /\/book-clubs?\b/i,
  /\/products?\//i,
  /\/catalog\//i,
  /\/archive/i,
  /\/book-baskets/i,
  /\/book-soup/i,
];

/** Known non-reservation domains (bookstores, etc.) that got false matched */
function isLikelyFalsePositive(reservationUrl, entityWebsite, entityName) {
  if (!reservationUrl) return false;

  try {
    const resUrl = new URL(reservationUrl);
    const resHost = resUrl.hostname.replace(/^www\./, '');
    const resPath = resUrl.pathname.toLowerCase();

    // Check for clearly false paths
    for (const pattern of FALSE_POSITIVE_PATH_PATTERNS) {
      if (pattern.test(resPath)) return true;
    }

    // If the reservation URL is on the entity's own domain and provider is "other",
    // check if the path looks like a real reservation vs a product/content page
    if (entityWebsite) {
      try {
        const entHost = new URL(entityWebsite).hostname.replace(/^www\./, '');
        if (resHost === entHost) {
          // Same domain — only valid if path clearly indicates reservations
          const reservationPaths = ['/reserv', '/book-a-table', '/book-a-reservation', '/booking', '/reserve'];
          const hasReservationPath = reservationPaths.some(p => resPath.includes(p));
          if (!hasReservationPath) return true;
        }
      } catch {}
    }

    // Google Maps reserve links are real — don't flag
    if (resHost.includes('google.com') && resPath.includes('/reserve')) return false;

    return false;
  } catch {
    return true; // malformed URL is a false positive
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log(`=== Clean false reservation signals ${dryRun ? '(DRY RUN)' : ''} ===\n`);

  // Get all "other" or null provider entries with reservation URLs
  const { rows } = await client.query(`
    SELECT
      ms.entity_id,
      ms.reservation_url,
      ms.reservation_provider,
      e.name,
      e.website
    FROM merchant_signals ms
    JOIN entities e ON e.id = ms.entity_id
    WHERE ms.reservation_url IS NOT NULL AND ms.reservation_url != ''
      AND (ms.reservation_provider = 'other' OR ms.reservation_provider IS NULL)
    ORDER BY e.name
  `);

  console.log(`Checking ${rows.length} "other" / null provider entries\n`);

  const falsePositives = [];
  const legitimate = [];

  for (const row of rows) {
    if (isLikelyFalsePositive(row.reservation_url, row.website, row.name)) {
      falsePositives.push(row);
    } else {
      legitimate.push(row);
    }
  }

  console.log(`False positives found: ${falsePositives.length}`);
  console.log(`Legitimate "other":    ${legitimate.length}\n`);

  if (falsePositives.length > 0) {
    console.log('=== FALSE POSITIVES ===');
    for (const fp of falsePositives) {
      console.log(`  ${fp.name}: ${fp.reservation_url}`);
    }
    console.log('');

    if (!dryRun) {
      const ids = falsePositives.map(fp => fp.entity_id);
      const { rowCount } = await client.query(`
        UPDATE merchant_signals
        SET reservation_url = NULL, reservation_provider = NULL
        WHERE entity_id = ANY($1::text[])
      `, [ids]);
      console.log(`Cleared ${rowCount} false positive reservation URLs`);
    }
  }

  if (legitimate.length > 0) {
    console.log('=== LEGITIMATE "other" (keeping) ===');
    for (const l of legitimate) {
      const domain = (() => {
        try { return new URL(l.reservation_url).hostname; } catch { return '?'; }
      })();
      console.log(`  ${l.name}: ${domain} → ${l.reservation_url.substring(0, 80)}`);
    }
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
