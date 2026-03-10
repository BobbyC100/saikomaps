/**
 * scripts/print-place-profile-foundation.ts
 *
 * Profile Data Foundation V1 — Field Inventory Snapshot
 * Prints a single consolidated view of everything we have (and don't have)
 * for a given place, grouped by layer.
 *
 * Usage:
 *   npx tsx scripts/print-place-profile-foundation.ts <slug>
 *   npx tsx scripts/print-place-profile-foundation.ts donna-s
 *   npx tsx scripts/print-place-profile-foundation.ts donna-s --json   (raw JSON only)
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const slug = process.argv[2];
const JSON_MODE = process.argv.includes('--json');

if (!slug) {
  console.error('Usage: npx tsx scripts/print-place-profile-foundation.ts <slug>');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function present<T>(val: T | null | undefined): val is NonNullable<T> {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

const OK   = '✅';
const MISS = '❌';
const PART = '⚠️ ';

function mark(val: unknown): string {
  return present(val) ? OK : MISS;
}

function strVal(val: unknown): string {
  if (!present(val)) return '(null)';
  if (typeof val === 'string') return val.length > 80 ? val.slice(0, 80) + '…' : val;
  if (typeof val === 'boolean') return String(val);
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) return `[${val.length} items]`;
  return JSON.stringify(val).slice(0, 80);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const entity = await db.entities.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      neighborhood: true,
      address: true,
      latitude: true,
      longitude: true,
      primary_vertical: true,
      category: true,
      cuisineType: true,
      priceLevel: true,
      businessStatus: true,
      googlePlaceId: true,
      // Actionability
      phone: true,
      website: true,
      instagram: true,
      reservationUrl: true,
      // Editorial
      description: true,
      tagline: true,
      pullQuote: true,
      pullQuoteSource: true,
      pullQuoteAuthor: true,
      pullQuoteUrl: true,
      tips: true,
      // Hours
      hours: true,
      // Media
      googlePhotos: true,
      // Offering raw attrs
      googlePlacesAttributes: true,
      // Signals
      merchant_signals: {
        select: {
          menu_url: true,
          winelist_url: true,
          reservation_url: true,
          ordering_url: true,
          extraction_confidence: true,
          last_updated_at: true,
        },
      },
      coverage_sources: {
        select: { source_name: true, url: true, excerpt: true, published_at: true },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  if (!entity) {
    console.error(`No entity found for slug "${slug}"`);
    process.exit(1);
  }

  // Fetch golden record
  const golden = entity.googlePlaceId
    ? await db.golden_records.findFirst({
        where: { google_place_id: entity.googlePlaceId },
        select: {
          canonical_id: true,
          hours_json: true,
          instagram_hours_raw: true,
          menu_url: true,
          winelist_url: true,
          cuisine_posture: true,
          service_model: true,
          price_tier: true,
          wine_program_intent: true,
          place_personality: true,
          identity_signals: true,
          google_places_attributes: true,
          winner_sources: true,
          field_confidences: true,
          promotion_status: true,
          menu_signals: {
            select: { id: true } as Record<string, unknown>,
          } as Record<string, unknown>,
          winelist_signals: {
            select: { id: true } as Record<string, unknown>,
          } as Record<string, unknown>,
        } as Parameters<typeof db.golden_records.findFirst>[0]['select'],
      })
    : null;

  // Fetch TraceSignalsCache by entity.id (FK now points to entities.id, not golden_records)
  const prlRow = await db.traceSignalsCache.findUnique({
    where: { entityId: entity.id },
  }).catch(() => null) ?? null;

  // Compute effective hours (same fallback logic as route)
  const entityHours = entity.hours
    ? (typeof entity.hours === 'string' ? tryParse(entity.hours) : entity.hours)
    : null;
  const goldenHours = golden?.hours_json
    ? (typeof golden.hours_json === 'string' ? tryParse(golden.hours_json) : golden.hours_json)
    : null;
  const effectiveHours = entityHours ?? goldenHours;

  // Google attrs (entity first, golden fallback)
  const googleAttrs =
    (entity.googlePlacesAttributes as Record<string, unknown> | null) ??
    (golden?.google_places_attributes as Record<string, unknown> | null) ??
    null;

  // Build snapshot
  const snapshot = {
    slug: entity.slug,
    name: entity.name,
    generatedAt: new Date().toISOString(),

    layers: {
      // 1. Identity + Core Facts
      identity: {
        id: entity.id,
        slug: entity.slug,
        name: entity.name,
        neighborhood: entity.neighborhood,
        address: entity.address,
        latitude: entity.latitude ? Number(entity.latitude) : null,
        longitude: entity.longitude ? Number(entity.longitude) : null,
        primaryVertical: entity.primary_vertical,
        category: entity.category,
        cuisineType: entity.cuisineType,
        priceLevel: entity.priceLevel,
        businessStatus: entity.businessStatus,
        googlePlaceId: entity.googlePlaceId,
      },

      // 2. Actionability
      actionability: {
        website: entity.website,
        instagram: entity.instagram,
        phone: entity.phone,
        reservationUrl: entity.reservationUrl,
        hasLatLng: !!(entity.latitude && entity.longitude),
        menuUrl: entity.merchant_signals?.menu_url ?? golden?.menu_url ?? null,
        winelistUrl: entity.merchant_signals?.winelist_url ?? golden?.winelist_url ?? null,
      },

      // 3. Hours
      hours: {
        entityHoursPresent: !!entityHours,
        entityHours: entityHours,
        goldenHoursPresent: !!goldenHours,
        instagramHoursRaw: golden?.instagram_hours_raw ?? null,
        effectiveSource: entityHours ? 'entity' : goldenHours ? 'golden' : 'none',
        effectiveHours: effectiveHours,
      },

      // 4. Offering Signals
      offeringSignals: {
        // From googlePlacesAttributes (entity or golden)
        serves_dinner: boolAttr(googleAttrs, 'serves_dinner'),
        serves_lunch: boolAttr(googleAttrs, 'serves_lunch'),
        serves_breakfast: boolAttr(googleAttrs, 'serves_breakfast'),
        serves_brunch: boolAttr(googleAttrs, 'serves_brunch'),
        serves_wine: boolAttr(googleAttrs, 'serves_wine'),
        serves_beer: boolAttr(googleAttrs, 'serves_beer'),
        serves_cocktails: boolAttr(googleAttrs, 'serves_cocktails'),
        serves_vegetarian_food: boolAttr(googleAttrs, 'serves_vegetarian_food'),
        // From golden enrichment
        priceLevel_entity: entity.priceLevel,
        priceTier_golden: golden?.price_tier ?? null,
        cuisinePosture: golden?.cuisine_posture ?? null,
        serviceModel: golden?.service_model ?? null,
        wineProgramIntent: golden?.wine_program_intent ?? null,
        placePersonality: golden?.place_personality ?? null,
        signalsSource: googleAttrs?.['_signals_source'] ?? null,
      },

      // 5. Menu + Beverage
      menuBeverage: {
        menuUrl_merchantSignals: entity.merchant_signals?.menu_url ?? null,
        menuUrl_golden: golden?.menu_url ?? null,
        winelistUrl_merchantSignals: entity.merchant_signals?.winelist_url ?? null,
        winelistUrl_golden: golden?.winelist_url ?? null,
        effectiveMenuUrl: entity.merchant_signals?.menu_url ?? golden?.menu_url ?? null,
        effectiveWinelistUrl: entity.merchant_signals?.winelist_url ?? golden?.winelist_url ?? null,
        menuSignalsRow: !!((golden as Record<string, unknown> | null)?.menu_signals),
        winelistSignalsRow: !!((golden as Record<string, unknown> | null)?.winelist_signals),
        merchantSignalsConfidence: entity.merchant_signals?.extraction_confidence
          ? Number(entity.merchant_signals.extraction_confidence)
          : null,
        merchantSignalsUpdatedAt: entity.merchant_signals?.last_updated_at?.toISOString() ?? null,
      },

      // 6. Coverage
      coverage: {
        count: entity.coverage_sources.length,
        sources: entity.coverage_sources.map((cs) => ({
          sourceName: cs.source_name,
          url: cs.url,
          hasExcerpt: !!cs.excerpt,
          publishedAt: cs.published_at?.toISOString() ?? null,
        })),
        pullQuote: entity.pullQuote,
        pullQuoteSource: entity.pullQuoteSource,
        pullQuoteAuthor: entity.pullQuoteAuthor,
      },

      // 7. SceneSense
      scenesense: {
        goldenRecordPresent: !!golden,
        goldenCanonicalId: golden?.canonical_id ?? null,
        promotionStatus: golden?.promotion_status ?? null,
        identitySignals: golden?.identity_signals ?? null,
        prlCachePresent: !!prlRow,
        // PRL = null if no golden record
        whyNull: !golden
          ? 'No golden record linked to this entity\'s googlePlaceId'
          : !(golden.identity_signals)
          ? 'Golden record exists but identity_signals is null'
          : 'Should be available — check prl-materialize',
      },

      // 8. Media
      media: {
        photoUrlCount: Array.isArray(entity.googlePhotos) ? entity.googlePhotos.length : 0,
        hasGooglePhotos: Array.isArray(entity.googlePhotos) && entity.googlePhotos.length > 0,
        description: entity.description,
        tagline: entity.tagline,
        tips: entity.tips,
        hasCuratorNote: false, // sourced from map_places, not queried here
      },

      // 9. Provenance
      provenance: {
        goldenWinnerSources: golden?.winner_sources ?? null,
        goldenFieldConfidences: golden?.field_confidences ?? null,
        merchantSignalsUpdatedAt: entity.merchant_signals?.last_updated_at?.toISOString() ?? null,
        googleAttrsSource: googleAttrs?.['_meta']
          ? (googleAttrs['_meta'] as Record<string, unknown>)['source']
          : null,
        googleAttrsFetchedAt: googleAttrs?.['_meta']
          ? (googleAttrs['_meta'] as Record<string, unknown>)['fetched_at']
          : null,
        signalsSource: googleAttrs?.['_signals_source'] ?? null,
        signalsUpdatedAt: googleAttrs?.['_signals_updated_at'] ?? null,
      },
    },
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  // ---------------------------------------------------------------------------
  // Pretty print
  // ---------------------------------------------------------------------------
  const l = snapshot.layers;

  console.log('\n' + '═'.repeat(64));
  console.log(`  PROFILE FOUNDATION V1 — ${snapshot.name.toUpperCase()}`);
  console.log(`  slug: ${snapshot.slug}  |  ${snapshot.generatedAt}`);
  console.log('═'.repeat(64));

  // 1. Identity
  console.log('\n── 1. IDENTITY + CORE FACTS');
  console.log(`  ${mark(l.identity.neighborhood)} neighborhood      ${strVal(l.identity.neighborhood)}`);
  console.log(`  ${mark(l.identity.address)}      address           ${strVal(l.identity.address)}`);
  console.log(`  ${mark(l.identity.latitude)}      lat/lng           ${l.identity.latitude}, ${l.identity.longitude}`);
  console.log(`  ${mark(l.identity.primaryVertical)} primaryVertical   ${strVal(l.identity.primaryVertical)}`);
  console.log(`  ${mark(l.identity.category)}      category          ${strVal(l.identity.category)}`);
  console.log(`  ${mark(l.identity.cuisineType)}   cuisineType       ${strVal(l.identity.cuisineType)}`);
  console.log(`  ${mark(l.identity.priceLevel)}    priceLevel        ${strVal(l.identity.priceLevel)}`);
  console.log(`  ${mark(l.identity.googlePlaceId)} googlePlaceId     ${strVal(l.identity.googlePlaceId)}`);
  console.log(`  ${mark(l.identity.businessStatus)} businessStatus   ${strVal(l.identity.businessStatus)}`);

  // 2. Actionability
  console.log('\n── 2. ACTIONABILITY');
  console.log(`  ${mark(l.actionability.website)}       website           ${strVal(l.actionability.website)}`);
  console.log(`  ${mark(l.actionability.instagram)}     instagram         ${strVal(l.actionability.instagram)}`);
  console.log(`  ${mark(l.actionability.phone)}         phone             ${strVal(l.actionability.phone)}`);
  console.log(`  ${mark(l.actionability.reservationUrl)} reservationUrl   ${strVal(l.actionability.reservationUrl)}`);
  console.log(`  ${l.actionability.hasLatLng ? OK : MISS}         directions        ${l.actionability.hasLatLng ? 'lat/lng present' : 'missing'}`);
  console.log(`  ${mark(l.actionability.menuUrl)}       menuUrl           ${strVal(l.actionability.menuUrl)}`);
  console.log(`  ${mark(l.actionability.winelistUrl)}   winelistUrl       ${strVal(l.actionability.winelistUrl)}`);

  // 3. Hours
  console.log('\n── 3. HOURS');
  console.log(`  ${mark(l.hours.effectiveHours)} effectiveSource   ${l.hours.effectiveSource}`);
  console.log(`  ${mark(l.hours.entityHoursPresent ? l.hours.entityHours : null)} entity.hours      ${l.hours.entityHoursPresent ? 'present' : '(null)'}`);
  console.log(`  ${mark(l.hours.goldenHoursPresent ? l.hours.goldenHours : null)} golden hours_json ${l.hours.goldenHoursPresent ? 'present' : '(null)'}`);
  console.log(`  ${mark(l.hours.instagramHoursRaw)} instagramHoursRaw ${strVal(l.hours.instagramHoursRaw)}`);

  // 4. Offering Signals
  console.log('\n── 4. OFFERING SIGNALS');
  const os = l.offeringSignals;
  const boolLine = (label: string, val: boolean | null) =>
    `  ${val === true ? OK : val === false ? '⛔' : MISS} ${label.padEnd(22)} ${val === null ? '(null — not confirmed)' : String(val)}`;
  console.log(boolLine('serves_dinner', os.serves_dinner));
  console.log(boolLine('serves_lunch', os.serves_lunch));
  console.log(boolLine('serves_breakfast', os.serves_breakfast));
  console.log(boolLine('serves_brunch', os.serves_brunch));
  console.log(boolLine('serves_wine', os.serves_wine));
  console.log(boolLine('serves_beer', os.serves_beer));
  console.log(boolLine('serves_cocktails', os.serves_cocktails));
  console.log(boolLine('serves_vegetarian', os.serves_vegetarian_food));
  console.log(`  ${mark(os.priceTier_golden)}    priceTier (golden) ${strVal(os.priceTier_golden)}`);
  console.log(`  ${mark(os.cuisinePosture)}  cuisinePosture     ${strVal(os.cuisinePosture)}`);
  console.log(`  ${mark(os.serviceModel)}    serviceModel       ${strVal(os.serviceModel)}`);
  console.log(`  ${mark(os.wineProgramIntent)} wineProgramIntent ${strVal(os.wineProgramIntent)}`);
  console.log(`  ${mark(os.placePersonality)} placePersonality  ${strVal(os.placePersonality)}`);
  if (os.signalsSource) console.log(`       signals source: ${os.signalsSource}`);

  // 5. Menu + Beverage
  console.log('\n── 5. MENU + BEVERAGE');
  const mb = l.menuBeverage;
  console.log(`  ${mark(mb.effectiveMenuUrl)}    menuUrl (effective)     ${strVal(mb.effectiveMenuUrl)}`);
  console.log(`       ↳ merchant_signals: ${strVal(mb.menuUrl_merchantSignals)}`);
  console.log(`       ↳ golden_records:   ${strVal(mb.menuUrl_golden)}`);
  console.log(`  ${mark(mb.effectiveWinelistUrl)} winelistUrl (effective) ${strVal(mb.effectiveWinelistUrl)}`);
  console.log(`       ↳ merchant_signals: ${strVal(mb.winelistUrl_merchantSignals)}`);
  console.log(`       ↳ golden_records:   ${strVal(mb.winelistUrl_golden)}`);
  console.log(`  ${mb.menuSignalsRow ? OK : MISS}    menu_signals row        ${mb.menuSignalsRow ? 'present' : '(none)'}`);
  console.log(`  ${mb.winelistSignalsRow ? OK : MISS} winelist_signals row    ${mb.winelistSignalsRow ? 'present' : '(none)'}`);

  // 6. Coverage
  console.log('\n── 6. COVERAGE');
  const cv = l.coverage;
  console.log(`  ${cv.count > 0 ? OK : MISS} coverage_sources  ${cv.count} source(s)`);
  if (cv.count > 0) {
    cv.sources.forEach((s) => {
      console.log(`       · ${s.sourceName} — ${s.url.slice(0, 60)} ${s.hasExcerpt ? '[excerpt]' : '[no excerpt]'}`);
    });
  }
  console.log(`  ${mark(cv.pullQuote)} pullQuote         ${strVal(cv.pullQuote)}`);
  if (cv.pullQuote) {
    console.log(`       source: ${strVal(cv.pullQuoteSource)}  author: ${strVal(cv.pullQuoteAuthor)}`);
  }

  // 7. SceneSense
  console.log('\n── 7. SCENESENSE');
  const ss = l.scenesense;
  console.log(`  ${ss.goldenRecordPresent ? OK : MISS} goldenRecord      ${ss.goldenRecordPresent ? `present (${ss.goldenCanonicalId})` : '(none)'}`);
  if (ss.goldenRecordPresent) {
    console.log(`  ${mark(ss.promotionStatus)} promotionStatus   ${strVal(ss.promotionStatus)}`);
    console.log(`  ${ss.identitySignals ? OK : MISS} identitySignals   ${ss.identitySignals ? 'present' : '(null)'}`);
  }
  console.log(`  ${ss.prlCachePresent ? OK : MISS} prlCache          ${ss.prlCachePresent ? 'present' : '(none)'}`);
  if (!ss.goldenRecordPresent || !ss.identitySignals) {
    console.log(`  ${PART} SceneSense null:  ${ss.whyNull}`);
  }

  // 8. Media
  console.log('\n── 8. MEDIA');
  const md = l.media;
  console.log(`  ${md.hasGooglePhotos ? OK : MISS} googlePhotos      ${md.photoUrlCount} photo(s)`);
  console.log(`  ${mark(md.description)} description       ${strVal(md.description)}`);
  console.log(`  ${mark(md.tagline)} tagline           ${strVal(md.tagline)}`);
  console.log(`  ${md.tips.length > 0 ? OK : MISS} tips              ${md.tips.length} tip(s)`);

  // 9. Provenance
  console.log('\n── 9. PROVENANCE');
  const pv = l.provenance;
  console.log(`  ${mark(pv.googleAttrsSource)} googleAttrs source       ${strVal(pv.googleAttrsSource)}`);
  console.log(`  ${mark(pv.googleAttrsFetchedAt)} googleAttrs fetched_at  ${strVal(pv.googleAttrsFetchedAt)}`);
  console.log(`  ${mark(pv.signalsSource)} signalsSource            ${strVal(pv.signalsSource)}`);
  console.log(`  ${mark(pv.signalsUpdatedAt)} signalsUpdatedAt         ${strVal(pv.signalsUpdatedAt)}`);
  console.log(`  ${mark(pv.merchantSignalsUpdatedAt)} merchantSignals updated ${strVal(pv.merchantSignalsUpdatedAt)}`);
  console.log(`  ${mark(pv.goldenWinnerSources)} goldenWinnerSources      ${pv.goldenWinnerSources ? '[present]' : '(null)'}`);

  console.log('\n' + '═'.repeat(64) + '\n');
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function tryParse(val: unknown): Record<string, unknown> | null {
  try {
    return typeof val === 'string' ? JSON.parse(val) : (val as Record<string, unknown>);
  } catch {
    return null;
  }
}

function boolAttr(attrs: Record<string, unknown> | null, key: string): boolean | null {
  if (!attrs) return null;
  const v = attrs[key];
  return typeof v === 'boolean' ? v : null;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
