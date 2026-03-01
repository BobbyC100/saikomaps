/**
 * POST /api/admin/actors/candidates/[candidateId]/attach
 * body: { placeId: string } — manual attach when no match or wrong match
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { approveCandidateAndCreateRelationship } from "@/lib/actors/approveCandidate";
import { authOptions } from "@/lib/auth";

export async function POST(
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
    const placeId = typeof body?.placeId === "string" ? body.placeId.trim() : null;

    if (!placeId) {
      return NextResponse.json({ error: "placeId is required" }, { status: 400 });
    }

    const candidate = await db.operatorPlaceCandidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const place = await db.entities.findUnique({
      where: { id: placeId },
      select: { id: true },
    });
    if (!place) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const approvedBy = session?.user?.email ?? session?.user?.id ?? "admin";

    await approveCandidateAndCreateRelationship({
      candidate,
      placeId,
      approvedBy,
      confidence: 0.9,
    });

    return NextResponse.json({ success: true, status: "APPROVED" });
  } catch (err) {
    console.error("[POST attach]", err);
    return NextResponse.json(
      { error: "Failed to attach", message: (err as Error).message },
      { status: 500 }
    );
  }
}
