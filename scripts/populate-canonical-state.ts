/**
 * Fields v2: Populate canonical_entity_state from existing entities + golden_records
 *
 * Phase 2 of the Fields v2 transition.
 * Run AFTER: seed-fields-v2-registries.ts
 * Run BEFORE: slim-entities migration (20260306200000)
 *
 * What this script does:
 *   1. For every entity in entities, create a canonical_entity_state row using
 *      the best available data (entities fields primary, golden_records fallback).
 *   2. For every field written, create a canonical_sanctions row recording
 *      which source backed that value.
 *   3. For entities with golden_records.identity_signals, write derived_signals rows.
 *   4. For entities with taglines, write interpretation_cache rows.
 *
 * Sanction method logic:
 *   - google_place_id, lat/lng from Google → AUTO_HIGH_CONFIDENCE / source=google_places
 *   - All other fields from entities (legacy) → HUMAN_APPROVED / source=system_import
 *     (Rationale: these were human-curated imports; we treat them as human-approved
 *      rather than auto-sanctioned to be conservative about data provenance.)
 *
 * Usage:
 *   npx ts-node scripts/populate-canonical-state.ts
 *   npx ts-node scripts/populate-canonical-state.ts --dry-run
 *   npx ts-node scripts/populate-canonical-state.ts --limit 10
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit=') || a === '--limit');
const LIMIT = LIMIT_ARG
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1] ?? LIMIT_ARG.split('=')[1] ?? '9999')
  : undefined;

const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function writeCanonicalSanction(opts: {
  entityId: string;
  attributeKey: string;
  claimId: string;
  sanctionedBy: string;
  sanctionMethod: 'AUTO_HIGH_CONFIDENCE' | 'AUTO_SOLE_SOURCE' | 'HUMAN_APPROVED' | 'HUMAN_OVERRIDE';
}) {
  if (DRY_RUN) return;

  // Retire any existing current sanction for this (entity, attribute)
  await db.canonical_sanctions.updateMany({
    where: { entity_id: opts.entityId, attribute_key: opts.attributeKey, is_current: true },
    data: { is_current: false },
  });

  await db.canonical_sanctions.create({
    data: {
      entity_id: opts.entityId,
      attribute_key: opts.attributeKey,
      claim_id: opts.claimId,
      sanctioned_by: opts.sanctionedBy,
      sanction_method: opts.sanctionMethod,
      is_current: true,
    },
  });
}

async function writeClaim(opts: {
  entityId: string;
  attributeKey: string;
  rawValue: unknown;
  normalizedValue?: string;
  sourceId: string;
  sourceUrl?: string;
  extractionMethod: 'API' | 'SCRAPE' | 'AI_EXTRACT' | 'HUMAN' | 'IMPORT';
  confidence?: number;
  resolutionMethod: 'SLUG_EXACT' | 'GOOGLE_PLACE_ID_EXACT' | 'PLACEKEY_EXACT' | 'FUZZY_MATCH' | 'HUMAN_REVIEW' | 'NEW_ENTITY';
}): Promise<string> {
  const claimId = crypto.randomUUID();
  if (DRY_RUN) return claimId;

  await db.observed_claims.create({
    data: {
      claim_id: claimId,
      entity_id: opts.entityId,
      attribute_key: opts.attributeKey,
      raw_value: opts.rawValue as never,
      normalized_value: opts.normalizedValue ?? null,
      source_id: opts.sourceId,
      source_url: opts.sourceUrl ?? null,
      observed_at: new Date(),
      extraction_method: opts.extractionMethod,
      confidence: opts.confidence ?? null,
      resolution_method: opts.resolutionMethod,
    },
  });

  return claimId;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[populate-canonical-state] Starting${DRY_RUN ? ' (DRY RUN)' : ''}...`);

  // Count total entities
  const total = await db.entities.count();
  console.log(`[populate-canonical-state] Found ${total} entities.`);

  const limit = LIMIT ?? total;
  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches
  for (let offset = 0; offset < limit; offset += BATCH_SIZE) {
    const batch = await db.entities.findMany({
      skip: offset,
      take: Math.min(BATCH_SIZE, limit - offset),
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        website: true,
        instagram: true,
        description: true,
        category: true,
        primary_vertical: true,
        neighborhood: true,
        cuisineType: true,
        priceLevel: true,
        googlePhotos: true,
        hours: true,
        googlePlaceId: true,
        tips: true,
        tagline: true,
        pullQuote: true,
        pullQuoteSource: true,
        pullQuoteAuthor: true,
        pullQuoteUrl: true,
        reservationUrl: true,
        businessStatus: true,
        googlePlacesAttributes: true,
        merchant_signals: {
          select: { menu_url: true, winelist_url: true },
        },
      },
    });

    for (const entity of batch) {
      try {
        // Check if already populated
        const existing = await db.canonical_entity_state.findUnique({
          where: { entity_id: entity.id },
          select: { entity_id: true },
        });

        if (existing) {
          skipped++;
          processed++;
          continue;
        }

        // --- Look up golden_record for fallback data ---
        const golden = entity.googlePlaceId
          ? await db.golden_records.findFirst({
              where: { google_place_id: entity.googlePlaceId },
              select: {
                description: true,
                hours_json: true,
                menu_url: true,
                winelist_url: true,
                google_places_attributes: true,
                identity_signals: true,
                place_personality: true,
                cuisine_posture: true,
                service_model: true,
                price_tier: true,
                wine_program_intent: true,
              },
            })
          : null;

        // --- Resolve best values (entity primary, golden fallback) ---
        const resolvedDescription = entity.description ?? golden?.description ?? null;
        const resolvedHours = entity.hours ?? golden?.hours_json ?? null;
        const resolvedMenuUrl = entity.merchant_signals?.menu_url ?? golden?.menu_url ?? null;
        const resolvedWinelistUrl = entity.merchant_signals?.winelist_url ?? golden?.winelist_url ?? null;
        const resolvedGoogleAttrs = entity.googlePlacesAttributes ?? golden?.google_places_attributes ?? null;

        // --- Write canonical_entity_state row ---
        if (!DRY_RUN) {
          await db.canonical_entity_state.create({
            data: {
              entity_id: entity.id,
              name: entity.name,
              google_place_id: entity.googlePlaceId ?? null,
              latitude: entity.latitude ?? null,
              longitude: entity.longitude ?? null,
              address: entity.address ?? null,
              neighborhood: entity.neighborhood ?? null,
              phone: entity.phone ?? null,
              website: entity.website ?? null,
              instagram: entity.instagram ?? null,
              hours_json: resolvedHours as never,
              price_level: entity.priceLevel ?? null,
              reservation_url: entity.reservationUrl ?? null,
              menu_url: resolvedMenuUrl ?? null,
              winelist_url: resolvedWinelistUrl ?? null,
              description: resolvedDescription ?? null,
              cuisine_type: entity.cuisineType ?? null,
              category: entity.category ?? null,
              tips: entity.tips ?? [],
              google_photos: entity.googlePhotos as never,
              google_places_attributes: resolvedGoogleAttrs as never,
              last_sanctioned_at: new Date(),
              sanctioned_by: 'SYSTEM:populate-canonical-state',
            },
          });
        }

        // --- Write claims + sanctions for key fields ---
        // Name (from entity → human-curated import)
        const nameClaim = await writeClaim({
          entityId: entity.id,
          attributeKey: 'name',
          rawValue: entity.name,
          normalizedValue: entity.name.toLowerCase().trim(),
          sourceId: 'system_import',
          extractionMethod: 'IMPORT',
          resolutionMethod: 'SLUG_EXACT',
        });
        await writeCanonicalSanction({
          entityId: entity.id,
          attributeKey: 'name',
          claimId: nameClaim,
          sanctionedBy: 'SYSTEM:populate-canonical-state',
          sanctionMethod: 'HUMAN_APPROVED',
        });

        // Google Place ID (from Google API → auto high confidence)
        if (entity.googlePlaceId) {
          const gpidClaim = await writeClaim({
            entityId: entity.id,
            attributeKey: 'google_place_id',
            rawValue: entity.googlePlaceId,
            sourceId: 'google_places',
            extractionMethod: 'API',
            resolutionMethod: 'GOOGLE_PLACE_ID_EXACT',
            confidence: 1.0,
          });
          await writeCanonicalSanction({
            entityId: entity.id,
            attributeKey: 'google_place_id',
            claimId: gpidClaim,
            sanctionedBy: 'SYSTEM:populate-canonical-state',
            sanctionMethod: 'AUTO_HIGH_CONFIDENCE',
          });
        }

        // Lat/lng (from entity — sourced from Google originally)
        if (entity.latitude != null && entity.longitude != null) {
          const latClaim = await writeClaim({
            entityId: entity.id,
            attributeKey: 'latitude',
            rawValue: Number(entity.latitude),
            sourceId: 'google_places',
            extractionMethod: 'API',
            resolutionMethod: 'SLUG_EXACT',
            confidence: 1.0,
          });
          await writeCanonicalSanction({
            entityId: entity.id,
            attributeKey: 'latitude',
            claimId: latClaim,
            sanctionedBy: 'SYSTEM:populate-canonical-state',
            sanctionMethod: 'AUTO_HIGH_CONFIDENCE',
          });

          const lngClaim = await writeClaim({
            entityId: entity.id,
            attributeKey: 'longitude',
            rawValue: Number(entity.longitude),
            sourceId: 'google_places',
            extractionMethod: 'API',
            resolutionMethod: 'SLUG_EXACT',
            confidence: 1.0,
          });
          await writeCanonicalSanction({
            entityId: entity.id,
            attributeKey: 'longitude',
            claimId: lngClaim,
            sanctionedBy: 'SYSTEM:populate-canonical-state',
            sanctionMethod: 'AUTO_HIGH_CONFIDENCE',
          });
        }

        // Description (human-approved from import)
        if (resolvedDescription) {
          const descClaim = await writeClaim({
            entityId: entity.id,
            attributeKey: 'description',
            rawValue: resolvedDescription,
            sourceId: golden?.description && !entity.description ? 'google_places' : 'system_import',
            extractionMethod: 'IMPORT',
            resolutionMethod: 'SLUG_EXACT',
          });
          await writeCanonicalSanction({
            entityId: entity.id,
            attributeKey: 'description',
            claimId: descClaim,
            sanctionedBy: 'SYSTEM:populate-canonical-state',
            sanctionMethod: 'HUMAN_APPROVED',
          });
        }

        // --- Write derived_signals for SceneSense inputs ---
        const signals: Array<{ key: string; value: unknown }> = [];

        if (golden?.cuisine_posture) signals.push({ key: 'cuisine_posture', value: golden.cuisine_posture });
        if (golden?.service_model) signals.push({ key: 'service_model', value: golden.service_model });
        if (golden?.price_tier) signals.push({ key: 'price_tier', value: golden.price_tier });
        if (golden?.wine_program_intent) signals.push({ key: 'wine_program_intent', value: golden.wine_program_intent });
        if (golden?.place_personality) signals.push({ key: 'place_personality', value: golden.place_personality });
        if (golden?.identity_signals) signals.push({ key: 'identity_signals', value: golden.identity_signals });

        if (!DRY_RUN && signals.length > 0) {
          for (const sig of signals) {
            await db.derived_signals.upsert({
              where: {
                entity_id_signal_key_signal_version: {
                  entity_id: entity.id,
                  signal_key: sig.key,
                  signal_version: 'v1_migrated',
                },
              },
              create: {
                entity_id: entity.id,
                signal_key: sig.key,
                signal_value: sig.value as never,
                signal_version: 'v1_migrated',
                input_claim_ids: [],
              },
              update: {
                signal_value: sig.value as never,
              },
            });
          }
        }

        // --- Write interpretation_cache for taglines ---
        if (entity.tagline && !DRY_RUN) {
          await db.interpretation_cache.upsert({
            where: {
              entity_id_output_type_prompt_version: {
                entity_id: entity.id,
                output_type: 'TAGLINE',
                prompt_version: 'v1_migrated',
              },
            },
            create: {
              entity_id: entity.id,
              output_type: 'TAGLINE',
              content: { text: entity.tagline } as never,
              prompt_version: 'v1_migrated',
              input_signal_ids: [],
              is_current: true,
            },
            update: {
              content: { text: entity.tagline } as never,
              is_current: true,
            },
          });
        }

        // --- Write interpretation_cache for pull quotes ---
        if (entity.pullQuote && !DRY_RUN) {
          await db.interpretation_cache.upsert({
            where: {
              entity_id_output_type_prompt_version: {
                entity_id: entity.id,
                output_type: 'PULL_QUOTE',
                prompt_version: 'v1_migrated',
              },
            },
            create: {
              entity_id: entity.id,
              output_type: 'PULL_QUOTE',
              content: {
                text: entity.pullQuote,
                author: entity.pullQuoteAuthor ?? null,
                source_name: entity.pullQuoteSource ?? null,
                source_url: entity.pullQuoteUrl ?? null,
              } as never,
              prompt_version: 'v1_migrated',
              input_signal_ids: [],
              is_current: true,
            },
            update: {
              content: {
                text: entity.pullQuote,
                author: entity.pullQuoteAuthor ?? null,
                source_name: entity.pullQuoteSource ?? null,
                source_url: entity.pullQuoteUrl ?? null,
              } as never,
            },
          });
        }

        created++;
        processed++;

        if (processed % 25 === 0) {
          console.log(`[populate-canonical-state] ${processed}/${limit} processed (${created} created, ${skipped} skipped, ${errors} errors)`);
        }
      } catch (err) {
        errors++;
        processed++;
        console.error(`[populate-canonical-state] Error for entity ${entity.id} (${entity.slug}):`, err);
      }
    }
  }

  console.log('\n[populate-canonical-state] Done.');
  console.log(`  Total processed: ${processed}`);
  console.log(`  Created:         ${created}`);
  console.log(`  Skipped:         ${skipped} (already populated)`);
  console.log(`  Errors:          ${errors}`);

  if (DRY_RUN) {
    console.log('\n[populate-canonical-state] DRY RUN — no data was written.');
  }
}

main()
  .catch((err) => {
    console.error('[populate-canonical-state] Fatal error:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
