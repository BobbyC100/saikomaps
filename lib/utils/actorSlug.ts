/**
 * Deterministic actor slug generation with collision handling.
 * Slugifies operator name; if slug exists for another Actor, appends -2, -3, etc.
 */

import slugify from "slugify";
import { db } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";

/**
 * Generate base slug from operator name.
 */
export function slugifyOperatorName(name: string): string {
  const base = slugify(name, { lower: true, strict: true });
  return base || "operator";
}

/**
 * Resolve a unique slug for an Actor, handling collisions.
 * If excludeActorId is provided (upsert case), that actor's current slug is not treated as a collision.
 * @param client - Optional Prisma client (use when db from static import is undefined in runtime)
 */
export async function resolveUniqueActorSlug(
  operatorName: string,
  excludeActorId?: string,
  client?: PrismaClient
): Promise<string> {
  const prisma = client ?? db;
  const actorDelegate = prisma?.actor;
  if (!actorDelegate?.findFirst) {
    throw new Error("Prisma client not initialized: actor delegate missing");
  }
  const base = slugifyOperatorName(operatorName);

  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await actorDelegate.findFirst({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;
    if (existing.id === excludeActorId) return candidate;

    candidate = `${base}-${counter}`;
    counter++;
  }
}
