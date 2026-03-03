function debugEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.DEBUG_ROUTES_ENABLED === 'true';
}

export async function GET() {
  if (!debugEnabled()) {
    return new Response('Not Found', { status: 404 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY ?? '';
  return Response.json({
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_PLACES_API_KEY_hasKey: !!key?.trim(),
    GOOGLE_PLACES_API_KEY_length: key?.length ?? 0,
    GOOGLE_PLACES_API_KEY_prefix: key?.length >= 6 ? key.slice(0, 6) : null,
  });
}
