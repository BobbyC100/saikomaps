/**
 * GET /api/admin/places/search?q=...
 * Admin-only. Search places in DB by name or slug (for candidate attach).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  const places = await db.entities.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q.toLowerCase(), mode: "insensitive" } },
      ],
    },
    take: 10,
    select: {
      id: true,
      name: true,
      slug: true,
      entityType: true,
      address: true,
      neighborhood: true,
    },
  });

  return NextResponse.json({ places });
}
