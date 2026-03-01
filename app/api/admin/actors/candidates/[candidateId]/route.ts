/**
 * PATCH /api/admin/actors/candidates/[candidateId]
 * body: { action: "approve" | "reject", placeId?: string, rejectionReason?: string }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { approveCandidateAndCreateRelationship } from "@/lib/actors/approveCandidate";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { candidateId } = await params;
    const body = await request.json();
    const action = body?.action as string | undefined;
    const placeId = typeof body?.placeId === "string" ? body.placeId.trim() : undefined;
    const rejectionReason =
      typeof body?.rejectionReason === "string" ? body.rejectionReason.trim() : undefined;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be approve or reject" },
        { status: 400 }
      );
    }

    const candidate = await db.operatorPlaceCandidate.findUnique({
      where: { id: candidateId },
      include: { actor: { select: { id: true } } },
    });
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    if (action === "reject") {
      const session = await getServerSession(authOptions);
      const approvedBy = session?.user?.email ?? session?.user?.id ?? "admin";
      await db.operatorPlaceCandidate.update({
        where: { id: candidateId },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason ?? null,
          reviewedAt: new Date(),
          approvedBy,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    const resolvedPlaceId = candidate.entityId ?? placeId;
    if (!resolvedPlaceId) {
      return NextResponse.json(
        { error: "placeId required when candidate has no suggested place" },
        { status: 400 }
      );
    }

    const place = await db.entities.findUnique({
      where: { id: resolvedPlaceId },
      select: { id: true },
    });
    if (!place) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const approvedBy = session?.user?.email ?? session?.user?.id ?? "admin";

    await approveCandidateAndCreateRelationship({
      candidate,
      entityId: resolvedPlaceId,
      approvedBy,
      confidence: candidate.matchScore,
    });

    return NextResponse.json({ success: true, status: "APPROVED" });
  } catch (err) {
    console.error("[PATCH candidate]", err);
    return NextResponse.json(
      { error: "Failed to update candidate", message: (err as Error).message },
      { status: 500 }
    );
  }
}
