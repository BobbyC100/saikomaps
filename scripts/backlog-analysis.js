#!/usr/bin/env node
/**
 * Reservation backlog bucket analysis
 * READ-ONLY — no writes, no updates
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('=== RESERVATION BACKLOG BUCKET ANALYSIS ===\n');

  // 1. Overall missing_reservations status
  const { rows: [overview] } = await client.query(`
    SELECT
      COUNT(*)::int AS total_open,
      COUNT(CASE WHEN e.website IS NOT NULL AND e.website != '' THEN 1 END)::int AS have_website,
      COUNT(CASE WHEN e.website IS NULL OR e.website = '' THEN 1 END)::int AS no_website
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    WHERE ei.issue_type = 'missing_reservations' AND ei.status = 'open'
  `);
  console.log(`Total open missing_reservations issues: ${overview.total_open}`);
  console.log(`  Have website: ${overview.have_website}`);
  console.log(`  No website:   ${overview.no_website}\n`);

  // 2. Full bucket analysis
  const { rows: buckets } = await client.query(`
    SELECT
      bucket,
      COUNT(*)::int AS count
    FROM (
      SELECT
        ei.entity_id,
        CASE
          WHEN e.website IS NULL OR e.website = ''
            THEN 'A_no_website'
          WHEN ms.reservation_url IS NOT NULL AND ms.reservation_url != ''
            THEN 'B_extracted_not_synced'
          WHEN ms.reservation_provider IS NOT NULL AND ms.reservation_provider != ''
            THEN 'C_provider_without_url'
          WHEN EXISTS (
            SELECT 1 FROM merchant_surfaces surf
            WHERE surf.entity_id = e.id AND surf.surface_type = 'reservation'
          )
            THEN 'D_surface_captured_not_extracted'
          WHEN EXISTS (
            SELECT 1 FROM merchant_surfaces surf
            WHERE surf.entity_id = e.id
          )
            THEN 'E_has_surfaces_no_reservation_signal'
          ELSE 'F_no_signal'
        END AS bucket
      FROM entity_issues ei
      JOIN entities e ON e.id = ei.entity_id
      LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
      WHERE ei.issue_type = 'missing_reservations' AND ei.status = 'open'
    ) sub
    GROUP BY bucket
    ORDER BY bucket
  `);
  console.log('=== BUCKETS ===');
  for (const b of buckets) {
    console.log(`  ${b.bucket}: ${b.count}`);
  }
  console.log('');

  // 3. For bucket B (extracted_not_synced), show details
  const { rows: extractedNotSynced } = await client.query(`
    SELECT
      e.id,
      e.name,
      e.slug,
      ms.reservation_provider,
      ms.reservation_url,
      ms.extraction_confidence,
      e."reservation_url" AS entity_reservation_url
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
    WHERE ei.issue_type = 'missing_reservations' AND ei.status = 'open'
      AND ms.reservation_url IS NOT NULL AND ms.reservation_url != ''
    ORDER BY ms.extraction_confidence DESC NULLS LAST
    LIMIT 25
  `);
  if (extractedNotSynced.length > 0) {
    console.log('=== BUCKET B: EXTRACTED NOT SYNCED (top 25) ===');
    for (const r of extractedNotSynced) {
      console.log(`  ${r.name} (${r.slug})`);
      console.log(`    provider: ${r.reservation_provider || 'null'}`);
      console.log(`    signals_url: ${r.reservation_url}`);
      console.log(`    entity_url: ${r.entity_reservation_url || 'null'}`);
      console.log(`    confidence: ${r.extraction_confidence}`);
    }
    console.log('');
  }

  // 4. For entities WITH merchant_signals (all entities, not just issues), show provider distribution
  const { rows: providerDist } = await client.query(`
    SELECT
      COALESCE(reservation_provider, '(null)') AS provider,
      COUNT(*)::int AS count,
      COUNT(CASE WHEN reservation_url IS NOT NULL AND reservation_url != '' THEN 1 END)::int AS has_url
    FROM merchant_signals
    GROUP BY reservation_provider
    ORDER BY count DESC
  `);
  console.log('=== ALL merchant_signals: provider distribution ===');
  for (const r of providerDist) {
    console.log(`  ${r.provider}: ${r.count} total, ${r.has_url} with URL`);
  }
  console.log('');

  // 5. Entities that HAVE a reservation URL in merchant_signals — by provider
  const { rows: renderable } = await client.query(`
    SELECT
      COALESCE(ms.reservation_provider, '(unknown)') AS provider,
      COUNT(*)::int AS count,
      AVG(ms.extraction_confidence::float)::numeric(4,2) AS avg_confidence,
      MIN(ms.extraction_confidence::float)::numeric(4,2) AS min_confidence,
      MAX(ms.extraction_confidence::float)::numeric(4,2) AS max_confidence
    FROM merchant_signals ms
    WHERE ms.reservation_url IS NOT NULL AND ms.reservation_url != ''
    GROUP BY ms.reservation_provider
    ORDER BY count DESC
  `);
  console.log('=== Entities with reservation URL in merchant_signals ===');
  for (const r of renderable) {
    console.log(`  ${r.provider}: ${r.count} entities (confidence: min=${r.min_confidence}, avg=${r.avg_confidence}, max=${r.max_confidence})`);
  }
  console.log('');

  // 6. How many entities currently render a reservation button?
  const { rows: [renderCount] } = await client.query(`
    SELECT
      COUNT(*)::int AS total_entities,
      COUNT(CASE
        WHEN COALESCE(
          (ms.reservation_url),
          e.reservation_url
        ) IS NOT NULL
        AND COALESCE(
          (ms.reservation_url),
          e.reservation_url
        ) != ''
        THEN 1
      END)::int AS would_render_button
    FROM entities e
    LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
    WHERE e.primary_vertical IN ('EAT', 'DRINKS')
  `);
  console.log('=== Current render coverage (EAT + DRINKS verticals) ===');
  console.log(`  Total entities: ${renderCount.total_entities}`);
  console.log(`  Would render reservation button: ${renderCount.would_render_button}`);
  console.log(`  Coverage: ${((renderCount.would_render_button / renderCount.total_entities) * 100).toFixed(1)}%`);
  console.log('');

  // 7. Provider breakdown of currently renderable buttons
  const { rows: renderProviders } = await client.query(`
    SELECT
      COALESCE(ms.reservation_provider, '(no provider set)') AS provider,
      COUNT(*)::int AS count
    FROM entities e
    LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
    WHERE e.primary_vertical IN ('EAT', 'DRINKS')
      AND COALESCE(ms.reservation_url, e.reservation_url) IS NOT NULL
      AND COALESCE(ms.reservation_url, e.reservation_url) != ''
    GROUP BY ms.reservation_provider
    ORDER BY count DESC
  `);
  console.log('=== Currently renderable buttons by provider ===');
  for (const r of renderProviders) {
    console.log(`  ${r.provider}: ${r.count}`);
  }
  console.log('');

  // 8. Entities with provider set but where the issue is still open
  const { rows: [providerWithIssue] } = await client.query(`
    SELECT COUNT(*)::int AS count
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
    WHERE ei.issue_type = 'missing_reservations'
      AND ei.status = 'open'
      AND ms.reservation_provider IS NOT NULL
      AND ms.reservation_provider != ''
  `);
  console.log(`Entities with reservation_provider set but issue still open: ${providerWithIssue.count}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
