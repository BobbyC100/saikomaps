#!/usr/bin/env node
/**
 * Promote reservation_links, menu_links, order_links, and social_links
 * from parse_v1 artifact surface_hints → merchant_signals.
 *
 * This data was ALREADY extracted by the parser but never wired through.
 * No API calls needed — pure DB read + write.
 *
 * Usage:
 *   ./scripts/db-neon.sh node scripts/promote-surface-hints.js
 *   ./scripts/db-neon.sh node scripts/promote-surface-hints.js --dry-run
 *   ./scripts/db-neon.sh node scripts/promote-surface-hints.js --limit=20
 */
const { Client } = require('pg');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const limitClause = limit ? `LIMIT ${limit}` : '';

  // Pull all parse_v1 artifacts with surface_hints
  const { rows: artifacts } = await client.query(`
    SELECT
      ms.entity_id,
      e.name,
      ms.surface_type,
      msa.artifact_json
    FROM merchant_surface_artifacts msa
    JOIN merchant_surfaces ms ON ms.id = msa.merchant_surface_id
    JOIN entities e ON e.id = ms.entity_id
    WHERE msa.artifact_type = 'parse_v1'
    ORDER BY e.name
    ${limitClause}
  `);

  console.log(`\n🔗 Promote Surface Hints → merchant_signals`);
  console.log(`   Artifacts to scan: ${artifacts.length}`);
  if (dryRun) console.log('   Mode: DRY RUN');
  console.log('');

  // Aggregate best links per entity (across all surfaces)
  const entityData = new Map(); // entity_id → { name, reservation_url, menu_url, ordering_url, ordering_provider, social_links }

  for (const art of artifacts) {
    try {
      const json = typeof art.artifact_json === 'string' ? JSON.parse(art.artifact_json) : art.artifact_json;
      const hints = json.surface_hints || {};
      const platform = json.platform_hints || {};

      if (!entityData.has(art.entity_id)) {
        entityData.set(art.entity_id, { name: art.name });
      }
      const data = entityData.get(art.entity_id);

      // Reservation links
      const resLinks = hints.reservation_links || [];
      if (resLinks.length > 0 && !data.reservation_url) {
        data.reservation_url = resLinks[0];
        // Detect provider
        if (/resy\.com/i.test(resLinks[0])) data.reservation_provider = 'resy';
        else if (/opentable\.com/i.test(resLinks[0])) data.reservation_provider = 'opentable';
        else if (/tock\.com|exploretock/i.test(resLinks[0])) data.reservation_provider = 'tock';
        else if (/sevenrooms/i.test(resLinks[0])) data.reservation_provider = 'sevenrooms';
        else if (/yelp\.com/i.test(resLinks[0])) data.reservation_provider = 'yelp';
        else data.reservation_provider = 'other';
      }

      // Menu links
      const menuLinks = hints.menu_links || [];
      if (menuLinks.length > 0 && !data.menu_url) {
        data.menu_url = menuLinks[0];
      }

      // Ordering links
      const orderLinks = hints.order_links || [];
      if (orderLinks.length > 0 && !data.ordering_url) {
        data.ordering_url = orderLinks[0];
        // Detect provider
        const ordering = platform.ordering || [];
        if (ordering.length > 0) data.ordering_provider = ordering[0];
        else if (/toast/i.test(orderLinks[0])) data.ordering_provider = 'toast';
        else if (/doordash/i.test(orderLinks[0])) data.ordering_provider = 'doordash';
        else if (/ubereats/i.test(orderLinks[0])) data.ordering_provider = 'ubereats';
        else if (/grubhub/i.test(orderLinks[0])) data.ordering_provider = 'grubhub';
        else if (/square/i.test(orderLinks[0])) data.ordering_provider = 'square';
        else data.ordering_provider = 'other';
      }

      // Social links (TikTok especially — we're at 8%)
      const socialLinks = hints.social_links || [];
      const socialPlatform = platform.social || {};
      for (const link of socialLinks) {
        if (/tiktok\.com/i.test(link) && !data.tiktok) {
          const handle = link.match(/tiktok\.com\/@?([a-zA-Z0-9._]+)/);
          data.tiktok = handle ? handle[1] : link;
        }
      }
      if (socialPlatform.tiktok && !data.tiktok) {
        const handle = socialPlatform.tiktok.match(/tiktok\.com\/@?([a-zA-Z0-9._]+)/);
        data.tiktok = handle ? handle[1] : socialPlatform.tiktok;
      }

    } catch {}
  }

  // Write to merchant_signals and entities
  let promoted = { reservation: 0, menu: 0, ordering: 0, tiktok: 0 };
  let entities_updated = 0;

  for (const [entityId, data] of entityData) {
    const hasNew = data.reservation_url || data.menu_url || data.ordering_url;
    if (!hasNew && !data.tiktok) continue;

    if (!dryRun && hasNew) {
      // Upsert merchant_signals
      await client.query(`
        INSERT INTO merchant_signals (entity_id, reservation_url, reservation_provider, menu_url, ordering_url, ordering_provider, last_updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (entity_id) DO UPDATE SET
          reservation_url = COALESCE(merchant_signals.reservation_url, EXCLUDED.reservation_url),
          reservation_provider = COALESCE(merchant_signals.reservation_provider, EXCLUDED.reservation_provider),
          menu_url = COALESCE(merchant_signals.menu_url, EXCLUDED.menu_url),
          ordering_url = COALESCE(merchant_signals.ordering_url, EXCLUDED.ordering_url),
          ordering_provider = COALESCE(merchant_signals.ordering_provider, EXCLUDED.ordering_provider),
          last_updated_at = NOW()
      `, [entityId, data.reservation_url || null, data.reservation_provider || null, data.menu_url || null, data.ordering_url || null, data.ordering_provider || null])
        .catch(e => console.error(`  ⚠ merchant_signals write failed for ${data.name}: ${e.message}`));
    }

    // Write TikTok to entities table if found and missing
    if (!dryRun && data.tiktok) {
      const { rowCount } = await client.query(`
        UPDATE entities SET tiktok = $1
        WHERE id = $2 AND (tiktok IS NULL OR tiktok = '' OR tiktok = '__none__')
      `, [data.tiktok, entityId]);
      if (rowCount > 0) promoted.tiktok++;
    }

    if (data.reservation_url) promoted.reservation++;
    if (data.menu_url) promoted.menu++;
    if (data.ordering_url) promoted.ordering++;
    entities_updated++;

    // Log samples
    if (entities_updated <= 10 || entities_updated % 50 === 0) {
      const parts = [];
      if (data.reservation_url) parts.push(`res=${data.reservation_provider || 'found'}`);
      if (data.menu_url) parts.push('menu');
      if (data.ordering_url) parts.push(`order=${data.ordering_provider || 'found'}`);
      if (data.tiktok) parts.push(`tiktok=@${data.tiktok}`);
      console.log(`  ✅ ${data.name} → ${parts.join(', ')}`);
    }
  }

  // Resolve stale issues
  if (!dryRun) {
    const { rowCount: resResolved } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'missing_reservations' AND status = 'open'
        AND entity_id IN (
          SELECT entity_id FROM merchant_signals
          WHERE reservation_url IS NOT NULL AND reservation_url != ''
        )
    `);
    const { rowCount: menuResolved } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'missing_menu_link' AND status = 'open'
        AND entity_id IN (
          SELECT entity_id FROM merchant_signals
          WHERE menu_url IS NOT NULL AND menu_url != ''
        )
    `);
    console.log(`\n🧹 Resolved stale issues:`);
    console.log(`  missing_reservations: ${resResolved}`);
    console.log(`  missing_menu_link:    ${menuResolved}`);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Entities with new data: ${entities_updated}`);
  console.log(`  Reservation URLs: ${promoted.reservation}`);
  console.log(`  Menu URLs:        ${promoted.menu}`);
  console.log(`  Ordering URLs:    ${promoted.ordering}`);
  console.log(`  TikTok handles:   ${promoted.tiktok}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
