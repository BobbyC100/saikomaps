/**
 * scripts/backfill-donnas-menu-wine.ts
 *
 * One-shot signal fill for Donna's (Echo Park).
 * Fetches donnasla.com, discovers menu/wine list URLs, and writes:
 *   - merchant_signals.menu_url
 *   - merchant_signals.winelist_url
 *   - entities.googlePlacesAttributes  (adds offering signals: serves_dinner, serves_wine, etc.)
 *
 * Run with:  npx tsx scripts/backfill-donnas-menu-wine.ts
 * Dry-run:   npx tsx scripts/backfill-donnas-menu-wine.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const DONNA_SLUG = 'donna-s';
const BASE_URL = 'https://www.donnasla.com';
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// URL discovery helpers
// ---------------------------------------------------------------------------

/** Fetch a URL (text), return null on any failure. */
async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SaikoBot/1.0; +https://saiko.com/bot)',
        Accept: 'text/html,*/*',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Check if a URL returns a 2xx. */
async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'SaikoBot/1.0' },
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Extract absolute href values from raw HTML, filter by keyword. */
function extractLinks(html: string, keywords: string[]): string[] {
  const hrefRe = /href=["']([^"']+)["']/gi;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1].trim();
    const lower = href.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw))) {
      found.push(href);
    }
  }
  return [...new Set(found)];
}

/** Resolve a possibly-relative href to an absolute URL. */
function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Discovery: menu URL
// ---------------------------------------------------------------------------

async function discoverMenuUrl(html: string): Promise<string | null> {
  // 1. Links in homepage HTML that look like menu pages
  const candidates = extractLinks(html, ['/menu', 'menu', '/food', '/dining']);
  for (const raw of candidates) {
    const abs = resolveUrl(raw, BASE_URL);
    if (!abs || !abs.startsWith('http')) continue;
    // Skip external (PDFs are OK, links to other domains are not)
    const u = new URL(abs);
    if (u.hostname !== new URL(BASE_URL).hostname && !abs.endsWith('.pdf')) continue;
    if (await checkUrl(abs)) {
      console.log(`  [menu] found via homepage link: ${abs}`);
      return abs;
    }
  }

  // 2. Common path guesses
  const guesses = ['/menus', '/menu', '/food', '/dine', '/dining'];
  for (const path of guesses) {
    const url = `${BASE_URL}${path}`;
    if (await checkUrl(url)) {
      console.log(`  [menu] found via path guess: ${url}`);
      return url;
    }
  }

  console.log('  [menu] no URL discovered');
  return null;
}

// ---------------------------------------------------------------------------
// Discovery: wine list URL
// ---------------------------------------------------------------------------

async function discoverWinelistUrl(homepageHtml: string, menuUrl: string | null): Promise<string | null> {
  // Also fetch the menu page — wine list is often linked from there
  const extraHtml = menuUrl ? (await tryFetch(menuUrl)) ?? '' : '';
  const combinedHtml = homepageHtml + extraHtml;

  const candidates = extractLinks(combinedHtml, [
    '/wine', 'wine-list', 'winelist', '/drinks', '/beverage', '/cocktail',
    'drink-menu', '/spirits',
  ]);
  for (const raw of candidates) {
    const abs = resolveUrl(raw, BASE_URL);
    if (!abs || !abs.startsWith('http')) continue;
    const u = new URL(abs);
    if (u.hostname !== new URL(BASE_URL).hostname && !abs.endsWith('.pdf')) continue;
    if (await checkUrl(abs)) {
      console.log(`  [wine] found via link: ${abs}`);
      return abs;
    }
  }

  const guesses = [
    '/wine', '/wine-list', '/wines', '/drinks', '/beverages',
    '/cocktails', '/bar-menu', '/drink-menu',
  ];
  for (const path of guesses) {
    const url = `${BASE_URL}${path}`;
    if (await checkUrl(url)) {
      console.log(`  [wine] found via path guess: ${url}`);
      return url;
    }
  }

  console.log('  [wine] no URL discovered');
  return null;
}

// ---------------------------------------------------------------------------
// Derive offering signals from page text
// ---------------------------------------------------------------------------

type OfferingSignals = {
  serves_dinner: boolean;
  serves_lunch: boolean | null;
  serves_wine: boolean;
  serves_beer: boolean | null;
  serves_cocktails: boolean | null;
};

