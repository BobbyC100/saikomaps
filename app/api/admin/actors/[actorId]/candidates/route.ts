/**
 * GET  /api/admin/actors/[actorId]/candidates?status=PENDING
 * POST /api/admin/actors/[actorId]/candidates — re-run matching & upsert candidates
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { upsertOperatorPlaceCandidates } from "@/lib/actors/upsertOperatorPlaceCandidates";
import { logPlaceJob } from "@/lib/place-job-log";
import type { OperatorPlaceCandidateStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ actorId: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { actorId } = await params;
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") as OperatorPlaceCandidateStatus) || "PENDING";

    const actor = await db.actor.findUnique({
      where: { id: actorId, kind: "operator" },
      select: { id: true },
    });
    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    const candidates = await db.operatorPlaceCandidate.findMany({
      where: { actorId, status },
      include: {
        entity: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { matchScore: "desc" },
    });

    const entityIds = [...new Set(candidates.map((c) => c.entityId).filter(Boolean))] as string[];
    const existingPrimary =
      entityIds.length > 0
        ? await db.placeActorRelationship.findMany({
            where: {
              entityId: { in: entityIds },
              role: "operator",
              isPrimary: true,
              actorId: { not: actorId },
            },
            include: { actor: { select: { id: true, name: true } } },
          })
        : [];
    const primaryByPlace = Object.fromEntries(
      existingPrimary.map((r) => [r.entityId, { id: r.actor.id, name: r.actor.name }])
    );

    return NextResponse.json({
      success: true,
      candidates: candidates.map((c) => ({
        id: c.id,
        candidateName: c.candidateName,
        candidateUrl: c.candidateUrl,
        candidateAddress: c.candidateAddress,
        sourceUrl: c.sourceUrl,
        placeId: c.entityId,
        place: c.entity,
        matchScore: c.matchScore,
        matchReason: c.matchReason,
        confidenceBucket: c.confidenceBucket,
        status: c.status,
        rejectionReason: c.rejectionReason,
        existingPrimaryOperator: c.entityId ? primaryByPlace[c.entityId] ?? null : null,
      })),
    });
  } catch (err) {
    console.error("[GET candidates]", err);
    return NextResponse.json(
      { error: "Failed to fetch candidates", message: (err as Error).message },
      { status: 500 }
    );
  }
}

function venuesFromSources(sources: unknown): { name: string; url?: string; address?: string; source_url: string; confidence: number }[] {
  const s = sources as { venues_found?: Array<{ name: string; url?: string; address?: string; source_url: string; confidence?: number }> } | null;
  if (!s?.venues_found || !Array.isArray(s.venues_found)) return [];
  return s.venues_found.map((v) => ({
    name: String(v?.name ?? ""),
    url: v?.url,
    address: v?.address,
    source_url: String(v?.source_url ?? ""),
    confidence: typeof v?.confidence === "number" ? v.confidence : 0.5,
  }));
}

function venueKey(v: { name: string; url?: string; address?: string }): string {
  return [v.name, v.url ?? "", v.address ?? ""].join("|");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ actorId: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { actorId } = await params;

    const actor = await db.actor.findUnique({
      where: { id: actorId, kind: "operator" },
      select: { id: true, website: true, sources: true },
    });
    if (!actor || !actor.website) {
      return NextResponse.json(
        { error: "Actor not found or has no website" },
        { status: 404 }
      );
    }

    const venues = venuesFromSources(actor.sources);
    if (venues.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No venues_found in Actor.sources; submit ingest-url first",
        candidates: [],
      });
    }

    const venueKeys = new Set(venues.map(venueKey));
    const existing = await db.operatorPlaceCandidate.findMany({
      where: { actorId },
      select: { id: true, candidateName: true, candidateUrl: true, candidateAddress: true, status: true },
    });

    for (const c of existing) {
      const k = venueKey({
        name: c.candidateName,
        url: c.candidateUrl ?? undefined,
        address: c.candidateAddress ?? undefined,
      });
      if (!venueKeys.has(k) && c.status === "PENDING") {
        await db.operatorPlaceCandidate.update({
          where: { id: c.id },
          data: { status: "STALE", updatedAt: new Date() },
        });
      }
    }

    const candidates = await upsertOperatorPlaceCandidates({
      actorId,
      venues,
      actorWebsite: actor.website,
    });

    await logPlaceJob({
      entityId: actorId,
      entityType: "actor",
      jobType: "OPERATOR_LINK",
      pagesFetched: 0,
      aiCalls: 0,
    });

    return NextResponse.json({ success: true, candidates });
  } catch (err) {
    console.error("[POST candidates]", err);
    return NextResponse.json(
      { error: "Failed to re-run matching", message: (err as Error).message },
      { status: 500 }
    );
  }
}
