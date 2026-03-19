#!/usr/bin/env node
/**
 * Reservation backfill opportunity analysis
 * READ-ONLY — identifies untapped reservation data across all tables
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('=== RESERVATION BACKFILL OPPORTUNITY ANALYSIS ===\n');

  // 1. What we already have (baseline)
  const { rows: [baseline] } = await client.query(`
    SELECT
      COUNT(DISTINCT rpm.entity_id)::int AS validated_entities,
      COUNT(DISTINCT CASE WHEN rpm.is_renderable THEN rpm.entity_id END)::int AS renderable_entities
    FROM reservation_provider_matches rpm
  `);
  console.log(`Current state: ${baseline.validated_entities} validated, ${baseline.renderable_entities} renderable\n`);

  // 2. merchant_surface_scans with reservation data NOT in merchant_signals
  const { rows: scanOpportunity } = await client.query(`
    SELECT
      mss.reservation_platform,
      COUNT(DISTINCT mss.entity_id)::int AS scan_count,
      COUNT(DISTINCT CASE WHEN ms.reservation_url IS NULL OR ms.reservation_url = '' THEN mss.entity_id END)::int AS not_in_signals
    FROM merchant_surface_scans mss
    LEFT JOIN merchant_signals ms ON ms.entity_id = mss.entity_id
    WHERE mss.reservation_platform IS NOT NULL
      AND mss.reservation_platform != ''
      AND mss.reservation_platform != 'none'
    GROUP BY mss.reservation_platform
    ORDER BY scan_count DESC
  `);
  console.log('=== LAYER 1: merchant_surface_scans with reservation data ===');
  let totalScanNotInSignals = 0;
  for (const r of scanOpportunity) {
    console.log(`  ${r.reservation_platform}: ${r.scan_count} scanned, ${r.not_in_signals} NOT in merchant_signals`);
    totalScanNotInSignals += r.not_in_signals;
  }
  console.log(`  → ${totalScanNotInSignals} entities with scan data not yet in merchant_signals\n`);

  // 3. merchant_surface_scans reservation_url present but not in merchant_signals
  const { rows: scanUrlOpportunity } = await client.query(`
    SELECT
      mss.entity_id,
      e.name,
      e.slug,
      mss.reservation_platform,
      mss.reservation_url AS scan_url,
      ms.reservation_url AS signal_url
    FROM merchant_surface_scans mss
    JOIN entities e ON e.id = mss.entity_id
    LEFT JOIN merchant_signals ms ON ms.entity_id = mss.entity_id
    WHERE mss.reservation_url IS NOT NULL
      AND mss.reservation_url != ''
      AND (ms.reservation_url IS NULL OR ms.reservation_url = '')
    ORDER BY mss.reservation_platform, e.name
    LIMIT 20
  `);
  if (scanUrlOpportunity.length > 0) {
    console.log('=== LAYER 1 samples: scan has URL, signals does not ===');
    for (const r of scanUrlOpportunity) {
      console.log(`  ${r.name} (${r.reservation_platform}): ${r.scan_url}`);
    }
    console.log('');
  }

  // 4. Raw HTML in merchant_surfaces that might contain reservation links
  // Look for reservation provider domains in raw_text of entities with no reservation signal
  const { rows: rawHtmlOpportunity } = await client.query(`
    SELECT COUNT(DISTINCT surf.entity_id)::int AS count
    FROM merchant_surfaces surf
    JOIN entities e ON e.id = surf.entity_id
    LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
    WHERE (ms.reservation_url IS NULL OR ms.reservation_url = '')
      AND surf.raw_text IS NOT NULL
      AND (
        surf.raw_text ILIKE '%resy.com%'
        OR surf.raw_text ILIKE '%opentable.com%'
        OR surf.raw_text ILIKE '%exploretock.com%'
        OR surf.raw_text ILIKE '%tock.to%'
        OR surf.raw_text ILIKE '%sevenrooms.com%'
      )
  `);
  console.log(`=== LAYER 2: Raw HTML contains provider domain but no signal extracted ===`);
  console.log(`  ${rawHtmlOpportunity[0].count} entities with provider URLs in raw HTML but no merchant_signal\n`);

  // Show samples
  const { rows: rawHtmlSamples } = await client.query(`
    SELECT DISTINCT ON (e.id)
      e.id,
      e.name,
      e.slug,
      CASE
        WHEN surf.raw_text ILIKE '%resy.com%' THEN 'resy'
        WHEN surf.raw_text ILIKE '%opentable.com%' THEN 'opentable'
        WHEN surf.raw_text ILIKE '%exploretock.com%' OR surf.raw_text ILIKE '%tock.to%' THEN 'tock'
        WHEN surf.raw_text ILIKE '%sevenrooms.com%' THEN 'sevenrooms'
        ELSE 'unknown'
      END AS likely_provider
    FROM merchant_surfaces surf
    JOIN entities e ON e.id = surf.entity_id
    LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
    WHERE (ms.reservation_url IS NULL OR ms.reservation_url = '')
      AND surf.raw_text IS NOT NULL
      AND (
        surf.raw_text ILIKE '%resy.com%'
        OR surf.raw_text ILIKE '%opentable.com%'
        OR surf.raw_text ILIKE '%exploretock.com%'
        OR surf.raw_text ILIKE '%tock.to%'
        OR surf.raw_text ILIKE '%sevenrooms.com%'
      )
    LIMIT 15
  `);
  if (rawHtmlSamples.length > 0) {
    console.log('  Samples:');
    for (const r of rawHtmlSamples) {
      console.log(`    ${r.name} → likely ${r.likely_provider}`);
    }
    console.log('');
  }

  // 5. Entities with websites but no surfaces fetched at all
  const { rows: [noSurfaces] } = await client.query(`
    SELECT COUNT(*)::int AS count
    FROM entities e
    WHERE e.website IS NOT NULL AND e.website != ''
      AND e.primary_vertical IN ('EAT', 'DRINKS')
      AND NOT EXISTS (
        SELECT 1 FROM merchant_surfaces surf WHERE surf.entity_id = e.id
      )
  `);
  console.log(`=== LAYER 3: Has website, no surfaces fetched ===`);
  console.log(`  ${noSurfaces.count} entities ready for surface discovery\n`);

  // 6. The "other" provider bucket — what are these?
  const { rows: otherProviders } = await client.query(`
    SELECT
      ms.reservation_url,
      e.name,
      e.slug
    FROM merchant_signals ms
    JOIN entities e ON e.id = ms.entity_id
    WHERE ms.reservation_url IS NOT NULL AND ms.reservation_url != ''
      AND (ms.reservation_provider = 'other' OR ms.reservation_provider IS NULL)
    ORDER BY e.name
    LIMIT 15
  `);
  console.log('=== LAYER 4: "other" provider URLs (sample) ===');
  for (const r of otherProviders) {
    const domain = (() => {
      try { return new URL(r.reservation_url).hostname; } catch { return '(invalid)'; }
    })();
    console.log(`  ${r.name}: ${domain} → ${r.reservation_url.substring(0, 80)}`);
  }
  console.log('');

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`  Already validated:           ${baseline.validated_entities}`);
  console.log(`  Already renderable:          ${baseline.renderable_entities}`);
  console.log(`  Scan data not in signals:    ${totalScanNotInSignals}`);
  console.log(`  Raw HTML with provider URLs: ${rawHtmlOpportunity[0].count}`);
  console.log(`  No surfaces fetched yet:     ${noSurfaces.count}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
