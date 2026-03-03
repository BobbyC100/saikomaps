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
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=place_id,name&key=${key}`;

  console.log("[debug/google-places-legacy] request:", { url: url.replace(key, "REDACTED") });

  try {
    const res = await fetch(url);
    const json = (await res.json()) as { status?: string; error_message?: string };

    console.log("[debug/google-places-legacy] response:", { status: res.status, statusText: res.statusText, json });

    let errorCode: string | null = null;
    if (json.status === "REQUEST_DENIED" && json.error_message?.toLowerCase().includes("api key")) {
      errorCode = "API_KEY_INVALID";
    } else if (json.status === "REQUEST_DENIED") {
      errorCode = "PERMISSION_DENIED";
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      error: errorCode,
      googleStatus: json.status,
      googleMessage: json.error_message,
      response: json,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[debug/google-places-legacy] fetch failed:", msg);
    return NextResponse.json({
      ok: false,
      status: null,
      error: msg,
      response: null,
    }, { status: 502 });
  }
}
