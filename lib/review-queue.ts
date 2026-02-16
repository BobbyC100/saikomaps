/**
 * Review Queue Business Logic
 * 
 * Handles creating, fetching, and resolving review queue items
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { haversineDistance } from './haversine';
import { updateGoldenRecord } from './survivorship';

const prisma = new PrismaClient();

export interface HydratedReviewItem {
  queue_id: string;
  canonical_id: string | null;
  raw_id_a: string;
  raw_id_b: string | null;
  conflict_type: string;
  match_confidence: number | null;
  conflicting_fields: any;
  priority: number;
  status: string;
  created_at: Date;
  recordA: HydratedRecord;
  recordB: HydratedRecord | null;
  existingCanonical?: {
    canonical_id: string;
    name: string;
    slug: string;
    source_count: number;
  };
  distanceMeters?: number;
}

export interface HydratedRecord {
  raw_id: string;
  source_name: string;
  source_url?: string;
  name: string;
  name_normalized: string;
  lat: number;
  lng: number;
  address?: string;
  neighborhood?: string;
  category?: string;
  phone?: string;
  observed_at: Date;
  raw_json: any;
}

/**
 * Hydrate a raw record for UI display
 */
function hydrateRawRecord(raw: any): HydratedRecord {
  const json = raw.raw_json as any;
  return {
    raw_id: raw.raw_id,
    source_name: raw.source_name,
    source_url: json.source_url,
    name: json.name || 'Unknown',
    name_normalized: raw.name_normalized || '',
    lat: raw.lat ? parseFloat(raw.lat.toString()) : 0,
    lng: raw.lng ? parseFloat(raw.lng.toString()) : 0,
    address: json.address_street
      ? `${json.address_street}, ${json.address_city || ''}`
      : undefined,
    neighborhood: json.neighborhood,
    category: json.category,
    phone: json.phone,
    observed_at: raw.observed_at,
    raw_json: json,
  };
}

/**
 * Fetch review queue items with hydration
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
  if (conflictType) where.conflict_type = conflictType;
  
  const [items, total] = await Promise.all([
    prisma.review_queue.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
      include: {
        raw_record_a: true,
        raw_record_b: true,
        golden_record: true,
      },
    }),
    prisma.review_queue.count({ where }),
  ]);
  
  // Hydrate items
  const hydratedItems: HydratedReviewItem[] = items.map((item) => {
    const recordA = hydrateRawRecord(item.raw_record_a);
    const recordB = item.raw_record_b ? hydrateRawRecord(item.raw_record_b) : null;
    
    return {
      queue_id: item.queue_id,
      canonical_id: item.canonical_id,
      raw_id_a: item.raw_id_a,
      raw_id_b: item.raw_id_b,
      conflict_type: item.conflict_type,
      match_confidence: item.match_confidence
        ? parseFloat(item.match_confidence.toString())
        : null,
      conflicting_fields: item.conflicting_fields,
      priority: item.priority,
      status: item.status,
      created_at: item.created_at,
      recordA,
      recordB,
      existingCanonical: item.golden_record
        ? {
            canonical_id: item.golden_record.canonical_id,
            name: item.golden_record.name,
            slug: item.golden_record.slug,
            source_count: item.golden_record.source_count,
          }
        : undefined,
      distanceMeters: recordB
        ? haversineDistance(recordA.lat, recordA.lng, recordB.lat, recordB.lng)
        : undefined,
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
    where: { queue_id: queueId },
    include: { raw_record_a: true, raw_record_b: true },
  });
  
  if (!queueItem) {
    throw new Error('Queue item not found');
  }
  
  let entityLinksCreated = 0;
  let goldenRecordUpdated = false;
  
  if (resolution === 'merged') {
    // Get or create canonical ID
    const targetCanonicalId = canonicalId || queueItem.canonical_id || crypto.randomUUID();
    
    // Create entity links for both records
    const linksToCreate = [
      {
        canonical_id: targetCanonicalId,
        raw_id: queueItem.raw_id_a,
        match_confidence: queueItem.match_confidence
          ? new Prisma.Decimal(queueItem.match_confidence.toString())
          : null,
        match_method: 'manual_review',
        linked_by: resolvedBy,
      },
    ];
    
    if (queueItem.raw_id_b) {
      linksToCreate.push({
        canonical_id: targetCanonicalId,
        raw_id: queueItem.raw_id_b,
        match_confidence: queueItem.match_confidence
          ? new Prisma.Decimal(queueItem.match_confidence.toString())
          : null,
        match_method: 'manual_review',
        linked_by: resolvedBy,
      });
    }
    
    await prisma.entity_links.createMany({
      data: linksToCreate,
      skipDuplicates: true,
    });
    
    entityLinksCreated = linksToCreate.length;
    
    // Mark raw records as processed
    await prisma.raw_records.updateMany({
      where: {
        raw_id: { in: [queueItem.raw_id_a, queueItem.raw_id_b].filter(Boolean) as string[] },
      },
      data: { is_processed: true },
    });
    
    // Trigger survivorship to update golden record
    await updateGoldenRecord(targetCanonicalId);
    goldenRecordUpdated = true;
  } else if (resolution === 'kept_separate') {
    // Mark both records as processed but don't link them
    await prisma.raw_records.updateMany({
      where: {
        raw_id: { in: [queueItem.raw_id_a, queueItem.raw_id_b].filter(Boolean) as string[] },
      },
      data: { is_processed: true },
    });
  }
  
  // Update queue item
  await prisma.review_queue.update({
    where: { queue_id: queueId },
    data: {
      status: 'resolved',
      resolution,
      resolution_notes: resolutionNotes,
      resolved_by: resolvedBy,
      resolved_at: new Date(),
    },
  });
  
  // Get next item for seamless navigation
  const nextItem = await prisma.review_queue.findFirst({
    where: { status: 'pending' },
    orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
    select: { queue_id: true },
  });
  
  return {
    success: true,
    entityLinksCreated,
    goldenRecordUpdated,
    nextQueueId: nextItem?.queue_id || null,
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
    resolution_notes: reason,
  };
  
  if (decreasePriority) {
    // Increase priority number (lower priority)
    const current = await prisma.review_queue.findUnique({
      where: { queue_id: queueId },
      select: { priority: true },
    });
    
    if (current) {
      updates.priority = Math.min(current.priority + 1, 10);
    }
  }
  
  await prisma.review_queue.update({
    where: { queue_id: queueId },
    data: updates,
  });
  
  return { success: true };
}

/**
 * Create a review queue item
 */
export async function createReviewQueueItem(params: {
  rawIdA: string;
  rawIdB?: string;
  canonicalId?: string;
  conflictType: 'low_confidence_match' | 'attribute_mismatch' | 'potential_duplicate' | 'new_entity';
  matchConfidence?: number;
  conflictingFields?: Record<string, [any, any]>;
  priority?: number;
}): Promise<string> {
  const {
    rawIdA,
    rawIdB,
    canonicalId,
    conflictType,
    matchConfidence,
    conflictingFields,
    priority = 5,
  } = params;
  
  const queueItem = await prisma.review_queue.create({
    data: {
      canonical_id: canonicalId,
      raw_id_a: rawIdA,
      raw_id_b: rawIdB,
      conflict_type: conflictType,
      match_confidence: matchConfidence ? new Prisma.Decimal(matchConfidence) : null,
      conflicting_fields: conflictingFields ? (conflictingFields as Prisma.InputJsonValue) : Prisma.JsonNull,
      priority,
    },
  });
  
  return queueItem.queue_id;
}
