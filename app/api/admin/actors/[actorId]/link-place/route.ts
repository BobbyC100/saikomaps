/**
 * POST /api/admin/actors/[actorId]/link-place
 * Admin-only. Link an existing actor to a venue via PlaceActorRelationship.
 *
 * Body: {
 *   entityId: string;
 *   role: ActorRole;
 *   isPrimary?: boolean;  // default true
 * }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

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

  const { actorId } = await params;
  const body = await request.json();
  const { entityId, role, isPrimary = true } = body;

  if (!entityId || !role) {
    return NextResponse.json(
      { error: "entityId and role are required" },
      { status: 400 }
    );
  }

  // Verify actor exists
  const actor = await db.actor.findUnique({
    where: { id: actorId },
    select: { id: true, name: true },
  });
  if (!actor) {
    return NextResponse.json({ error: "Actor not found" }, { status: 404 });
  }

  // Verify entity exists
  const entity = await db.entities.findUnique({
    where: { id: entityId },
    select: { id: true, name: true },
  });
  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  // If isPrimary, demote any existing primary for same role on this entity
  if (isPrimary) {
    const existingPrimary = await db.placeActorRelationship.findFirst({
      where: { entityId, role, isPrimary: true },
      select: { id: true, actorId: true },
    });

    if (existingPrimary && existingPrimary.actorId !== actorId) {
      await db.placeActorRelationship.update({
        where: { id: existingPrimary.id },
        data: { isPrimary: false, updatedAt: new Date() },
      });
    }
  }

  const relationship = await db.placeActorRelationship.upsert({
    where: {
      entityId_actorId_role: { entityId, actorId, role },
    },
    create: {
      entityId,
      actorId,
      role,
      isPrimary,
      confidence: 1.0,
      sources: {
        seed: "manual_entry",
        created_at: new Date().toISOString(),
        created_by: "admin",
      },
    },
    update: {
      isPrimary,
      confidence: 1.0,
      sources: {
        seed: "manual_entry",
        updated_at: new Date().toISOString(),
        updated_by: "admin",
      },
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    relationship: {
      id: relationship.id,
      entityId: relationship.entityId,
      actorId: relationship.actorId,
      role: relationship.role,
      isPrimary: relationship.isPrimary,
    },
    actor: { id: actor.id, name: actor.name },
    entity: { id: entity.id, name: entity.name },
  });
}
