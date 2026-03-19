/**
 * POST /api/admin/actors/create-person
 * Admin-only. Create a person actor (chef, sommelier, etc.) and optionally link to a venue.
 *
 * Body: {
 *   name: string;
 *   role: 'chef' | 'sommelier' | 'pastry_chef' | 'beverage_director' | 'wine_director';
 *   entityId?: string;     // optional: link to venue immediately
 *   isPrimary?: boolean;   // default true
 *   website?: string;
 *   description?: string;
 * }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { resolveUniqueActorSlug } from "@/lib/utils/actorSlug";

const PERSON_ROLES = new Set([
  "chef",
  "sommelier",
  "pastry_chef",
  "beverage_director",
  "wine_director",
]);

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, role, entityId, isPrimary = true, website, description } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!role || !PERSON_ROLES.has(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${[...PERSON_ROLES].join(", ")}` },
      { status: 400 }
    );
  }

  const slug = await resolveUniqueActorSlug(name.trim());

  const actor = await db.actor.create({
    data: {
      name: name.trim(),
      kind: "person",
      slug,
      website: website?.trim() || null,
      description: description?.trim() || null,
      visibility: "INTERNAL",
      confidence: 1.0, // manual entry = high confidence
      sources: {
        seed: "manual_entry",
        created_at: new Date().toISOString(),
        created_by: "admin",
      },
    },
  });

  let relationship = null;

  if (entityId) {
    // Verify entity exists
    const entity = await db.entities.findUnique({
      where: { id: entityId },
      select: { id: true, name: true },
    });

    if (!entity) {
      return NextResponse.json(
        { error: "Entity not found", actorCreated: true, actor },
        { status: 404 }
      );
    }

    // If isPrimary, demote any existing primary for same role on this entity
    if (isPrimary) {
      const existingPrimary = await db.placeActorRelationship.findFirst({
        where: { entityId, role, isPrimary: true },
        select: { id: true, actorId: true },
      });

      if (existingPrimary && existingPrimary.actorId !== actor.id) {
        await db.placeActorRelationship.update({
          where: { id: existingPrimary.id },
          data: { isPrimary: false, updatedAt: new Date() },
        });
      }
    }

    relationship = await db.placeActorRelationship.create({
      data: {
        entityId,
        actorId: actor.id,
        role,
        isPrimary,
        confidence: 1.0,
        sources: {
          seed: "manual_entry",
          created_at: new Date().toISOString(),
          created_by: "admin",
        },
      },
    });
  }

  return NextResponse.json({
    success: true,
    actor: {
      id: actor.id,
      name: actor.name,
      kind: actor.kind,
      slug: actor.slug,
      website: actor.website,
      description: actor.description,
    },
    relationship: relationship
      ? {
          id: relationship.id,
          entityId: relationship.entityId,
          role: relationship.role,
          isPrimary: relationship.isPrimary,
        }
      : null,
  });
}
