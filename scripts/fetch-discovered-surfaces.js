#!/usr/bin/env node
/**
 * Fetch all discovered-but-unfetched merchant surfaces, parse them,
 * and promote surface hints to merchant_signals.
 *
 * This is the "close the loop" script — it processes the 604 surfaces
 * that were discovered during homepage crawling but never fetched.
 *
 * Pipeline: discovered → fetch → parse → promote hints
 *
 * Usage:
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/fetch-discovered-surfaces.js
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/fetch-discovered-surfaces.js --limit=20
 *   ./scripts/db-neon.sh node -r ./scripts/load-env.js scripts/fetch-discovered-surfaces.js --dry-run
 *
 * No API cost — just HTTP fetches to restaurant websites.
 */
const { Client } = require('pg');

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const dryRun = args.includes('--dry-run');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 1_500_000;

// Skip instagram — needs API, not HTTP
const SKIP_TYPES = ['instagram'];

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

function sha256(text) {
  return require('crypto').createHash('sha256').update(text, 'utf8').digest('hex');
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: controller.signal, redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
    });
    const html = await res.text();
    return { ok: true, html, text: htmlToText(html), finalUrl: res.url, status: res.status, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message, ms: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

// Minimal parse — extract the same keys as parse_v1
function parseHtml(html, url) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const canonicalMatch = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);

  // Headings
  const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gis)].map(m => htmlToText(m[1])).filter(Boolean);
  const h2s = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gis)].map(m => htmlToText(m[1])).filter(Boolean);
  const h3s = [...html.matchAll(/<h3[^>]*>(.*?)<\/h3>/gis)].map(m => htmlToText(m[1])).filter(Boolean);

  // Links
  const linkRe = /href=["']([^"']+)["']/gi;
  const internal = [], external = [];
  const menuLinks = [], reservationLinks = [], orderLinks = [], socialLinks = [];
  let m;
  const base = new URL(url);
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
    try {
      const u = new URL(href, url);
      if (u.origin === base.origin) {
        internal.push(u.href);
        if (/\/menu/i.test(u.pathname)) menuLinks.push(u.href);
        if (/\/reserv|\/reserve|\/book/i.test(u.pathname)) reservationLinks.push(u.href);
        if (/\/order/i.test(u.pathname)) orderLinks.push(u.href);
      } else {
        external.push(u.href);
        if (/instagram\.com/i.test(u.href)) socialLinks.push(u.href);
        if (/tiktok\.com/i.test(u.href)) socialLinks.push(u.href);
        if (/facebook\.com/i.test(u.href)) socialLinks.push(u.href);
        if (/resy\.com|opentable\.com|exploretock\.com|tock\.com|sevenrooms/i.test(u.href)) reservationLinks.push(u.href);
        if (/toasttab\.com|order\.online|doordash\.com|ubereats\.com|grubhub\.com/i.test(u.href)) orderLinks.push(u.href);
      }
    } catch {}
  }

  // Text blocks
  const text = htmlToText(html);
  const blocks = text.split(/\s{3,}/).map(b => b.trim()).filter(b => b.length >= 30).slice(0, 20);

  // Platform hints
  const reservation = [];
  const ordering = [];
  if (/resy\.com/i.test(html)) reservation.push('resy');
  if (/opentable\.com/i.test(html)) reservation.push('opentable');
  if (/exploretock\.com|tock\.com/i.test(html)) reservation.push('tock');
  if (/sevenrooms/i.test(html)) reservation.push('sevenrooms');
  if (/toasttab\.com/i.test(html)) ordering.push('toast');
  if (/square\.site|squareup\.com/i.test(html)) ordering.push('square');
  if (/doordash\.com/i.test(html)) ordering.push('doordash');

  const igMatch = html.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);

  return {
    page_title: titleMatch ? titleMatch[1].trim() : null,
    meta_description: metaMatch ? metaMatch[1].trim() : null,
    canonical_url: canonicalMatch ? canonicalMatch[1].trim() : null,
    headings: { h1: h1s.slice(0, 5), h2: h2s.slice(0, 10), h3: h3s.slice(0, 10) },
    links: { internal: [...new Set(internal)].slice(0, 50), external: [...new Set(external)].slice(0, 50) },
    surface_hints: {
      menu_links: [...new Set(menuLinks)],
      reservation_links: [...new Set(reservationLinks)],
      order_links: [...new Set(orderLinks)],
      social_links: [...new Set(socialLinks)],
    },
    text_blocks: blocks,
    platform_hints: {
      reservation, ordering, website_platform: [],
      social: { instagram: igMatch ? `https://instagram.com/${igMatch[1]}` : null },
    },
  };
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const limitClause = limit ? `LIMIT ${limit}` : '';
  const skipList = SKIP_TYPES.map((_, i) => `$${i + 1}`).join(', ');
  const { rows: surfaces } = await client.query(`
    SELECT id, entity_id, surface_type, source_url
    FROM merchant_surfaces
    WHERE fetch_status = 'discovered'
      AND surface_type NOT IN (${skipList})
    ORDER BY discovered_at ASC
    ${limitClause}
  `, SKIP_TYPES);

  console.log(`\n🌐 Fetch Discovered Surfaces`);
  console.log(`   Surfaces to fetch: ${surfaces.length}`);
  if (dryRun) console.log('   Mode: DRY RUN');
  console.log('');

  let fetched = 0, parsed = 0, failed = 0, deduped = 0;
  const byType = {};

  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i];
    const progress = `[${i + 1}/${surfaces.length}]`;
    byType[s.surface_type] = (byType[s.surface_type] || 0) + 1;

    if (dryRun) {
      if (i < 10) console.log(`${progress} Would fetch ${s.surface_type}: ${s.source_url}`);
      fetched++;
      continue;
    }

    const result = await fetchPage(s.source_url);

    if (!result.ok) {
      if (i < 20 || i % 50 === 0) console.log(`${progress} ❌ ${s.surface_type} → ${result.error}`);
      // Write failure row
      await client.query(`
        INSERT INTO merchant_surfaces (id, entity_id, surface_type, source_url, fetch_status, metadata_json)
        VALUES (gen_random_uuid(), $1, $2, $3, 'fetch_failed', $4)
      `, [s.entity_id, s.surface_type, s.source_url, JSON.stringify({ error: result.error, fetch_duration_ms: result.ms, discovered_surface_id: s.id })]);
      failed++;
      continue;
    }

    const contentHash = sha256(result.text);

    // Dedup check
    const { rows: existing } = await client.query(`
      SELECT id FROM merchant_surfaces
      WHERE entity_id = $1 AND surface_type = $2 AND content_hash = $3 AND fetch_status = 'fetch_success'
      LIMIT 1
    `, [s.entity_id, s.surface_type, contentHash]);

    if (existing.length > 0) {
      deduped++;
      continue;
    }

    // Write fetched surface
    const { rows: [newRow] } = await client.query(`
      INSERT INTO merchant_surfaces (id, entity_id, surface_type, source_url, fetch_status, parse_status, content_type, content_hash, raw_text, raw_html, fetched_at, metadata_json)
      VALUES (gen_random_uuid(), $1, $2, $3, 'fetch_success', 'parse_pending', 'text/html', $4, $5, $6, NOW(), $7)
      RETURNING id
    `, [s.entity_id, s.surface_type, result.finalUrl, contentHash, result.text, result.html,
        JSON.stringify({ http_status: result.status, final_url: result.finalUrl, original_url: s.source_url, fetch_duration_ms: result.ms, discovered_surface_id: s.id })]);

    fetched++;

    // Parse immediately
    try {
      const artifact = parseHtml(result.html, result.finalUrl);
      await client.query(`
        INSERT INTO merchant_surface_artifacts (id, merchant_surface_id, artifact_type, artifact_version, artifact_json)
        VALUES (gen_random_uuid(), $1, 'parse_v1', '1', $2)
        ON CONFLICT (merchant_surface_id, artifact_type, artifact_version) DO NOTHING
      `, [newRow.id, JSON.stringify(artifact)]);

      // Update parse status
      await client.query(`UPDATE merchant_surfaces SET parse_status = 'parse_success' WHERE id = $1`, [newRow.id]);
      parsed++;

      if (i < 10 || i % 50 === 0) {
        const hints = [];
        if (artifact.surface_hints.reservation_links.length) hints.push(`res=${artifact.surface_hints.reservation_links.length}`);
        if (artifact.surface_hints.menu_links.length) hints.push(`menu=${artifact.surface_hints.menu_links.length}`);
        if (artifact.surface_hints.order_links.length) hints.push(`order=${artifact.surface_hints.order_links.length}`);
        if (artifact.text_blocks.length) hints.push(`text=${artifact.text_blocks.length} blocks`);
        console.log(`${progress} ✅ ${s.surface_type} → ${hints.join(', ') || 'parsed'}`);
      }
    } catch (e) {
      await client.query(`UPDATE merchant_surfaces SET parse_status = 'parse_failed' WHERE id = $1`, [newRow.id]);
      if (i < 20) console.log(`${progress} ⚠ ${s.surface_type} parse failed: ${e.message}`);
    }

    // Small delay between fetches
    if (i < surfaces.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Fetched: ${fetched} | Parsed: ${parsed} | Deduped: ${deduped} | Failed: ${failed}`);
  console.log(`By type: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`\nRun promote-surface-hints.js next to wire through any new reservation/menu/ordering URLs.`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
