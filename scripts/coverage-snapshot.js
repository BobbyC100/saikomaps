#!/usr/bin/env node
/**
 * Quick coverage snapshot — no tsx, no Prisma, just pg.
 *
 * Reports composite identity health (weighted anchors, not a checklist)
 * and field coverage grouped by what they enable, not as a flat list.
 *
 * Usage: ./scripts/db-neon.sh node scripts/coverage-snapshot.js
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // ── Raw field counts ──────────────────────────────────────────────
  const { rows: [c] } = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE WHEN google_place_id IS NOT NULL THEN 1 END)::int AS has_gpid,
      COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END)::int AS has_coords,
      COUNT(CASE WHEN website IS NOT NULL AND website != '' THEN 1 END)::int AS has_website,
      COUNT(CASE WHEN instagram IS NOT NULL AND instagram != '' AND instagram != '__none__' THEN 1 END)::int AS has_instagram,
      COUNT(CASE WHEN tiktok IS NOT NULL AND tiktok != '' AND tiktok != '__none__' THEN 1 END)::int AS has_tiktok,
      COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END)::int AS has_phone,
      COUNT(CASE WHEN neighborhood IS NOT NULL AND neighborhood != '' THEN 1 END)::int AS has_neighborhood,
      COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END)::int AS has_description,
      COUNT(CASE WHEN hours IS NOT NULL THEN 1 END)::int AS has_hours,
      COUNT(CASE WHEN google_photos IS NOT NULL THEN 1 END)::int AS has_photo
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED','CANDIDATE')
  `);

  // ── Composite identity scoring (mirrors ARCH-IDENTITY-SCORING-V1) ──
  // Weighted anchors: GPID=4, website=3, instagram=2, coords=2, neighborhood=1, phone=1
  // Threshold: score >= 4 = sufficient identity
  const { rows: [id] } = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE WHEN (
        (CASE WHEN google_place_id IS NOT NULL THEN 4 ELSE 0 END) +
        (CASE WHEN website IS NOT NULL AND website != '' THEN 3 ELSE 0 END) +
        (CASE WHEN instagram IS NOT NULL AND instagram != '' AND instagram != '__none__' THEN 2 ELSE 0 END) +
        (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN neighborhood IS NOT NULL AND neighborhood != '' THEN 1 ELSE 0 END) +
        (CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END)
      ) >= 4 THEN 1 END)::int AS sufficient_identity,
      COUNT(CASE WHEN (
        (CASE WHEN google_place_id IS NOT NULL THEN 4 ELSE 0 END) +
        (CASE WHEN website IS NOT NULL AND website != '' THEN 3 ELSE 0 END) +
        (CASE WHEN instagram IS NOT NULL AND instagram != '' AND instagram != '__none__' THEN 2 ELSE 0 END) +
        (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN neighborhood IS NOT NULL AND neighborhood != '' THEN 1 ELSE 0 END) +
        (CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END)
      ) >= 8 THEN 1 END)::int AS strong_identity,
      COUNT(CASE WHEN (
        latitude IS NOT NULL AND longitude IS NOT NULL
        OR google_place_id IS NOT NULL
        OR (neighborhood IS NOT NULL AND neighborhood != '')
      ) THEN 1 END)::int AS has_location
    FROM entities
    WHERE status NOT IN ('PERMANENTLY_CLOSED','CANDIDATE')
  `);

  // ── Derived data ───────────────────────────────────────────────────
  const { rows: [s] } = await client.query(`SELECT COUNT(DISTINCT entity_id)::int AS n FROM merchant_surfaces`);
  const { rows: [t] } = await client.query(`SELECT COUNT(DISTINCT entity_id)::int AS n FROM interpretation_cache WHERE output_type='TAGLINE' AND is_current=true`);
  const { rows: [d] } = await client.query(`SELECT COUNT(DISTINCT entity_id)::int AS n FROM interpretation_cache WHERE output_type='VOICE_DESCRIPTOR' AND is_current=true`);
  const { rows: [sig] } = await client.query(`SELECT COUNT(DISTINCT entity_id)::int AS n FROM derived_signals WHERE signal_key='identity_signals'`);
  const { rows: issues } = await client.query(`SELECT issue_type, COUNT(*)::int AS count FROM entity_issues WHERE status='open' GROUP BY issue_type ORDER BY count DESC`);

  // ── Output ─────────────────────────────────────────────────────────
  const pct = (n) => Math.round((n / c.total) * 100);

  console.log(`\n=== SAIKO COVERAGE SNAPSHOT (${c.total} active entities) ===\n`);

  // Identity health (the thing that matters)
  console.log('IDENTITY HEALTH (weighted anchors, threshold=4)');
  console.log(`  Sufficient identity (≥4): ${id.sufficient_identity}/${c.total} (${pct(id.sufficient_identity)}%)`);
  console.log(`  Strong identity (≥8):     ${id.strong_identity}/${c.total} (${pct(id.strong_identity)}%)`);
  console.log(`  Locatable (any signal):   ${id.has_location}/${c.total} (${pct(id.has_location)}%)`);
  console.log('');

  // Group fields by what they enable, not as a flat checklist
  console.log('DISCOVERY & CONTACT');
  console.log(`  Website:      ${c.has_website} (${pct(c.has_website)}%)  |  Instagram: ${c.has_instagram} (${pct(c.has_instagram)}%)  |  Phone: ${c.has_phone} (${pct(c.has_phone)}%)`);
  console.log('');

  console.log('LOCATION (multiple signals — not all needed)');
  console.log(`  Coords:       ${c.has_coords} (${pct(c.has_coords)}%)  |  Neighborhood: ${c.has_neighborhood} (${pct(c.has_neighborhood)}%)  |  GPID: ${c.has_gpid} (${pct(c.has_gpid)}%)`);
  console.log('');

  console.log('VISIT PLANNING');
  console.log(`  Hours:        ${c.has_hours} (${pct(c.has_hours)}%)  |  Photos: ${c.has_photo} (${pct(c.has_photo)}%)  |  TikTok: ${c.has_tiktok} (${pct(c.has_tiktok)}%)`);
  console.log('');

  console.log('NARRATIVE');
  console.log(`  Description:  ${c.has_description} (${pct(c.has_description)}%)  |  Merchant surfaces: ${s.n}  |  Voice descriptors: ${d.n}`);
  console.log(`  Taglines:     ${t.n}  |  Identity signals: ${sig.n}`);

  if (issues.length) {
    console.log('');
    console.log('OPEN ISSUES');
    for (const i of issues) {
      console.log(`  ${i.issue_type}: ${i.count}`);
    }
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
