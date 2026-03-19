#!/usr/bin/env node
/**
 * Re-parse all fetched surfaces with updated signal patterns.
 *
 * Reads raw_html from merchant_surfaces (fetch_success), runs the updated
 * parse logic (expanded reservation, menu, social patterns), and writes
 * new parse_v2 artifacts. Then promotes any newly found hints.
 *
 * Does NOT re-fetch — just re-interprets HTML we already have.
 *
 * Usage:
 *   ./scripts/db-neon.sh node scripts/reparse-surfaces.js
 *   ./scripts/db-neon.sh node scripts/reparse-surfaces.js --limit=20
 *   ./scripts/db-neon.sh node scripts/reparse-surfaces.js --dry-run
 */
const { Client } = require('pg');
const crypto = require('crypto');

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const dryRun = args.includes('--dry-run');

// ── Expanded pattern sets (mirrors updated merchant-surface-parse.ts) ──

const RESERVATION_LINK_URL_PATS = [
  /resy\.com/i, /opentable\.com/i, /(?:exploretock|tock)\.com/i,
  /sevenrooms\.com/i, /yelp\.com\/reservations/i, /reserve\.com/i,
  /tablein\.com/i, /(?:getbento|bentobox)\.com.*reserv/i,
  /\/reservations?\b/i, /\/reserve\b/i, /\/book(?:ing)?\b/i,
];
const MENU_LINK_PATTERNS = [
  /\/menus?\b/i, /\/food\b/i, /\/drinks?\b/i, /\/wine\b/i,
  /\/cocktails?\b/i, /\/beverages?\b/i, /\/dinner\b/i, /\/lunch\b/i,
  /\/brunch\b/i, /popmenu\.com/i, /(?:getbento|bentobox)\.com.*\/menu/i,
  /toasttab\.com.*\/menu/i, /\.pdf$/i,
];
const ORDER_LINK_URL_PATS = [
  /doordash\.com/i, /ubereats\.com/i, /chownow\.com/i, /toasttab\.com/i,
  /clover\.com/i, /squareup\.com\/store/i, /square\.site/i,
  /\/order\b/i, /\/online-order/i,
];
const SOCIAL_LINK_URL_PATS = [
  /instagram\.com/i, /facebook\.com/i, /twitter\.com/i, /x\.com/i,
  /tiktok\.com/i, /linkedin\.com/i, /youtube\.com/i,
];
const RESERVATION_PLATFORMS = [
  { platform: 'resy', re: /resy\.com/i },
  { platform: 'opentable', re: /opentable\.com/i },
  { platform: 'tock', re: /(?:exploretock|tock)\.com/i },
  { platform: 'sevenrooms', re: /sevenrooms\.com/i },
  { platform: 'yelp', re: /yelp\.com\/reservations/i },
  { platform: 'reserve', re: /reserve\.com/i },
  { platform: 'tablein', re: /tablein\.com/i },
  { platform: 'bentobox', re: /(?:getbento|bentobox)\.com.*reserv/i },
];
const ORDERING_PLATFORMS = [
  { platform: 'doordash', re: /doordash\.com/i },
  { platform: 'ubereats', re: /ubereats\.com/i },
  { platform: 'chownow', re: /chownow\.com/i },
  { platform: 'toast', re: /(?:order\.toasttab\.com|toasttab\.com\/[a-z0-9%-]+\/(?:order|v3))/i },
  { platform: 'square', re: /(?:squareup\.com\/store|squareup\.com\/online|square\.site)/i },
];

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, '').replace(/\s+/g, ' ').trim();
}

