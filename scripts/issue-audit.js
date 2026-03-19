#!/usr/bin/env node
/**
 * Quick audit: are open issues real gaps or stale scanner results?
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // operating_status_unknown — how many actually have business_status set?
  const { rows: [ops] } = await client.query(`
    SELECT
      COUNT(*)::int AS issue_count,
      COUNT(CASE WHEN e.business_status IS NOT NULL AND e.business_status != '' THEN 1 END)::int AS already_have_status,
      COUNT(CASE WHEN e.places_data_cached_at IS NOT NULL THEN 1 END)::int AS have_cached_data
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    WHERE ei.issue_type = 'operating_status_unknown' AND ei.status = 'open'
  `);
  console.log('\n=== operating_status_unknown (582 open) ===');
  console.log(`  Already have business_status: ${ops.already_have_status}`);
  console.log(`  Have cached Google data:      ${ops.have_cached_data}`);
  console.log(`  Truly unknown:                ${ops.issue_count - ops.already_have_status}`);

  // missing_price_level — how many already have it?
  const { rows: [price] } = await client.query(`
    SELECT
      COUNT(*)::int AS issue_count,
      COUNT(CASE WHEN e.price_level IS NOT NULL THEN 1 END)::int AS already_have_price
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    WHERE ei.issue_type = 'missing_price_level' AND ei.status = 'open'
  `);
  console.log('\n=== missing_price_level (389 open) ===');
  console.log(`  Already have price_level: ${price.already_have_price}`);
  console.log(`  Truly missing:           ${price.issue_count - price.already_have_price}`);

  // missing_hours — how many already have hours?
  const { rows: [hrs] } = await client.query(`
    SELECT
      COUNT(*)::int AS issue_count,
      COUNT(CASE WHEN e.hours IS NOT NULL THEN 1 END)::int AS already_have_hours,
      COUNT(CASE WHEN e.google_place_id IS NOT NULL AND e.places_data_cached_at IS NULL THEN 1 END)::int AS have_gpid_not_cached
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    WHERE ei.issue_type = 'missing_hours' AND ei.status = 'open'
  `);
  console.log('\n=== missing_hours (135 open) ===');
  console.log(`  Already have hours:           ${hrs.already_have_hours}`);
  console.log(`  Have GPID but not cached yet: ${hrs.have_gpid_not_cached}`);
  console.log(`  Truly missing:               ${hrs.issue_count - hrs.already_have_hours}`);

  // missing_phone — same check
  const { rows: [ph] } = await client.query(`
    SELECT
      COUNT(*)::int AS issue_count,
      COUNT(CASE WHEN e.phone IS NOT NULL AND e.phone != '' THEN 1 END)::int AS already_have_phone
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    WHERE ei.issue_type = 'missing_phone' AND ei.status = 'open'
  `);
  console.log('\n=== missing_phone (108 open) ===');
  console.log(`  Already have phone: ${ph.already_have_phone}`);
  console.log(`  Truly missing:     ${ph.issue_count - ph.already_have_phone}`);

  // missing_website — same check
  const { rows: [web] } = await client.query(`
    SELECT
      COUNT(*)::int AS issue_count,
      COUNT(CASE WHEN e.website IS NOT NULL AND e.website != '' THEN 1 END)::int AS already_have_website
    FROM entity_issues ei
    JOIN entities e ON e.id = ei.entity_id
    WHERE ei.issue_type = 'missing_website' AND ei.status = 'open'
  `);
  console.log('\n=== missing_website (98 open) ===');
  console.log(`  Already have website: ${web.already_have_website}`);
  console.log(`  Truly missing:       ${web.issue_count - web.already_have_website}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
