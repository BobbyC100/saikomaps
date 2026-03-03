import { NextResponse } from "next/server";

function debugEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEBUG_ROUTES_ENABLED === "true";
}

export async function GET() {
  if (!debugEnabled()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  const keyStr = typeof key === "string" ? key.trim() : "";

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasKey: !!keyStr,
    keyLen: keyStr.length,
    keyPrefix: keyStr.length >= 6 ? keyStr.slice(0, 6) : null,
    keySuffix: keyStr.length >= 4 ? keyStr.slice(-4) : null,
    enabledFlags: {
      GOOGLE_PLACES_ENABLED: process.env.GOOGLE_PLACES_ENABLED === "true",
    },
  });
}
