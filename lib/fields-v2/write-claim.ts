/**
 * Fields v2: Claim Writer + Sanctioning Function
 *
 * The single write path for all enrichment pipelines.
 * Replaces direct writes to entities columns, golden_records, and merchant_signals.
 *
 * Usage:
 *   import { writeClaimAndSanction } from '@/lib/fields-v2/write-claim';
 *
 *   await writeClaimAndSanction(db, {
 *     entityId: '...',
 *     attributeKey: 'website',
 *     rawValue: 'https://example.com',
 *     sourceId: 'operator_website',
 *     sourceUrl: 'https://example.com',
 *     extractionMethod: 'SCRAPE',
 *     resolutionMethod: 'SLUG_EXACT',
 *     confidence: 0.9,
 *   });
 */

import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClaimInput = {
  entityId: string;
  attributeKey: string;
  rawValue: unknown;
  normalizedValue?: string;
  sourceId: string;
  sourceUrl?: string | null;
  observedAt?: Date;
  extractionMethod: 'API' | 'SCRAPE' | 'AI_EXTRACT' | 'HUMAN' | 'IMPORT';
  confidence?: number | null;
  resolutionMethod?: 'SLUG_EXACT' | 'GOOGLE_PLACE_ID_EXACT' | 'PLACEKEY_EXACT' | 'FUZZY_MATCH' | 'HUMAN_REVIEW' | 'NEW_ENTITY';
  /** ID of the previous claim from the same source to supersede */
  supersededClaimId?: string | null;
};

export type SanctionResult = {
  claimId: string;
  sanctioned: boolean;
  sanctionMethod: string | null;
  conflict: boolean;
  conflictId: string | null;
};

// ---------------------------------------------------------------------------
// Core sanctioning function
// ---------------------------------------------------------------------------

/**
 * Determines whether a new claim should auto-sanction, go to conflict queue, or be stored only.
 *
 * Rules (v1, lean):
 *   AUTO_HIGH_CONFIDENCE: source.trust_tier <= 2 AND confidence >= attribute.sanction_threshold
 *   AUTO_SOLE_SOURCE:     no existing current sanction for this (entity, attribute)
 *   CONFLICT:             existing sanction from different source AND claim disagrees AND trust_tier <= 2
 *   STORE_ONLY:           trust_tier >= 3 or confidence below threshold
 */
async function determineSanctionMethod(
  db: PrismaClient,
  {
    entityId,
    attributeKey,
    sourceId,
    confidence,
  }: {
    entityId: string;
    attributeKey: string;
    sourceId: string;
    confidence: number | null | undefined;
  }
): Promise<'AUTO_HIGH_CONFIDENCE' | 'AUTO_SOLE_SOURCE' | 'STORE_ONLY' | 'CONFLICT'> {
  const [source, attribute, existingSanction] = await Promise.all([
    db.source_registry.findUnique({ where: { id: sourceId }, select: { trust_tier: true, requires_human_approval: true } }),
    db.attribute_registry.findUnique({ where: { attribute_key: attributeKey }, select: { sanction_threshold: true, attribute_class: true } }),
    db.canonical_sanctions.findFirst({
      where: { entity_id: entityId, attribute_key: attributeKey, is_current: true },
      select: { claim_id: true, sanction_id: true },
    }),
  ]);

  if (!source || !attribute) return 'STORE_ONLY';
  if (source.requires_human_approval) return 'STORE_ONLY';
  if (attribute.attribute_class !== 'CANONICAL') return 'STORE_ONLY';

  const threshold = Number(attribute.sanction_threshold);
  const meetsThreshold = confidence == null || confidence >= threshold;

  if (source.trust_tier > 2 || !meetsThreshold) return 'STORE_ONLY';
  if (!existingSanction) return 'AUTO_SOLE_SOURCE';
  return 'AUTO_HIGH_CONFIDENCE';
}

// ---------------------------------------------------------------------------
// Main write function
// ---------------------------------------------------------------------------