function parseHtml(html, sourceUrl) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Title, meta, canonical
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const page_title = titleMatch ? stripTags(titleMatch[1]) : null;

  const metaPatterns = [
    /<meta[^>]+(?:name|property)=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']description["']/i,
  ];
  let meta_description = null;
  for (const p of metaPatterns) { const m = p.exec(html); if (m) { meta_description = m[1].trim(); break; } }

  const canonicalPatterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
  ];
  let canonical_url = null;
  for (const p of canonicalPatterns) { const m = p.exec(html); if (m) { canonical_url = m[1].trim(); break; } }

  // Headings
  const extractTag = (tag) => [...cleaned.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))].map(m => stripTags(m[1])).filter(Boolean);
  const headings = { h1: extractTag('h1').slice(0, 5), h2: extractTag('h2').slice(0, 10), h3: extractTag('h3').slice(0, 10) };

  // Links
  let base;
  try { base = new URL(sourceUrl); } catch { return null; }
  const internal = new Set(), external = new Set();
  const hrefRe = /<a\b[^>]*\shref=["']([^"']+)["']/gi;
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1].trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    try {
      const u = new URL(href, sourceUrl); u.hash = '';
      if (u.origin === base.origin) internal.add(u.href); else external.add(u.href);
    } catch {}
  }

  const allLinks = [...internal, ...external];

  // Surface hints (expanded patterns)
  const menuHits = new Set(), resHits = new Set(), orderHits = new Set(), socialHits = new Set();
  for (const link of allLinks) {
    if (MENU_LINK_PATTERNS.some(p => p.test(link))) menuHits.add(link);
    if (RESERVATION_LINK_URL_PATS.some(p => p.test(link))) resHits.add(link);
    if (ORDER_LINK_URL_PATS.some(p => p.test(link))) orderHits.add(link);
    if (SOCIAL_LINK_URL_PATS.some(p => p.test(link))) socialHits.add(link);
  }

  // Text blocks
  const textBlocks = extractTag('p').filter(t => t.length >= 30).slice(0, 20);

  // Platform hints (expanded)
  const reservation = new Set(), ordering = new Set();
  let instagram = null, tiktok = null, facebook = null;
  for (const link of external) {
    for (const { platform, re } of RESERVATION_PLATFORMS) { if (re.test(link)) reservation.add(platform); }
    for (const { platform, re } of ORDERING_PLATFORMS) { if (re.test(link)) ordering.add(platform); }
    const igMatch = link.match(/instagram\.com\/([^/?#\s]+)/i);
    if (igMatch && !['p', 'reel', 'explore'].includes(igMatch[1]) && !instagram) {
      instagram = `https://www.instagram.com/${igMatch[1]}/`;
    }
    const tkMatch = link.match(/tiktok\.com\/@?([a-zA-Z0-9._]+)/i);
    if (tkMatch && tkMatch[1] !== 'embed' && !tiktok) {
      tiktok = `https://www.tiktok.com/@${tkMatch[1]}`;
    }
    const fbMatch = link.match(/facebook\.com\/([^/?#\s]+)/i);
    if (fbMatch && !['sharer', 'share', 'dialog', 'plugins', 'tr'].includes(fbMatch[1]) && !facebook) {
      facebook = `https://www.facebook.com/${fbMatch[1]}`;
    }
  }

  // Script-based platform detection
  const websitePlatform = new Set();
  const scriptPatterns = [
    { platform: 'bentobox', re: /(?:getbento|bentobox)\.com/i },
    { platform: 'shopify', re: /(?:cdn\.shopify|assets\.shopify|myshopify)\.com/i },
    { platform: 'toast', re: /(?:cdn-prod\.toasttab|toastpos\.com|toasttab\.com\/web-app)/i },
    { platform: 'square', re: /(?:cdn\.sq-cdn|square-cdn)\.com/i },
  ];
  const scriptRe = /<script\b[^>]*\ssrc=["']([^"']+)["']/gi;
  while ((m = scriptRe.exec(html)) !== null) {
    for (const { platform, re } of scriptPatterns) { if (re.test(m[1])) websitePlatform.add(platform); }
  }

  return {
    page_title, meta_description, canonical_url, headings,
    links: { internal: [...internal].slice(0, 50), external: [...external].slice(0, 50) },
    surface_hints: {
      menu_links: [...menuHits], reservation_links: [...resHits],
      order_links: [...orderHits], social_links: [...socialHits],
    },
    text_blocks: textBlocks,
    platform_hints: {
      reservation: [...reservation], ordering: [...ordering],
      website_platform: [...websitePlatform],
      social: { instagram, tiktok, facebook },
    },
  };
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const limitClause = limit ? `LIMIT ${limit}` : '';
  const { rows: surfaces } = await client.query(`
    SELECT id, entity_id, surface_type, source_url, raw_html
    FROM merchant_surfaces
    WHERE fetch_status = 'fetch_success' AND raw_html IS NOT NULL
    ORDER BY entity_id
    ${limitClause}
  `);

  console.log(`\n🔄 Re-parse Surfaces (v2 patterns)`);
  console.log(`   Surfaces: ${surfaces.length}`);
  if (dryRun) console.log('   Mode: DRY RUN');
  console.log('');

  let parsed = 0, failed = 0;
  let newRes = 0, newMenu = 0, newOrder = 0, newTiktok = 0, newFacebook = 0;

  // Track new findings per entity
  const entityFindings = new Map();

  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i];
    try {
      const artifact = parseHtml(s.raw_html, s.source_url);
      if (!artifact) { failed++; continue; }

      if (!dryRun) {
        // Upsert artifact as parse_v2
        await client.query(`
          INSERT INTO merchant_surface_artifacts (id, merchant_surface_id, artifact_type, artifact_version, artifact_json)
          VALUES (gen_random_uuid(), $1, 'parse_v2', '1', $2)
          ON CONFLICT (merchant_surface_id, artifact_type, artifact_version) DO UPDATE SET artifact_json = $2
        `, [s.id, JSON.stringify(artifact)]);
      }

      parsed++;

      // Track findings
      if (!entityFindings.has(s.entity_id)) entityFindings.set(s.entity_id, { name: null, res: null, menu: null, order: null, tiktok: null, facebook: null, resProvider: null, orderProvider: null });
      const ef = entityFindings.get(s.entity_id);

      if (artifact.surface_hints.reservation_links.length > 0 && !ef.res) {
        ef.res = artifact.surface_hints.reservation_links[0];
        for (const { platform, re } of RESERVATION_PLATFORMS) {
          if (re.test(ef.res)) { ef.resProvider = platform; break; }
        }
        newRes++;
      }
      if (artifact.surface_hints.menu_links.length > 0 && !ef.menu) {
        ef.menu = artifact.surface_hints.menu_links[0];
        newMenu++;
      }
      if (artifact.surface_hints.order_links.length > 0 && !ef.order) {
        ef.order = artifact.surface_hints.order_links[0];
        for (const { platform, re } of ORDERING_PLATFORMS) {
          if (re.test(ef.order)) { ef.orderProvider = platform; break; }
        }
        newOrder++;
      }
      if (artifact.platform_hints.social.tiktok && !ef.tiktok) {
        ef.tiktok = artifact.platform_hints.social.tiktok;
        newTiktok++;
      }
      if (artifact.platform_hints.social.facebook && !ef.facebook) {
        ef.facebook = artifact.platform_hints.social.facebook;
        newFacebook++;
      }

    } catch (e) {
      failed++;
      if (i < 10) console.log(`  ❌ ${s.surface_type} parse error: ${e.message}`);
    }
  }

  // Promote findings to merchant_signals + entities
  let promoted = 0;
  if (!dryRun) {
    for (const [entityId, ef] of entityFindings) {
      if (!ef.res && !ef.menu && !ef.order) continue;

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
      `, [entityId, ef.res, ef.resProvider, ef.menu, ef.order, ef.orderProvider]).catch(() => {});
      promoted++;

      // TikTok → entities
      if (ef.tiktok) {
        const handle = ef.tiktok.match(/tiktok\.com\/@?([a-zA-Z0-9._]+)/i);
        if (handle) {
          await client.query(`
            UPDATE entities SET tiktok = $1
            WHERE id = $2 AND (tiktok IS NULL OR tiktok = '' OR tiktok = '__none__')
          `, [handle[1], entityId]).catch(() => {});
        }
      }
    }

    // Resolve issues
    const { rowCount: resResolved } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'missing_reservations' AND status = 'open'
        AND entity_id IN (SELECT entity_id FROM merchant_signals WHERE reservation_url IS NOT NULL AND reservation_url != '')
    `);
    const { rowCount: menuResolved } = await client.query(`
      UPDATE entity_issues SET status = 'resolved', updated_at = NOW()
      WHERE issue_type = 'missing_menu_link' AND status = 'open'
        AND entity_id IN (SELECT entity_id FROM merchant_signals WHERE menu_url IS NOT NULL AND menu_url != '')
    `);

    console.log(`\n🧹 Resolved issues:`);
    console.log(`  missing_reservations: ${resResolved}`);
    console.log(`  missing_menu_link:    ${menuResolved}`);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Parsed: ${parsed} | Failed: ${failed}`);
  console.log(`Entities with new findings: ${promoted}`);
  console.log(`  Reservation URLs: ${newRes}`);
  console.log(`  Menu URLs:        ${newMenu}`);
  console.log(`  Ordering URLs:    ${newOrder}`);
  console.log(`  TikTok handles:   ${newTiktok}`);
  console.log(`  Facebook pages:   ${newFacebook}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
