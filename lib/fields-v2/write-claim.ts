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
    db.source_registry.findUnique({ where: { id: sourceId }, select: { trustTier: true, requiresHumanApproval: true } }),
    db.attribute_registry.findUnique({ where: { attributeKey: attributeKey }, select: { sanctionThreshold: true, attributeClass: true } }),
    db.canonical_sanctions.findFirst({
      where: { entityId: entityId, attributeKey: attributeKey, isCurrent: true },
      select: { claimId: true, sanctionId: true },
    }),
  ]);

  if (!source || !attribute) return 'STORE_ONLY';
  if (source.requiresHumanApproval) return 'STORE_ONLY';
  if (attribute.attributeClass !== 'CANONICAL') return 'STORE_ONLY';

  const threshold = Number(attribute.sanctionThreshold);
  const meetsThreshold = confidence == null || confidence >= threshold;

  if (source.trustTier > 2 || !meetsThreshold) return 'STORE_ONLY';
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
        where: { claimId: input.supersededClaimId },
        data: { isActive: false },
      });
    }

    await db.observed_claims.create({
      data: {
        claimId: claimId,
        entityId: input.entityId,
        attributeKey: input.attributeKey,
        rawValue: input.rawValue as never,
        normalizedValue: input.normalizedValue ?? null,
        sourceId: input.sourceId,
        sourceUrl: input.sourceUrl ?? null,
        observedAt: input.observedAt ?? new Date(),
        extractionMethod: input.extractionMethod,
        confidence: input.confidence ?? null,
        resolutionMethod: input.resolutionMethod ?? 'SLUG_EXACT',
        supersedesClaimId: input.supersededClaimId ?? null,
        isActive: true,
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
        where: { entityId: input.entityId, attributeKey: input.attributeKey, isCurrent: true },
        select: { claimId: true },
      });
      const conflict = await db.sanction_conflicts.create({
        data: {
          entityId: input.entityId,
          attributeKey: input.attributeKey,
          claimIds: [existing?.claimId, claimId].filter(Boolean) as string[],
          conflictReason: 'SOURCE_DISAGREEMENT',
          status: 'OPEN',
        },
      });
      conflictId = conflict.conflictId;
    }
    return { claimId, sanctioned: false, sanctionMethod: 'CONFLICT', conflict: true, conflictId };
  }

  // 3. Apply sanction — retire old, write new, update canonical_entity_state
  if (!dryRun) {
    // Ensure canonical_entity_state row exists before writing the sanction (FK requirement)
    await applyToCanonicalState(db, input.entityId, input.attributeKey, input.rawValue);

    await db.canonical_sanctions.updateMany({
      where: { entityId: input.entityId, attributeKey: input.attributeKey, isCurrent: true },
      data: { isCurrent: false },
    });

    await db.canonical_sanctions.create({
      data: {
        entityId: input.entityId,
        attributeKey: input.attributeKey,
        claimId: claimId,
        sanctionedBy: sanctionedBy,
        sanctionMethod: sanctionMethod === 'AUTO_SOLE_SOURCE' ? 'AUTO_SOLE_SOURCE' : 'AUTO_HIGH_CONFIDENCE',
        isCurrent: true,
      },
    });
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
    google_place_id: 'googlePlaceId',
    latitude: 'latitude',
    longitude: 'longitude',
    address: 'address',
    neighborhood: 'neighborhood',
    phone: 'phone',
    website: 'website',
    instagram: 'instagram',
    tiktok: 'tiktok',
    hours: 'hoursJson',
    price_level: 'priceLevel',
    reservation_url: 'reservationUrl',
    menu_url: 'menuUrl',
    winelist_url: 'winelistUrl',
    description: 'description',
    cuisine_type: 'cuisineType',
    category: 'category',
    tips: 'tips',
    google_photos: 'googlePhotos',
    google_places_attributes: 'googlePlacesAttributes',
  };

  const column = fieldMap[attributeKey];
  if (!column) return; // DERIVED or INTERPRETATION attributes don't update canonical_entity_state

  await db.canonical_entity_state.upsert({
    where: { entityId: entityId },
    create: {
      entityId: entityId,
      name: attributeKey === 'name' ? (value as string) : '(pending)',
      [column]: value,
      lastSanctionedAt: new Date(),
      sanctionedBy: 'SYSTEM',
    },
    update: {
      [column]: value,
      lastSanctionedAt: new Date(),
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
      entityId_signalKey_signalVersion: {
        entityId: entityId,
        signalKey: signalKey,
        signalVersion: signalVersion,
      },
    },
    create: {
      entityId: entityId,
      signalKey: signalKey,
      signalValue: signalValue as never,
      signalVersion: signalVersion,
      inputClaimIds: inputClaimIds,
    },
    update: {
      signalValue: signalValue as never,
      inputClaimIds: inputClaimIds,
      computedAt: new Date(),
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
    outputType: 'TAGLINE' | 'PULL_QUOTE' | 'SCENESENSE_PRL' | 'VOICE_DESCRIPTOR' | 'TIMEFOLD';
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
    where: { entityId: entityId, outputType: outputType, isCurrent: true },
    data: { isCurrent: false },
  });

  await db.interpretation_cache.upsert({
    where: {
      entityId_outputType_promptVersion: {
        entityId: entityId,
        outputType: outputType,
        promptVersion: promptVersion,
      },
    },
    create: {
      entityId: entityId,
      outputType: outputType,
      content: content as never,
      promptVersion: promptVersion,
      modelVersion: modelVersion ?? null,
      inputSignalIds: inputSignalIds,
      expiresAt: expiresAt ?? null,
      isCurrent: true,
    },
    update: {
      content: content as never,
      modelVersion: modelVersion ?? null,
      inputSignalIds: inputSignalIds,
      expiresAt: expiresAt ?? null,
      isCurrent: true,
      generatedAt: new Date(),
    },
  });
}