/**
 * Writes an observed claim and runs the sanctioning function.
 * If the claim is sanctioned, updates canonical_entity_state.
 * If there's a conflict, creates a sanction_conflicts row.
 */
export async function writeClaimAndSanction(
  db: PrismaClient,
  input: ClaimInput,
  options: { sanctionedBy?: string; dryRun?: boolean } = {}
): Promise<SanctionResult> {
  const { sanctionedBy = 'SYSTEM', dryRun = false } = options;

  // 1. Write the observed claim (immutable)
  const claimId = crypto.randomUUID();

  if (!dryRun) {
    // Supersede the previous claim from same source if provided
    if (input.supersededClaimId) {
      await db.observed_claims.update({
        where: { claim_id: input.supersededClaimId },
        data: { is_active: false },
      });
    }

    await db.observed_claims.create({
      data: {
        claim_id: claimId,
        entity_id: input.entityId,
        attribute_key: input.attributeKey,
        raw_value: input.rawValue as never,
        normalized_value: input.normalizedValue ?? null,
        source_id: input.sourceId,
        source_url: input.sourceUrl ?? null,
        observed_at: input.observedAt ?? new Date(),
        extraction_method: input.extractionMethod,
        confidence: input.confidence ?? null,
        resolution_method: input.resolutionMethod ?? 'SLUG_EXACT',
        supersedes_claim_id: input.supersededClaimId ?? null,
        is_active: true,
      },
    });
  }

  // 2. Determine sanction method
  const sanctionMethod = await determineSanctionMethod(db, {
    entityId: input.entityId,
    attributeKey: input.attributeKey,
    sourceId: input.sourceId,
    confidence: input.confidence,
  });

  if (sanctionMethod === 'STORE_ONLY') {
    return { claimId, sanctioned: false, sanctionMethod: null, conflict: false, conflictId: null };
  }

  if (sanctionMethod === 'CONFLICT') {
    // Create a conflict record for human review
    let conflictId: string | null = null;
    if (!dryRun) {
      const existing = await db.canonical_sanctions.findFirst({
        where: { entity_id: input.entityId, attribute_key: input.attributeKey, is_current: true },
        select: { claim_id: true },
      });
      const conflict = await db.sanction_conflicts.create({
        data: {
          entity_id: input.entityId,
          attribute_key: input.attributeKey,
          claim_ids: [existing?.claim_id, claimId].filter(Boolean) as string[],
          conflict_reason: 'SOURCE_DISAGREEMENT',
          status: 'OPEN',
        },
      });
      conflictId = conflict.conflict_id;
    }
    return { claimId, sanctioned: false, sanctionMethod: 'CONFLICT', conflict: true, conflictId };
  }

  // 3. Apply sanction — retire old, write new, update canonical_entity_state
  if (!dryRun) {
    await db.canonical_sanctions.updateMany({
      where: { entity_id: input.entityId, attribute_key: input.attributeKey, is_current: true },
      data: { is_current: false },
    });

    await db.canonical_sanctions.create({
      data: {
        entity_id: input.entityId,
        attribute_key: input.attributeKey,
        claim_id: claimId,
        sanctioned_by: sanctionedBy,
        sanction_method: sanctionMethod === 'AUTO_SOLE_SOURCE' ? 'AUTO_SOLE_SOURCE' : 'AUTO_HIGH_CONFIDENCE',
        is_current: true,
      },
    });

    // Update the canonical_entity_state field
    await applyToCanonicalState(db, input.entityId, input.attributeKey, input.rawValue);
  }

  return {
    claimId,
    sanctioned: true,
    sanctionMethod,
    conflict: false,
    conflictId: null,
  };
}

// ---------------------------------------------------------------------------
// Apply a sanctioned value to canonical_entity_state
// ---------------------------------------------------------------------------

