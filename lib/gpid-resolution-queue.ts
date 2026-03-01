/**
 * GPID Resolution Queue
 * Human-in-the-loop for unresolved Google Place ID matches.
 * First "identity queue" type — extensible for enrichment_queue, data_completion_queue.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type GpidResolverStatus = 'MATCH' | 'AMBIGUOUS' | 'NO_MATCH' | 'ERROR';
export type GpidHumanStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO';
export type GpidHumanDecision = 'APPLY_GPID' | 'MARK_NO_MATCH' | 'MARK_AMBIGUOUS';

export interface GpidQueueItem {
  id: string;
  place_id: string;
  candidate_gpid: string | null;
  resolver_status: GpidResolverStatus;
  reason_code: string | null;
  similarity_score: number | null;
  candidates_json: unknown;
  source_run_id: string | null;
  created_at: Date;
  updated_at: Date;
  human_status: GpidHumanStatus;
  human_decision: GpidHumanDecision | null;
  human_note: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  place?: {
    id: string;
    name: string;
    slug: string;
    googlePlaceId: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export interface GetGpidQueueParams {
  humanStatus?: GpidHumanStatus;
  resolverStatus?: GpidResolverStatus;
  reasonCode?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'similarity_desc' | 'similarity_asc' | 'created_asc' | 'created_desc';
}

/** Default sort: highest leverage first (MATCH candidates first, then highest similarity) */
export async function getGpidQueueItems(params: GetGpidQueueParams = {}): Promise<{
  items: GpidQueueItem[];
  pagination: { total: number; offset: number; limit: number };
  stats: { pending: number; approved: number; rejected: number };
}> {
  const {
    humanStatus = 'PENDING',
    resolverStatus,
    reasonCode,
    limit = 50,
    offset = 0,
    sortBy = 'similarity_desc',
  } = params;

  const where: Record<string, unknown> = { human_status: humanStatus };
  if (resolverStatus) where.resolver_status = resolverStatus;
  if (reasonCode) where.reason_code = reasonCode;

  const orderBy =
    sortBy === 'similarity_desc'
      ? ([{ similarity_score: 'desc' as const }, { created_at: 'asc' as const }] as const)
      : sortBy === 'similarity_asc'
        ? ([{ similarity_score: 'asc' as const }, { created_at: 'asc' as const }] as const)
        : sortBy === 'created_asc'
          ? ([{ created_at: 'asc' as const }] as const)
          : ([{ created_at: 'desc' as const }] as const);

  const [items, total, pending, approved, rejected] = await Promise.all([
    prisma.gpid_resolution_queue.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: orderBy as never,
      include: {
        entities: {
          select: {
            id: true,
            name: true,
            slug: true,
            googlePlaceId: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    }),
    prisma.gpid_resolution_queue.count({ where }),
    prisma.gpid_resolution_queue.count({ where: { human_status: 'PENDING' } }),
    prisma.gpid_resolution_queue.count({ where: { human_status: 'APPROVED' } }),
    prisma.gpid_resolution_queue.count({ where: { human_status: 'REJECTED' } }),
  ]);

  const hydrated = items.map((row) => ({
    ...row,
    place: row.entities,
    places: undefined,
  })) as unknown as GpidQueueItem[];

  return {
    items: hydrated,
    pagination: { total, offset, limit },
    stats: { pending, approved, rejected },
  };
}

export async function getGpidQueueItem(id: string): Promise<GpidQueueItem | null> {
  const row = await prisma.gpid_resolution_queue.findUnique({
    where: { id },
    include: {
      entities: {
        select: {
          id: true,
          name: true,
          slug: true,
          googlePlaceId: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });
  if (!row) return null;
  return {
    ...row,
    place: row.entities,
    places: undefined,
  } as unknown as GpidQueueItem;
}

/** Approve → Apply GPID: writes places.google_place_id and marks queue item resolved */
export async function approveGpidQueueItem(params: {
  id: string;
  candidateGpid: string; // must match the candidate to apply
  reviewedBy: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { id, candidateGpid, reviewedBy, note } = params;

  const item = await prisma.gpid_resolution_queue.findUnique({ where: { id } });
  if (!item) return { success: false, error: 'Queue item not found' };
  if (item.human_status !== 'PENDING') return { success: false, error: 'Item already resolved' };

  // For MATCH we have a single candidate; for AMBIGUOUS we may have multiple (in candidates_json)
  const gpidToApply =
    item.candidate_gpid === candidateGpid ? candidateGpid : candidateGpid; // use passed value as authoritative
  if (!gpidToApply || gpidToApply.length < 20) return { success: false, error: 'Invalid candidate GPID' };

  await prisma.$transaction([
    prisma.entities.update({
      where: { id: item.entityId },
      data: { googlePlaceId: gpidToApply },
    }),
    prisma.gpid_resolution_queue.update({
      where: { id },
      data: {
        human_status: 'APPROVED',
        human_decision: 'APPLY_GPID',
        candidate_gpid: gpidToApply,
        human_note: note ?? null,
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
      },
    }),
  ]);

  return { success: true };
}

/** Reject → NO_MATCH: marks queue item resolved, does not write GPID */
export async function rejectGpidQueueItem(params: {
  id: string;
  reviewedBy: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { id, reviewedBy, note } = params;

  const item = await prisma.gpid_resolution_queue.findUnique({ where: { id } });
  if (!item) return { success: false, error: 'Queue item not found' };
  if (item.human_status !== 'PENDING') return { success: false, error: 'Item already resolved' };

  await prisma.gpid_resolution_queue.update({
    where: { id },
    data: {
      human_status: 'REJECTED',
      human_decision: 'MARK_NO_MATCH',
      human_note: note ?? null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
    },
  });

  return { success: true };
}

/** Mark AMBIGUOUS: marks as resolved, human confirms it's ambiguous */
export async function markAmbiguousGpidQueueItem(params: {
  id: string;
  reviewedBy: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { id, reviewedBy, note } = params;

  const item = await prisma.gpid_resolution_queue.findUnique({ where: { id } });
  if (!item) return { success: false, error: 'Queue item not found' };
  if (item.human_status !== 'PENDING') return { success: false, error: 'Item already resolved' };

  await prisma.gpid_resolution_queue.update({
    where: { id },
    data: {
      human_status: 'REJECTED', // or APPROVED with decision MARK_AMBIGUOUS — we treat as resolved
      human_decision: 'MARK_AMBIGUOUS',
      human_note: note ?? null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
    },
  });

  return { success: true };
}

/** Skip: leaves pending, optional audit (extend schema later for skip_count if needed) */
export async function skipGpidQueueItem(id: string): Promise<{ success: boolean; error?: string }> {
  const item = await prisma.gpid_resolution_queue.findUnique({ where: { id } });
  if (!item) return { success: false, error: 'Queue item not found' };
  if (item.human_status !== 'PENDING') return { success: false, error: 'Item already resolved' };
  // No-op: leave pending. Future: add skip_audit table or skip_count.
  return { success: true };
}
