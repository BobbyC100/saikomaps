/**
 * Review Queue Business Logic
 * 
 * Handles creating, fetching, and resolving review queue items
 */

import { Prisma } from '@prisma/client';
import { haversineDistance } from './haversine';
import { db as prisma } from '@/lib/db';

export interface EnrichmentRun {
  id: string;
  sourceName: string;
  searchedName: string | null;
  searchedCity: string | null;
  resultJson: any;
  identityConfidence: number | null;
  anchorCount: number;
  decisionStatus: string;
  createdAt: Date;
}

export interface HydratedReviewItem {
  queueId: string;
  canonicalId: string | null;
  rawIdA: string;
  rawIdB: string | null;
  conflictType: string;
  matchConfidence: number | null;
  conflictingFields: any;
  priority: number;
  status: string;
  createdAt: Date;
  recordA: HydratedRecord;
  recordB: HydratedRecord | null;
  existingCanonical?: {
    canonicalId: string;
    name: string;
    slug: string;
    sourceCount: number;
  };
  distanceMeters?: number;
  // Identity enrichment state (new_entity_review only; null on all other types)
  identityEnrichmentStatus: string | null;
  identityAnchorCount: number | null;
  latestIdentityConfidence: number | null;
  enrichment_runs: EnrichmentRun[];
}

export interface HydratedRecord {
  rawId: string;
  sourceName: string;
  sourceUrl?: string;
  name: string;
  nameNormalized: string;
  lat: number;
  lng: number;
  address?: string;
  neighborhood?: string;
  category?: string;
  phone?: string;
  observedAt: Date;
  rawJson: any;
}

/**
 * Hydrate a raw record for UI display
 */
function hydrateRawRecord(raw: any): HydratedRecord {
  const json = raw.rawJson as any;
  return {
    rawId: raw.rawId,
    sourceName: raw.sourceName,
    sourceUrl: json.source_url,
    name: json.name || 'Unknown',
    nameNormalized: raw.nameNormalized || '',
    lat: raw.lat ? parseFloat(raw.lat.toString()) : 0,
    lng: raw.lng ? parseFloat(raw.lng.toString()) : 0,
    address: json.address_street
      ? `${json.address_street}, ${json.address_city || ''}`
      : undefined,
    neighborhood: json.neighborhood,
    category: json.category,
    phone: json.phone,
    observedAt: raw.observedAt,
    rawJson: json,
  };
}

/**
 * Fetch review queue items with hydration.
 * Items still in machine enrichment (identity_enrichment_status = 'pending_enrichment'
 * or 'enriching') are suppressed — they are not ready for human review.
 */