function deriveOfferingSignals(homepageHtml: string, menuHtml: string | null): OfferingSignals {
  // Site is likely a JS SPA — text detection is best-effort.
  // Known editorial facts about Donna's are used as authoritative base.
  const combined = (homepageHtml + (menuHtml ?? '')).toLowerCase();

  // Donna's is open 5pm-10pm daily — dinner only. Confirmed from hours in DB.
  const serves_dinner = true;
  // Lunch: hours are 5pm–10pm every day. No lunch service.
  const serves_lunch = false;

  // Wine: Donna's is a wine-forward restaurant (editorial knowledge).
  // Text detection is fallback; known-fact takes precedence.
  const serves_wine =
    combined.includes('wine') ||
    combined.includes('natural wine') ||
    combined.includes('wine list') ||
    true; // Known editorial fact: Donna's is wine-forward

  // Beer: check for mentions
  const serves_beer =
    combined.includes('beer') || combined.includes('draft') ? true : null;

  // Cocktails: Donna's focuses on wine; cocktail program is secondary
  const serves_cocktails =
    combined.includes('cocktail') ||
    combined.includes('negroni') ||
    combined.includes('aperitivo')
      ? true
      : null;

  return { serves_dinner, serves_lunch, serves_wine, serves_beer, serves_cocktails };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Donna's Signal Fill (${DRY_RUN ? 'DRY RUN' : 'LIVE'}) ===\n`);

  // Fetch entity
  const entity = await db.entities.findUnique({
    where: { slug: DONNA_SLUG },
    select: {
      id: true,
      slug: true,
      name: true,
      neighborhood: true,
      googlePlacesAttributes: true,
      merchant_signals: { select: { entityId: true, menuUrl: true, winelistUrl: true } },
    },
  });

  if (!entity) {
    console.error(`Entity not found for slug "${DONNA_SLUG}"`);
    process.exit(1);
  }

  console.log(`Entity: ${entity.name} (${entity.id})`);
  console.log(`Neighborhood: ${entity.neighborhood}`);
  console.log(`Existing merchant_signals:`, entity.merchant_signals);

  // Fetch website
  console.log(`\nFetching ${BASE_URL} …`);
  const html = await tryFetch(BASE_URL);
  if (!html) {
    console.warn(`  Could not fetch ${BASE_URL} — will use known-facts only for signals`);
  } else {
    console.log(`  Fetched ${html.length.toLocaleString()} chars`);
  }

  // Discover URLs
  console.log('\nDiscovering menu URL …');
  const menuUrl = html ? await discoverMenuUrl(html) : null;

  // Optionally fetch menu page for wine list link discovery
  const menuHtml = menuUrl ? await tryFetch(menuUrl) : null;
  if (menuHtml) console.log(`  Fetched menu page: ${menuHtml.length.toLocaleString()} chars`);

  console.log('\nDiscovering wine list URL …');
  const winelistUrl = html ? await discoverWinelistUrl(html, menuUrl) : null;

  // Derive offering signals
  console.log('\nDeriving offering signals …');
  const signals = html
    ? deriveOfferingSignals(html, menuHtml)
    : {
        serves_dinner: true,   // Donna's is dinner-only per DB hours
        serves_lunch: false,
        serves_wine: true,     // Known: wine-forward restaurant
        serves_beer: null,
        serves_cocktails: null,
      };
  console.log('  signals:', signals);

  // Build updated googlePlacesAttributes
  const existingAttrs =
    (entity.googlePlacesAttributes as Record<string, unknown> | null) ?? {};
  const updatedAttrs: Record<string, unknown> = {
    ...existingAttrs,
    serves_dinner: signals.serves_dinner,
    serves_lunch: signals.serves_lunch,
    serves_wine: signals.serves_wine,
    ...(signals.serves_beer !== null ? { serves_beer: signals.serves_beer } : {}),
    ...(signals.serves_cocktails !== null ? { serves_cocktails: signals.serves_cocktails } : {}),
    _signals_source: 'backfill-donnas-menu-wine',
    _signals_updated_at: new Date().toISOString(),
  };

  // Summary
  console.log('\n--- Planned writes ---');
  console.log(`  merchant_signals.menu_url    = ${menuUrl ?? '(no change)'}`);
  console.log(`  merchant_signals.winelist_url = ${winelistUrl ?? '(no change)'}`);
  console.log('  entities.googlePlacesAttributes =', {
    serves_dinner: updatedAttrs.serves_dinner,
    serves_lunch: updatedAttrs.serves_lunch,
    serves_wine: updatedAttrs.serves_wine,
    serves_beer: updatedAttrs.serves_beer,
    serves_cocktails: updatedAttrs.serves_cocktails,
  });

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No writes performed. Re-run without --dry-run to apply.\n');
    return;
  }

  // Write merchant_signals
  await db.merchant_signals.upsert({
    where: { entityId: entity.id },
    create: {
      entityId: entity.id,
      menuUrl: menuUrl ?? undefined,
      winelistUrl: winelistUrl ?? undefined,
    },
    update: {
      ...(menuUrl ? { menuUrl: menuUrl } : {}),
      ...(winelistUrl ? { winelistUrl: winelistUrl } : {}),
    },
  });
  console.log('\n✓ merchant_signals upserted');

  // Write offering signals directly via raw SQL to avoid Prisma enum coercion issues
  // on unrelated fields (enrichment_stage) that don't affect what we're updating.
  await db.$executeRaw`
    UPDATE entities
    SET google_places_attributes = ${JSON.stringify(updatedAttrs)}::jsonb
    WHERE id = ${entity.id}
  `;
  console.log('✓ entities.googlePlacesAttributes updated');

  console.log('\n=== Done ===');
  console.log('Verify: GET /api/places/donna-s');
  console.log('Expect: menuUrl, winelistUrl, offeringSignals.serves_dinner=true, offeringSignals.serves_wine=true\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
