import { NextResponse } from "next/server";

function debugEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEBUG_ROUTES_ENABLED === "true";
}

export async function GET() {
  if (!debugEnabled()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;

  if (!key?.trim()) {
    return NextResponse.json(
      { ok: false, error: "KEY_MISSING", message: "GOOGLE_PLACES_API_KEY is not set" },
      { status: 500 }
    );
  }

  const placeId = "ChIJGU5p6ri7woARaCOqe4haSl0";

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "id,displayName",
      },
    }
  );

  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // ignore
  }

  const err = parsed?.error as { status?: string; message?: string } | undefined;
  const googleStatus = (err?.status ?? parsed?.status ?? null) as string | null;
  const googleMessage = (err?.message ?? null) as string | null;

  let errorCode: string | null = null;
  if (!res.ok) {
    if (res.status === 400 && (googleMessage?.toLowerCase().includes("api_key") || googleStatus === "INVALID_ARGUMENT")) {
      errorCode = "API_KEY_INVALID";
    } else if (res.status === 403 || googleStatus === "PERMISSION_DENIED") {
      errorCode = "PERMISSION_DENIED";
    }
  }

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    error: errorCode,
    googleStatus,
    googleMessage,
    response: text,
  });
}