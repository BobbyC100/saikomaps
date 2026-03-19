#!/usr/bin/env node
/**
 * What's inside the parse_v1 artifacts? Analyze keys and sample content.
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Count all keys across artifacts
  const { rows: allArtifacts } = await client.query(`
    SELECT msa.artifact_json, ms.entity_id, e.name, ms.surface_type
    FROM merchant_surface_artifacts msa
    JOIN merchant_surfaces ms ON ms.id = msa.merchant_surface_id
    JOIN entities e ON e.id = ms.entity_id
    WHERE msa.artifact_type = 'parse_v1'
    LIMIT 300
  `);

  console.log(`\n=== ARTIFACT CONTENT ANALYSIS (${allArtifacts.length} artifacts) ===\n`);

  const keyFrequency = new Map();
  const keyExamples = new Map();

  for (const art of allArtifacts) {
    try {
      const json = typeof art.artifact_json === 'string' ? JSON.parse(art.artifact_json) : art.artifact_json;
      for (const [k, v] of Object.entries(json)) {
        keyFrequency.set(k, (keyFrequency.get(k) || 0) + 1);
        // Store one example per key
        if (!keyExamples.has(k) && v !== null && v !== '' && v !== undefined) {
          const preview = typeof v === 'string'
            ? v.substring(0, 100) + (v.length > 100 ? '...' : '')
            : Array.isArray(v)
              ? `[${v.length} items] ${JSON.stringify(v[0] || '').substring(0, 80)}`
              : JSON.stringify(v).substring(0, 100);
          keyExamples.set(k, { entity: art.name, surface: art.surface_type, preview });
        }
      }
    } catch {}
  }

  console.log('Key frequency:');
  const sorted = [...keyFrequency.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k, count] of sorted) {
    const pct = Math.round((count / allArtifacts.length) * 100);
    const ex = keyExamples.get(k);
    console.log(`  ${k}: ${count} (${pct}%)`);
    if (ex) {
      console.log(`    Example (${ex.entity}, ${ex.surface}): ${ex.preview}`);
    }
  }

  // Show 3 full artifacts for well-enriched restaurants
  console.log('\n=== SAMPLE FULL ARTIFACTS (3 restaurants) ===');
  const { rows: samples } = await client.query(`
    SELECT msa.artifact_json, ms.entity_id, e.name, ms.surface_type
    FROM merchant_surface_artifacts msa
    JOIN merchant_surfaces ms ON ms.id = msa.merchant_surface_id
    JOIN entities e ON e.id = ms.entity_id
    WHERE msa.artifact_type = 'parse_v1'
      AND ms.surface_type IN ('homepage', 'about', 'menu')
      AND e.name IN (
        SELECT e2.name FROM entities e2
        JOIN merchant_surfaces ms2 ON ms2.entity_id = e2.id
        WHERE ms2.fetch_status = 'fetch_success'
        GROUP BY e2.name
        HAVING COUNT(*) >= 3
        LIMIT 3
      )
    ORDER BY e.name, ms.surface_type
    LIMIT 9
  `);

  let currentEntity = '';
  for (const s of samples) {
    if (s.name !== currentEntity) {
      currentEntity = s.name;
      console.log(`\n─── ${s.name} ───`);
    }
    console.log(`  [${s.surface_type}]:`);
    try {
      const json = typeof s.artifact_json === 'string' ? JSON.parse(s.artifact_json) : s.artifact_json;
      for (const [k, v] of Object.entries(json)) {
        if (v === null || v === '' || v === undefined) continue;
        const display = typeof v === 'string'
          ? v.substring(0, 120) + (v.length > 120 ? '...' : '')
          : Array.isArray(v)
            ? `[${v.length} items]`
            : JSON.stringify(v).substring(0, 120);
        console.log(`    ${k}: ${display}`);
      }
    } catch {
      console.log('    [malformed]');
    }
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
