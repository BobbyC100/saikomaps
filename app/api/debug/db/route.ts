import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Dev-only: never available in production. */
function devOnly(): boolean {
  return process.env.NODE_ENV === "development";
}

function classifyDb(url: string): string {
  try {
    const match = url.match(/@([^/]+)\//);
    const host = (match ? match[1].split(":")[0] : "").toLowerCase();
    if (host.includes("neon.tech")) return "NEON";
    if (host === "localhost" || host === "127.0.0.1") return "LOCAL";
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function parseDbUrl(url: string): { host: string; database: string } {
  try {
    const atMatch = url.match(/@([^/]+)\//);
    const host = atMatch ? atMatch[1].split(":")[0] : "?";
    const pathMatch = url.match(/@[^/]+\/([^?]+)/);
    const database = pathMatch ? pathMatch[1] : "?";
    return { host, database };
  } catch {
    return { host: "?", database: "?" };
  }
}

export async function GET() {
  if (!devOnly()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const rawUrl = process.env.DATABASE_URL ?? "";
  const classification = classifyDb(rawUrl);
  const { host, database } = parseDbUrl(rawUrl);

  let placesCount: number;
  try {
    const result = await db.places.count();
    placesCount = result;
  } catch {
    placesCount = -1;
  }

  return NextResponse.json({
    classification,
    host,
    database,
    places_count: placesCount,
  });
}
