/**
 * Seed GPID Resolution Queue
 * POST /api/admin/tools/seed-gpid-queue
 *
 * Finds all entities without a google_place_id, runs the GPID resolver
 * (Nearby Search + Text Search fallback), and:
 *   - MATCH: auto-applies GPID to the entity
 *   - AMBIGUOUS / NO_MATCH / ERROR: creates a gpid_resolution_queue row for human review
 *
 * Body (optional): { limit?: number, dryRun?: boolean }
 *
 * Returns: { matched, queued, skipped, errors, total }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchPlace, nearbySearch, type PlaceSearchResult } from '@/lib/google-places';
import { tokenSortRatio } from '@/lib/similarity';
import { haversineDistance } from '@/lib/haversine';

const NEARBY_RADIUS_M = 200;
const NAME_SIM_THRESHOLD = 0.85;
const TEXT_QUERY_SUFFIX = ' Los Angeles';
const RATE_LIMIT_MS = 150;

function normalize(s: string): string {
  return (s ?? '').toLowerCase().trim();
}

function cleanName(raw: string): string {
  const s = (raw || '').trim();
  return s.includes(',') ? s.split(',')[0].trim() : s;
}

function nameSim(a: string, b: string): number {
  if (!a || !b) return 0;
  return tokenSortRatio(normalize(a), normalize(b));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface ResolveResult {
  status: 'MATCH' | 'AMBIGUOUS' | 'NO_MATCH' | 'ERROR';
  reason: string;
  gpid?: string;
  similarity?: number;
  candidates: Array<{
    google_place_id: string;
    name: string;
    formatted_address: string;
    lat: number | null;
    lng: number | null;
    types: string[];
  }>;
}

async function resolveEntity(
  name: string,
  lat: number | null,
  lng: number | null,
): Promise<ResolveResult> {
  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const cleaned = cleanName(name);

  try {
    // 1) Nearby search if we have coords
    if (hasCoords) {
      const nearby = await nearbySearch(lat!, lng!, NEARBY_RADIUS_M);
      await sleep(RATE_LIMIT_MS);

      if (nearby.length > 0) {
        let best: PlaceSearchResult | null = null;
        let bestScore = 0;
        let bestDist = Infinity;
        for (const r of nearby) {
          const score = nameSim(cleaned, r.name);
          const dist = haversineDistance(lat!, lng!, r.location.lat, r.location.lng, 'm');
          if (score > bestScore || (score === bestScore && dist < bestDist)) {
            bestScore = score;
            bestDist = dist;
            best = r;
          }
        }
        if (best && bestScore >= NAME_SIM_THRESHOLD && bestDist <= NEARBY_RADIUS_M) {
          return {
            status: 'MATCH',
            reason: 'NEARBY_STRONG_MATCH',
            gpid: best.placeId,
            similarity: bestScore,
            candidates: nearby.slice(0, 7).map((r) => ({
              google_place_id: r.placeId,
              name: r.name,
              formatted_address: r.address,
              lat: r.location.lat,
              lng: r.location.lng,
              types: r.types ?? [],
            })),
          };
        }
      }
    }

    // 2) Text search fallback
    const textResults = await searchPlace(`${cleaned}${TEXT_QUERY_SUFFIX}`, { maxResults: 7 });
    await sleep(RATE_LIMIT_MS);

    const candidates = textResults.slice(0, 7).map((r) => ({
      google_place_id: r.placeId,
      name: r.name,
      formatted_address: r.address,
      lat: r.location.lat,
      lng: r.location.lng,
      types: r.types ?? [],
    }));

    if (textResults.length === 0) {
      return { status: 'NO_MATCH', reason: 'TEXT_ZERO_RESULTS', candidates: [] };
    }

    // Score all results and pick the best
    let bestResult = textResults[0];
    let bestScore = nameSim(cleaned, bestResult.name);
    for (const r of textResults.slice(1)) {
      const score = nameSim(cleaned, r.name);
      if (score > bestScore) {
        bestScore = score;
        bestResult = r;
      }
    }

    // If best match is strong, return MATCH even if there are other results
    if (bestScore >= NAME_SIM_THRESHOLD) {
      return {
        status: 'MATCH',
        reason: textResults.length === 1 ? 'TEXT_SINGLE_HIGH_SIM' : 'TEXT_BEST_HIGH_SIM',
        gpid: bestResult.placeId,
        similarity: bestScore,
        candidates,
      };
    }

    // If best match is moderate-to-weak, only MATCH if it's the only result
    if (textResults.length === 1) {
      return { status: 'NO_MATCH', reason: 'TEXT_LOW_SIM', similarity: bestScore, candidates };
    }

    // Multiple results with no strong match — ambiguous
    return {
      status: 'AMBIGUOUS',
      reason: `TEXT_MULTI_RESULTS`,
      similarity: bestScore,
      gpid: bestResult.placeId,
      candidates,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'ERROR', reason: msg.slice(0, 200), candidates: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = (body as Record<string, unknown>).limit as number ?? 200;
    const dryRun = (body as Record<string, unknown>).dryRun as boolean ?? false;
    const singleEntityId = (body as Record<string, unknown>).entityId as string | undefined;
    const batchEntityIds = (body as Record<string, unknown>).entityIds as string[] | undefined;

    // ── Batch entity IDs mode ─────────────────────────────────────────
    // Accepts an array of entity IDs and processes them sequentially.
    // Used by Coverage Ops bulk "Find GPID" action.
    if (batchEntityIds && Array.isArray(batchEntityIds) && batchEntityIds.length > 0) {
      const entities = await db.entities.findMany({
        where: { id: { in: batchEntityIds } },
        select: { id: true, name: true, slug: true, latitude: true, longitude: true, googlePlaceId: true },
      });

      const runId = `seed-batch-${Date.now()}`;
      let matched = 0;
      let queued = 0;
      let skipped = 0;
      let errors = 0;

      for (const entity of entities) {
        if (entity.googlePlaceId) {
          skipped++;
          continue;
        }

        const lat = entity.latitude ? Number(entity.latitude) : null;
        const lng = entity.longitude ? Number(entity.longitude) : null;
        const result = await resolveEntity(entity.name, lat, lng);

        if (result.status === 'MATCH' && result.gpid) {
          if (!dryRun) {
            await db.entities.update({
              where: { id: entity.id },
              data: { googlePlaceId: result.gpid },
            });
          }
          matched++;
          continue;
        }

        // Check if already pending
        const existing = await db.gpid_resolution_queue.findFirst({
          where: { entityId: entity.id, humanStatus: 'PENDING' },
        });
        if (existing) {
          skipped++;
          continue;
        }

        if (!dryRun) {
          await db.gpid_resolution_queue.create({
            data: {
              entityId: entity.id,
              candidateGpid: result.gpid ?? null,
              resolverStatus: result.status,
              reasonCode: result.reason,
              similarityScore: result.similarity ?? null,
              candidatesJson: {
                candidates: result.candidates,
                numCandidates: result.candidates.length,
              },
              sourceRunId: runId,
            },
          });
        }

        if (result.status === 'ERROR') errors++;
        else queued++;
      }

      return NextResponse.json({
        action: 'seed-gpid-queue',
        dryRun,
        total: entities.length,
        matched,
        queued,
        skipped,
        errors,
        runId,
      });
    }

    // ── Single entity mode ────────────────────────────────────────────
    if (singleEntityId) {
      const entity = await db.entities.findUnique({
        where: { id: singleEntityId },
        select: { id: true, name: true, slug: true, latitude: true, longitude: true, googlePlaceId: true },
      });
      if (!entity) {
        return NextResponse.json({ error: `Entity not found: ${singleEntityId}` }, { status: 404 });
      }
      if (entity.googlePlaceId) {
        return NextResponse.json({
          action: 'seed-gpid-queue',
          total: 1, matched: 0, queued: 0, skipped: 1, errors: 0,
          message: `Already has GPID: ${entity.googlePlaceId}`,
        });
      }

      const lat = entity.latitude ? Number(entity.latitude) : null;
      const lng = entity.longitude ? Number(entity.longitude) : null;
      const result = await resolveEntity(entity.name, lat, lng);
      const runId = `seed-single-${Date.now()}`;

      if (result.status === 'MATCH' && result.gpid) {
        if (!dryRun) {
          await db.entities.update({
            where: { id: entity.id },
            data: { googlePlaceId: result.gpid },
          });
        }
        return NextResponse.json({
          action: 'seed-gpid-queue', dryRun, total: 1, matched: 1, queued: 0, skipped: 0, errors: 0,
          resolvedGpid: result.gpid, similarity: result.similarity, reason: result.reason, runId,
        });
      }

      // Queue for human review
      const existing = await db.gpid_resolution_queue.findFirst({
        where: { entityId: entity.id, humanStatus: 'PENDING' },
      });
      if (existing) {
        return NextResponse.json({
          action: 'seed-gpid-queue', total: 1, matched: 0, queued: 0, skipped: 1, errors: 0,
          message: 'Already pending in queue',
        });
      }

      if (!dryRun) {
        await db.gpid_resolution_queue.create({
          data: {
            entityId: entity.id,
            candidateGpid: result.gpid ?? null,
            resolverStatus: result.status,
            reasonCode: result.reason,
            similarityScore: result.similarity ?? null,
            candidatesJson: {
              candidates: result.candidates,
              numCandidates: result.candidates.length,
            },
            sourceRunId: runId,
          },
        });
      }

      return NextResponse.json({
        action: 'seed-gpid-queue', dryRun, total: 1, matched: 0,
        queued: result.status === 'ERROR' ? 0 : 1,
        skipped: 0,
        errors: result.status === 'ERROR' ? 1 : 0,
        reason: result.reason, runId,
      });
    }

    // ── Batch mode ────────────────────────────────────────────────────
    // Find entities without GPIDs
    const entities = await db.entities.findMany({
      where: {
        OR: [
          { googlePlaceId: null },
          { googlePlaceId: '' },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        latitude: true,
        longitude: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    const runId = `seed-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    let matched = 0;
    let queued = 0;
    let skipped = 0;
    let errors = 0;

    for (const entity of entities) {
      const lat = entity.latitude ? Number(entity.latitude) : null;
      const lng = entity.longitude ? Number(entity.longitude) : null;
      const result = await resolveEntity(entity.name, lat, lng);

      if (result.status === 'MATCH' && result.gpid) {
        if (!dryRun) {
          try {
            await db.entities.update({
              where: { id: entity.id },
              data: { googlePlaceId: result.gpid },
            });
            matched++;
            continue;
          } catch (e: unknown) {
            // Unique constraint on google_place_id — another entity already has this GPID.
            // Queue for human review as potential duplicate instead of crashing.
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('Unique constraint')) {
              console.warn(`[Seed GPID] Duplicate GPID ${result.gpid} for ${entity.name} — queuing for review`);
              // Fall through to queue logic below
            } else {
              throw e;
            }
          }
        } else {
          matched++;
          continue;
        }
      }

      // Queue for human review (AMBIGUOUS / NO_MATCH / ERROR)
      // Check if already pending
      const existing = await db.gpid_resolution_queue.findFirst({
        where: { entityId: entity.id, humanStatus: 'PENDING' },
      });
      if (existing) {
        skipped++;
        continue;
      }

      if (!dryRun) {
        await db.gpid_resolution_queue.create({
          data: {
            entityId: entity.id,
            candidateGpid: result.gpid ?? null,
            resolverStatus: result.status,
            reasonCode: result.reason,
            similarityScore: result.similarity ?? null,
            candidatesJson: {
              candidates: result.candidates,
              numCandidates: result.candidates.length,
            },
            sourceRunId: runId,
          },
        });
      }

      if (result.status === 'ERROR') errors++;
      queued++;
    }

    return NextResponse.json({
      action: 'seed-gpid-queue',
      dryRun,
      total: entities.length,
      matched,
      queued,
      skipped,
      errors,
      runId,
    });
  } catch (error: any) {
    console.error('[Seed GPID Queue] Error:', error);
    return NextResponse.json(
      { error: 'Failed to seed GPID queue', message: error.message },
      { status: 500 },
    );
  }
}
