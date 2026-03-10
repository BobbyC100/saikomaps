/**
 * Seco "derived reset" — wipes ONLY enriched/derived outputs so
 * the entity can be re-enriched cleanly.  Does NOT touch identity
 * fields (name, google_place_id, lat/lng, address, etc.).
 *
 * Usage: npx tsx scripts/seco-derived-reset.ts
 */

import { db } from '../lib/db';

const SLUG = 'seco';

async function main() {
  // ── 1. Look up entity ──
  const entity = await db.entities.findUnique({
    where: { slug: SLUG },
    select: {
      id: true,
      slug: true,
      googlePlaceId: true,
      description: true,
      description_source: true,
      description_confidence: true,
      description_reviewed: true,
      tips: true,
      tagline: true,
      taglineCandidates: true,
      taglineGenerated: true,
      taglinePattern: true,
      taglineSignals: true,
      pullQuote: true,
      pullQuoteAuthor: true,
      pullQuoteSource: true,
      pullQuoteType: true,
      pullQuoteUrl: true,
      thematicTags: true,
      contextualConnection: true,
      curatorAttribution: true,
      intentProfile: true,
      last_enriched_at: true,
      needs_human_review: true,
      overall_confidence: true,
      confidence_updated_at: true,
    },
  });

  if (!entity) {
    console.error(`Entity with slug '${SLUG}' not found.`);
    process.exit(1);
  }

  console.log('\n=== ENTITY BEFORE ===');
  console.log(JSON.stringify(entity, null, 2));

  // Look up golden record via google_place_id
  let goldenBefore: Record<string, unknown> | null = null;
  if (entity.googlePlaceId) {
    goldenBefore = await db.golden_records.findFirst({
      where: { google_place_id: entity.googlePlaceId },
      select: {
        canonical_id: true,
        cuisine_posture: true,
        service_model: true,
        price_tier: true,
        wine_program_intent: true,
        place_personality: true,
        identity_signals: true,
        signals_generated_at: true,
        signals_version: true,
        signals_reviewed: true,
        tagline: true,
        tagline_candidates: true,
        tagline_pattern: true,
        tagline_generated_at: true,
        tagline_signals: true,
        tagline_version: true,
        energy_score: true,
        energy_confidence: true,
        energy_version: true,
        formality_score: true,
        formality_confidence: true,
        formality_version: true,
      },
    });
    console.log('\n=== GOLDEN RECORD BEFORE ===');
    console.log(JSON.stringify(goldenBefore, null, 2));
  }

  // ── 2. Wipe entity enriched fields (raw SQL to avoid Prisma read-back issues) ──
  await db.$executeRawUnsafe(
    `UPDATE entities SET
       description = NULL,
       description_source = NULL,
       description_confidence = NULL,
       description_reviewed = false,
       tips = '{}',
       tagline = NULL,
       tagline_candidates = '{}',
       tagline_generated = NULL,
       tagline_pattern = NULL,
       tagline_signals = NULL,
       pull_quote = NULL,
       pull_quote_author = NULL,
       pull_quote_source = NULL,
       pull_quote_type = NULL,
       pull_quote_url = NULL,
       thematic_tags = '{}',
       contextual_connection = NULL,
       curator_attribution = NULL,
       intent_profile = NULL,
       last_enriched_at = NULL,
       enrichment_stage = NULL,
       needs_human_review = false,
       confidence = NULL,
       overall_confidence = NULL,
       confidence_updated_at = NULL,
       category_enrich_attempted_at = NULL
     WHERE slug = $1`,
    SLUG
  );

  // ── 3. Wipe golden record offering enrichment ──
  if (goldenBefore && (goldenBefore as { canonical_id: string }).canonical_id) {
    const cid = (goldenBefore as { canonical_id: string }).canonical_id;
    await db.golden_records.update({
      where: { canonical_id: cid },
      data: {
        cuisine_posture: null,
        service_model: null,
        price_tier: null,
        wine_program_intent: null,
        place_personality: null,
        identity_signals: undefined as never,
        signals_generated_at: null,
        signals_version: null,
        signals_reviewed: false,
        tagline: null,
        tagline_candidates: [],
        tagline_pattern: null,
        tagline_generated_at: null,
        tagline_signals: undefined as never,
        tagline_version: null,
        energy_score: null,
        energy_confidence: null,
        energy_version: null,
        formality_score: null,
        formality_confidence: null,
        formality_version: null,
      },
    });
    await db.$executeRawUnsafe(
      `UPDATE golden_records SET identity_signals = NULL, tagline_signals = NULL WHERE canonical_id = $1`,
      cid
    );

    // ── 4. Wipe menu_signals + winelist_signals for this golden record ──
    try {
      const menuDel = await db.$executeRawUnsafe(
        `DELETE FROM menu_signals WHERE golden_record_id = $1`, cid
      );
      console.log(`\nDeleted ${menuDel} menu_signals row(s)`);
    } catch { console.log('menu_signals table missing — skipped'); }

    try {
      const winelistDel = await db.$executeRawUnsafe(
        `DELETE FROM winelist_signals WHERE golden_record_id = $1`, cid
      );
      console.log(`Deleted ${winelistDel} winelist_signals row(s)`);
    } catch { console.log('winelist_signals table missing — skipped'); }

    try {
      // TraceSignalsCache.entity_id now FKs to entities.id — use entity.id directly.
      const traceDel = await db.$executeRawUnsafe(
        `DELETE FROM "TraceSignalsCache" WHERE entity_id = $1`, entity.id
      );
      console.log(`Deleted ${traceDel} TraceSignalsCache row(s)`);
    } catch { console.log('TraceSignalsCache table missing — skipped'); }
  }

  // ── 5. Wipe energy_scores + place_tag_scores for the entity ──
  try {
    const energyDel = await db.$executeRawUnsafe(
      `DELETE FROM energy_scores WHERE entity_id = $1`,
      entity.id
    );
    console.log(`Deleted ${energyDel} energy_scores row(s)`);
  } catch { console.log('energy_scores table missing — skipped'); }

  try {
    const tagScoreDel = await db.$executeRawUnsafe(
      `DELETE FROM place_tag_scores WHERE entity_id = $1`,
      entity.id
    );
    console.log(`Deleted ${tagScoreDel} place_tag_scores row(s)`);
  } catch { console.log('place_tag_scores table missing — skipped'); }

  // ── 6. Snapshot AFTER ──
  const entityAfter = await db.entities.findUnique({
    where: { slug: SLUG },
    select: {
      id: true,
      slug: true,
      googlePlaceId: true,
      name: true,
      address: true,
      description: true,
      description_source: true,
      description_confidence: true,
      description_reviewed: true,
      tips: true,
      tagline: true,
      pullQuote: true,
      pullQuoteSource: true,
      intentProfile: true,
      last_enriched_at: true,
    },
  });

  console.log('\n=== ENTITY AFTER ===');
  console.log(JSON.stringify(entityAfter, null, 2));

  if (entity.googlePlaceId) {
    const goldenAfter = await db.golden_records.findFirst({
      where: { google_place_id: entity.googlePlaceId },
      select: {
        canonical_id: true,
        cuisine_posture: true,
        service_model: true,
        price_tier: true,
        wine_program_intent: true,
        place_personality: true,
        identity_signals: true,
        energy_score: true,
        formality_score: true,
        tagline: true,
      },
    });
    console.log('\n=== GOLDEN RECORD AFTER ===');
    console.log(JSON.stringify(goldenAfter, null, 2));
  }

  console.log('\n✓ Seco derived reset complete. Entity + golden record enriched outputs wiped.');
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