export async function getReviewQueueItems(params: {
  status?: string;
  conflictType?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  items: HydratedReviewItem[];
  pagination: { total: number; offset: number; limit: number };
  stats: { pending: number; resolved: number };
}> {
  const { status = 'pending', conflictType, limit = 20, offset = 0 } = params;

  const where: any = { status };
  if (conflictType) where.conflictType = conflictType;

  // Suppress items still in machine enrichment — not ready for human adjudication
  where.NOT = {
    identityEnrichmentStatus: { in: ['pending_enrichment', 'enriching'] },
  };

  const [items, total] = await Promise.all([
    prisma.review_queue.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      include: {
        raw_record_a: true,
        raw_record_b: true,
        enrichment_runs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.review_queue.count({ where }),
  ]);

  // Hydrate items
  const hydratedItems: HydratedReviewItem[] = items.map((item) => {
    const recordA = hydrateRawRecord(item.raw_record_a);
    const recordB = item.raw_record_b ? hydrateRawRecord(item.raw_record_b) : null;

    return {
      queueId: item.queueId,
      canonicalId: item.canonicalId,
      rawIdA: item.rawIdA,
      rawIdB: item.rawIdB,
      conflictType: item.conflictType,
      matchConfidence: item.matchConfidence
        ? parseFloat(item.matchConfidence.toString())
        : null,
      conflictingFields: item.conflictingFields,
      priority: item.priority,
      status: item.status,
      createdAt: item.createdAt,
      recordA,
      recordB,
      existingCanonical: undefined,
      distanceMeters: recordB
        ? haversineDistance(recordA.lat, recordA.lng, recordB.lat, recordB.lng)
        : undefined,
      identityEnrichmentStatus: (item as any).identityEnrichmentStatus ?? null,
      identityAnchorCount: (item as any).identityAnchorCount ?? null,
      latestIdentityConfidence: (item as any).latestIdentityConfidence
        ? parseFloat((item as any).latestIdentityConfidence.toString())
        : null,
      enrichment_runs: ((item as any).enrichment_runs ?? []).map((r: any) => ({
        id: r.id,
        sourceName: r.sourceName,
        searchedName: r.searchedName,
        searchedCity: r.searchedCity,
        resultJson: r.resultJson,
        identityConfidence: r.identityConfidence
          ? parseFloat(r.identityConfidence.toString())
          : null,
        anchorCount: r.anchorCount,
        decisionStatus: r.decisionStatus,
        createdAt: r.createdAt,
      })),
    };
  });

  // Get stats
  const stats = await prisma.review_queue.groupBy({
    by: ['status'],
    _count: true,
  });

  return {
    items: hydratedItems,
    pagination: { total, offset, limit },
    stats: {
      pending: stats.find((s) => s.status === 'pending')?._count || 0,
      resolved: stats.find((s) => s.status === 'resolved')?._count || 0,
    },
  };
}

/**
 * Resolve a review queue item
 */
export async function resolveReviewQueueItem(params: {
  queueId: string;
  resolution: 'merged' | 'kept_separate' | 'new_canonical' | 'dismissed' | 'flagged';
  resolutionNotes?: string;
  resolvedBy: string;
  canonicalId?: string;
}): Promise<{
  success: boolean;
  entityLinksCreated: number;
  goldenRecordUpdated: boolean;
  nextQueueId: string | null;
}> {
  const { queueId, resolution, resolutionNotes, resolvedBy, canonicalId } = params;

  const queueItem = await prisma.review_queue.findUnique({
    where: { queueId: queueId },
    include: { raw_record_a: true, raw_record_b: true },
  });

  if (!queueItem) {
    throw new Error('Queue item not found');
  }

  let entityLinksCreated = 0;
  let goldenRecordUpdated = false;

  if (resolution === 'merged' || resolution === 'kept_separate') {
    // Mark both records as processed but don't link them
    await prisma.raw_records.updateMany({
      where: {
        rawId: { in: [queueItem.rawIdA, queueItem.rawIdB].filter(Boolean) as string[] },
      },
      data: { isProcessed: true },
    });
  }

  // Update queue item
  await prisma.review_queue.update({
    where: { queueId: queueId },
    data: {
      status: 'resolved',
      resolution,
      resolutionNotes: resolutionNotes,
      resolvedBy: resolvedBy,
      resolvedAt: new Date(),
    },
  });

  // Get next item for seamless navigation
  const nextItem = await prisma.review_queue.findFirst({
    where: { status: 'pending' },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    select: { queueId: true },
  });

  return {
    success: true,
    entityLinksCreated,
    goldenRecordUpdated,
    nextQueueId: nextItem?.queueId || null,
  };
}

/**
 * Skip/defer a review queue item
 */
export async function skipReviewQueueItem(params: {
  queueId: string;
  reason?: string;
  decreasePriority?: boolean;
}): Promise<{ success: boolean }> {
  const { queueId, reason, decreasePriority = true } = params;

  const updates: any = {
    status: 'deferred',
    resolutionNotes: reason,
  };

  if (decreasePriority) {
    // Increase priority number (lower priority)
    const current = await prisma.review_queue.findUnique({
      where: { queueId: queueId },
      select: { priority: true },
    });

    if (current) {
      updates.priority = Math.min(current.priority + 1, 10);
    }
  }

  await prisma.review_queue.update({
    where: { queueId: queueId },
    data: updates,
  });

  return { success: true };
}

/**
 * Create a review queue item.
 * For new_entity_review cases pass identityEnrichmentStatus: 'pending_enrichment'
 * so the item is suppressed from human review until the enrichment gate finishes.
 */
export async function createReviewQueueItem(params: {
  rawIdA: string;
  rawIdB?: string | null;
  canonicalId?: string | null;
  conflictType: 'low_confidence_match' | 'attribute_mismatch' | 'potential_duplicate' | 'new_entity' | 'new_entity_review';
  matchConfidence?: number;
  conflictingFields?: Record<string, [any, any]>;
  priority?: number;
  identityEnrichmentStatus?: string | null;
}): Promise<string> {
  const {
    rawIdA,
    rawIdB,
    canonicalId,
    conflictType,
    matchConfidence,
    conflictingFields,
    priority = 5,
    identityEnrichmentStatus = null,
  } = params;

  const queueItem = await prisma.review_queue.create({
    data: {
      canonicalId: canonicalId ?? undefined,
      rawIdA: rawIdA,
      rawIdB: rawIdB ?? undefined,
      conflictType: conflictType,
      matchConfidence: matchConfidence ? new Prisma.Decimal(matchConfidence) : null,
      conflictingFields: conflictingFields ? (conflictingFields as Prisma.InputJsonValue) : Prisma.JsonNull,
      priority,
      identityEnrichmentStatus: identityEnrichmentStatus,
    },
  });

  return queueItem.queueId;
}
