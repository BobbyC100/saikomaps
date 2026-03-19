#!/usr/bin/env node
/**
 * Audit: for entities missing reservations/menu links, what data do we have?
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // missing_reservations — what do we have to work with?
  const { rows: [res] } = await client.query(`
    SELECT
      COUNT(*)::int AS issue_count,
      COUNT(CASE WHEN e.website IS NOT NULL AND e.website != '' THEN 1 END)::int AS have_website,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM merchant_surfaces ms WHERE ms.entity_id = e.id
      ) THEN 1 END)::int AS have_surfaces,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM merchant_surface_artifacts msa
        JOIN merchant_surfaces ms ON ms.id = msa.merchant_surface_id
        WHERE ms.entity_id = e.id
      ) THEN 1 END)::int AS have_artifacts,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM merchant_surface_artifacts msa
        JOIN merchant_surfaces ms ON ms.id = msa.merchant_surface_id
        WHERE ms.entity_id = e.id AND msa.artifact_type = 'reservation_url'
      ) THEN 1 END)::int AS have_reservation_artifact
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    WHERE ei.issue_type = 'missing_reservations' AND ei.status = 'open'
  `);
  console.log('\n=== missing_reservations (751 open) ===');
  console.log(`  Have website:              ${res.have_website}`);
  console.log(`  Have merchant surfaces:    ${res.have_surfaces}`);
  console.log(`  Have parsed artifacts:     ${res.have_artifacts}`);
  console.log(`  Have reservation artifact: ${res.have_reservation_artifact}`);
  console.log(`  No website at all:         ${res.issue_count - res.have_website}`);

  // missing_menu_link — same check
  const { rows: [menu] } = await client.query(`
    SELECT
      COUNT(*)::int AS issue_count,
      COUNT(CASE WHEN e.website IS NOT NULL AND e.website != '' THEN 1 END)::int AS have_website,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM merchant_surfaces ms WHERE ms.entity_id = e.id
      ) THEN 1 END)::int AS have_surfaces,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM merchant_surface_artifacts msa
        JOIN merchant_surfaces ms ON ms.id = msa.merchant_surface_id
        WHERE ms.entity_id = e.id
      ) THEN 1 END)::int AS have_artifacts,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM merchant_surface_artifacts msa
        JOIN merchant_surfaces ms ON ms.id = msa.merchant_surface_id
        WHERE ms.entity_id = e.id AND msa.artifact_type = 'menu_url'
      ) THEN 1 END)::int AS have_menu_artifact
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    WHERE ei.issue_type = 'missing_menu_link' AND ei.status = 'open'
  `);
  console.log('\n=== missing_menu_link (646 open) ===');
  console.log(`  Have website:           ${menu.have_website}`);
  console.log(`  Have merchant surfaces: ${menu.have_surfaces}`);
  console.log(`  Have parsed artifacts:  ${menu.have_artifacts}`);
  console.log(`  Have menu artifact:     ${menu.have_menu_artifact}`);
  console.log(`  No website at all:      ${menu.issue_count - menu.have_website}`);

  // Check what artifact types we actually have
  const { rows: artifactTypes } = await client.query(`
    SELECT msa.artifact_type, COUNT(*)::int AS count
    FROM merchant_surface_artifacts msa
    GROUP BY msa.artifact_type
    ORDER BY count DESC
  `);
  console.log('\n=== All artifact types in DB ===');
  for (const r of artifactTypes) {
    console.log(`  ${r.artifact_type}: ${r.count}`);
  }

  // Check merchant_signals for reservation/menu data
  const { rows: [sig] } = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE WHEN reservation_url IS NOT NULL AND reservation_url != '' THEN 1 END)::int AS has_reservation_url,
      COUNT(CASE WHEN menu_url IS NOT NULL AND menu_url != '' THEN 1 END)::int AS has_menu_url
    FROM merchant_signals
  `);
  console.log('\n=== merchant_signals table ===');
  console.log(`  Total rows:         ${sig.total}`);
  console.log(`  Has reservation_url: ${sig.has_reservation_url}`);
  console.log(`  Has menu_url:        ${sig.has_menu_url}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
