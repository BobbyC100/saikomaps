#!/usr/bin/env node
/**
 * Quick audit: for entities missing coords, what location data DO we have?
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Entities missing coords — what else do they have?
  const { rows: locData } = await client.query(`
    SELECT
      COUNT(*)::int AS missing_coords,
      COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END)::int AS has_address,
      COUNT(CASE WHEN google_place_id IS NOT NULL THEN 1 END)::int AS has_gpid,
      COUNT(CASE WHEN neighborhood IS NOT NULL AND neighborhood != '' THEN 1 END)::int AS has_neighborhood,
      COUNT(CASE WHEN website IS NOT NULL AND website != '' THEN 1 END)::int AS has_website
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED','CANDIDATE')
      AND (latitude IS NULL OR longitude IS NULL)
  `);
  console.log('\n=== Entities MISSING coords ===');
  console.log(JSON.stringify(locData[0], null, 2));

  // Entities missing coords BUT have GPID (easy backfill via Google Details)
  const { rows: gpidNoCoords } = await client.query(`
    SELECT COUNT(*)::int AS gpid_no_coords
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED','CANDIDATE')
      AND (latitude IS NULL OR longitude IS NULL)
      AND google_place_id IS NOT NULL
  `);
  console.log(`\nHave GPID but no coords (cheap backfill): ${gpidNoCoords[0].gpid_no_coords}`);

  // Entities missing coords, no GPID, but HAVE address
  const { rows: addrNoCoords } = await client.query(`
    SELECT COUNT(*)::int AS addr_no_coords
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED','CANDIDATE')
      AND (latitude IS NULL OR longitude IS NULL)
      AND google_place_id IS NULL
      AND address IS NOT NULL AND address != ''
  `);
  console.log(`Have address but no coords/GPID (geocodable): ${addrNoCoords[0].addr_no_coords}`);

  // Truly location-blind: no coords, no GPID, no address
  const { rows: blind } = await client.query(`
    SELECT COUNT(*)::int AS blind
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED','CANDIDATE')
      AND (latitude IS NULL OR longitude IS NULL)
      AND google_place_id IS NULL
      AND (address IS NULL OR address = '')
  `);
  console.log(`No coords, no GPID, no address (need discovery): ${blind[0].blind}`);

  // For entities WITH coords — how complete is the rest?
  const { rows: withCoords } = await client.query(`
    SELECT
      COUNT(*)::int AS has_coords,
      COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END)::int AS also_has_address,
      COUNT(CASE WHEN neighborhood IS NOT NULL AND neighborhood != '' THEN 1 END)::int AS also_has_neighborhood,
      COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END)::int AS also_has_phone,
      COUNT(CASE WHEN hours IS NOT NULL THEN 1 END)::int AS also_has_hours
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED','CANDIDATE')
      AND latitude IS NOT NULL AND longitude IS NOT NULL
  `);
  console.log('\n=== Entities WITH coords — what else do they have? ===');
  console.log(JSON.stringify(withCoords[0], null, 2));

  // Sample: entities missing coords but have GPID (show a few)
  const { rows: samples } = await client.query(`
    SELECT name, google_place_id, address, neighborhood
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED','CANDIDATE')
      AND (latitude IS NULL OR longitude IS NULL)
      AND google_place_id IS NOT NULL
    LIMIT 5
  `);
  console.log('\n=== Sample: have GPID, missing coords ===');
  for (const r of samples) {
    console.log(`  ${r.name} | GPID: ${r.google_place_id ? 'yes' : 'no'} | addr: ${r.address || '(none)'} | hood: ${r.neighborhood || '(none)'}`);
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
