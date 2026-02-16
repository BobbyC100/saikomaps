import { NextResponse } from "next/server";

function debugEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.DEBUG_ROUTES_ENABLED === 'true';
}

export async function GET() {
  if (!debugEnabled()) {
    return new Response('Not Found', { status: 404 });
  }

  return NextResponse.json({
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME ?? null,
    R2_ENDPOINT: process.env.R2_ENDPOINT ?? null,
    hasAccessKey: Boolean(process.env.R2_ACCESS_KEY_ID),
    hasSecretKey: Boolean(process.env.R2_SECRET_ACCESS_KEY),
  });
}