async function applyToCanonicalState(
  db: PrismaClient,
  entityId: string,
  attributeKey: string,
  value: unknown
): Promise<void> {
  // Map attribute_key → canonical_entity_state column
  const fieldMap: Record<string, string> = {
    name: 'name',
    google_place_id: 'google_place_id',
    latitude: 'latitude',
    longitude: 'longitude',
    address: 'address',
    neighborhood: 'neighborhood',
    phone: 'phone',
    website: 'website',
    instagram: 'instagram',
    hours: 'hours_json',
    price_level: 'price_level',
    reservation_url: 'reservation_url',
    menu_url: 'menu_url',
    winelist_url: 'winelist_url',
    description: 'description',
    cuisine_type: 'cuisine_type',
    category: 'category',
    tips: 'tips',
    google_photos: 'google_photos',
    google_places_attributes: 'google_places_attributes',
  };

  const column = fieldMap[attributeKey];
  if (!column) return; // DERIVED or INTERPRETATION attributes don't update canonical_entity_state

  await db.canonical_entity_state.upsert({
    where: { entity_id: entityId },
    create: {
      entity_id: entityId,
      name: attributeKey === 'name' ? (value as string) : '(pending)',
      [column]: value,
      last_sanctioned_at: new Date(),
      sanctioned_by: 'SYSTEM',
    },
    update: {
      [column]: value,
      last_sanctioned_at: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// Derived signal writer (for SceneSense pipeline)
// ---------------------------------------------------------------------------

export async function writeDerivedSignal(
  db: PrismaClient,
  {
    entityId,
    signalKey,
    signalValue,
    signalVersion,
    inputClaimIds = [],
    dryRun = false,
  }: {
    entityId: string;
    signalKey: string;
    signalValue: unknown;
    signalVersion: string;
    inputClaimIds?: string[];
    dryRun?: boolean;
  }
): Promise<void> {
  if (dryRun) return;

  await db.derived_signals.upsert({
    where: {
      entity_id_signal_key_signal_version: {
        entity_id: entityId,
        signal_key: signalKey,
        signal_version: signalVersion,
      },
    },
    create: {
      entity_id: entityId,
      signal_key: signalKey,
      signal_value: signalValue as never,
      signal_version: signalVersion,
      input_claim_ids: inputClaimIds,
    },
    update: {
      signal_value: signalValue as never,
      input_claim_ids: inputClaimIds,
      computed_at: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// Interpretation cache writer (for voice engine, SceneSense cache)
// ---------------------------------------------------------------------------

export async function writeInterpretationCache(
  db: PrismaClient,
  {
    entityId,
    outputType,
    content,
    promptVersion,
    modelVersion,
    inputSignalIds = [],
    expiresAt,
    dryRun = false,
  }: {
    entityId: string;
    outputType: 'TAGLINE' | 'PULL_QUOTE' | 'SCENESENSE_PRL' | 'VOICE_DESCRIPTOR';
    content: unknown;
    promptVersion: string;
    modelVersion?: string;
    inputSignalIds?: string[];
    expiresAt?: Date | null;
    dryRun?: boolean;
  }
): Promise<void> {
  if (dryRun) return;

  // Mark old entries for this (entity, outputType) as no longer current
  await db.interpretation_cache.updateMany({
    where: { entity_id: entityId, output_type: outputType, is_current: true },
    data: { is_current: false },
  });

  await db.interpretation_cache.upsert({
    where: {
      entity_id_output_type_prompt_version: {
        entity_id: entityId,
        output_type: outputType,
        prompt_version: promptVersion,
      },
    },
    create: {
      entity_id: entityId,
      output_type: outputType,
      content: content as never,
      prompt_version: promptVersion,
      model_version: modelVersion ?? null,
      input_signal_ids: inputSignalIds,
      expires_at: expiresAt ?? null,
      is_current: true,
    },
    update: {
      content: content as never,
      model_version: modelVersion ?? null,
      input_signal_ids: inputSignalIds,
      expires_at: expiresAt ?? null,
      is_current: true,
      generated_at: new Date(),
    },
  });
}
