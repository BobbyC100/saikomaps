#!/usr/bin/env node
/**
 * Source Value Audit — what data exists in our sources that we're NOT extracting?
 *
 * Examines merchant_surface_artifacts, coverage_sources, and merchant_signals
 * to understand what we're storing vs. what we're actually using.
 *
 * Usage: ./scripts/db-neon.sh node scripts/source-value-audit.js
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('\n=== SOURCE VALUE AUDIT ===\n');

  // 1. What source types do we have?
  console.log('── 1. SOURCE INVENTORY ──');

  const { rows: surfaceTypes } = await client.query(`
    SELECT surface_type, fetch_status, parse_status, COUNT(*)::int AS count
    FROM merchant_surfaces
    GROUP BY surface_type, fetch_status, parse_status
    ORDER BY count DESC
  `);
  console.log('\nMerchant surfaces by type + status:');
  for (const r of surfaceTypes) {
    console.log(`  ${r.surface_type} [fetch=${r.fetch_status}, parse=${r.parse_status}]: ${r.count}`);
  }

  const { rows: [surfaceTotals] } = await client.query(`
    SELECT
      COUNT(*)::int AS total_surfaces,
      COUNT(DISTINCT entity_id)::int AS unique_entities,
      COUNT(CASE WHEN raw_html IS NOT NULL THEN 1 END)::int AS have_html,
      COUNT(CASE WHEN raw_text IS NOT NULL AND raw_text != '' THEN 1 END)::int AS have_text,
      AVG(LENGTH(COALESCE(raw_text, '')))::int AS avg_text_length
    FROM merchant_surfaces
    WHERE fetch_status = 'fetch_success'
  `);
  console.log(`\nSuccessfully fetched surfaces:`);
  console.log(`  Total: ${surfaceTotals.total_surfaces} across ${surfaceTotals.unique_entities} entities`);
  console.log(`  Have HTML: ${surfaceTotals.have_html} | Have text: ${surfaceTotals.have_text}`);
  console.log(`  Avg text length: ${surfaceTotals.avg_text_length} chars`);

  // 2. Coverage sources
  console.log('\n── 2. COVERAGE SOURCES ──');
  const { rows: coverageStats } = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(DISTINCT entity_id)::int AS unique_entities,
      COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END)::int AS have_url,
      COUNT(CASE WHEN excerpt IS NOT NULL AND excerpt != '' THEN 1 END)::int AS have_excerpt
    FROM coverage_sources
  `);
  if (coverageStats.length > 0) {
    const cs = coverageStats[0];
    console.log(`  Total coverage entries: ${cs.total} across ${cs.unique_entities} entities`);
    console.log(`  Have URL: ${cs.have_url}`);
    console.log(`  Have excerpt: ${cs.have_excerpt}`);
  }

  const { rows: coverageSources } = await client.query(`
    SELECT source_name, COUNT(*)::int AS count
    FROM coverage_sources
    GROUP BY source_name
    ORDER BY count DESC
    LIMIT 15
  `);
  console.log('\n  Top coverage sources:');
  for (const r of coverageSources) {
    console.log(`    ${r.source_name}: ${r.count}`);
  }

  // 3. Merchant signals — what fields are populated?
  console.log('\n── 3. MERCHANT SIGNALS ──');
  const { rows: [ms] } = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE WHEN reservation_url IS NOT NULL AND reservation_url != '' THEN 1 END)::int AS has_reservation,
      COUNT(CASE WHEN menu_url IS NOT NULL AND menu_url != '' THEN 1 END)::int AS has_menu,
      COUNT(CASE WHEN ordering_url IS NOT NULL AND ordering_url != '' THEN 1 END)::int AS has_ordering,
      COUNT(CASE WHEN reservation_provider IS NOT NULL AND reservation_provider != '' THEN 1 END)::int AS has_res_provider,
      COUNT(CASE WHEN winelist_url IS NOT NULL AND winelist_url != '' THEN 1 END)::int AS has_winelist
    FROM merchant_signals
  `);
  console.log(`  Total entities with merchant_signals: ${ms.total}`);
  console.log(`  Reservation URL: ${ms.has_reservation}`);
  console.log(`  Menu URL: ${ms.has_menu}`);
  console.log(`  Online ordering: ${ms.has_ordering}`);
  console.log(`  Reservation provider: ${ms.has_res_provider}`);
  console.log(`  Wine list URL: ${ms.has_winelist}`);

  // 4. Parse artifacts — what's in the content?
  console.log('\n── 4. ARTIFACT CONTENT ANALYSIS ──');
  const { rows: sampleArtifacts } = await client.query(`
    SELECT
      msa.content,
      ms.entity_id,
      e.name,
      ms.surface_type
    FROM merchant_surface_artifacts msa
    JOIN merchant_surfaces ms ON ms.id = msa.merchant_surface_id
    JOIN entities e ON e.id = ms.entity_id
    WHERE msa.artifact_type = 'parse_v1'
      AND msa.content IS NOT NULL
    LIMIT 5
  `);

  console.log(`\n  Sample of 5 parse_v1 artifacts — what keys exist:`);
  const allKeys = new Map();
  for (const art of sampleArtifacts) {
    try {
      const content = typeof art.content === 'string' ? JSON.parse(art.content) : art.content;
      const keys = Object.keys(content);
      console.log(`\n  ${art.name} (${art.surface_type}):`);
      for (const k of keys) {
        const val = content[k];
        const preview = typeof val === 'string'
          ? val.substring(0, 80) + (val.length > 80 ? '...' : '')
          : Array.isArray(val)
            ? `[${val.length} items]`
            : JSON.stringify(val).substring(0, 80);
        console.log(`    ${k}: ${preview}`);
        allKeys.set(k, (allKeys.get(k) || 0) + 1);
      }
    } catch {
      console.log(`  ${art.name}: [malformed JSON]`);
    }
  }

  // Count all keys across ALL artifacts
  const { rows: allArtifacts } = await client.query(`
    SELECT content FROM merchant_surface_artifacts
    WHERE artifact_type = 'parse_v1' AND content IS NOT NULL
    LIMIT 200
  `);

  const keyFrequency = new Map();
  for (const art of allArtifacts) {
    try {
      const content = typeof art.content === 'string' ? JSON.parse(art.content) : art.content;
      for (const k of Object.keys(content)) {
        keyFrequency.set(k, (keyFrequency.get(k) || 0) + 1);
      }
    } catch {}
  }

  console.log(`\n  Key frequency across ${allArtifacts.length} artifacts:`);
  const sorted = [...keyFrequency.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k, count] of sorted) {
    const pct = Math.round((count / allArtifacts.length) * 100);
    console.log(`    ${k}: ${count} (${pct}%)`);
  }

  // 5. What's NOT being extracted?
  console.log('\n── 5. GAP ANALYSIS ──');
  console.log('\n  Signals we COULD extract from sources but DON\'T:');
  console.log('  From merchant surfaces (HTML/text):');
  console.log('    - Reservation platform URLs (Resy, OpenTable, Tock links in HTML)');
  console.log('    - Menu section content (dish names, prices, descriptions)');
  console.log('    - Chef/owner names (about pages)');
  console.log('    - Opening year / origin story');
  console.log('    - Social media links beyond IG (TikTok, Twitter, Facebook)');
  console.log('    - Price signals from menu items');
  console.log('    - Dietary accommodations (vegan, GF mentions)');
  console.log('  From coverage sources (reviews/articles):');
  console.log('    - Signature dish mentions');
  console.log('    - Atmosphere/vibe descriptions');
  console.log('    - Chef/owner attribution');
  console.log('    - Award/recognition details');
  console.log('    - Price commentary');
  console.log('    - Comparison to other restaurants');
  console.log('    - Opening date mentions');

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
