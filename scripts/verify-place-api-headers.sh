#!/usr/bin/env bash
# Verify /api/places/[slug] response headers for build ID, env, and caching.
# Usage: ./scripts/verify-place-api-headers.sh [BASE_URL] [SLUG]
# Example: ./scripts/verify-place-api-headers.sh http://localhost:3000 seco
# Example: ./scripts/verify-place-api-headers.sh https://staging.saikomaps.com seco

BASE_URL="${1:-http://localhost:3000}"
SLUG="${2:-seco}"
URL="${BASE_URL}/api/places/${SLUG}"

echo "=== Place API Headers ==="
echo "URL: $URL"
echo ""
curl -sI "$URL" | grep -iE "x-build-id|x-env|x-server-time|x-cache-bypass|cache-control|pragma|expires|age|x-vercel-cache|x-nextjs-cache|content-type" || echo "(no matching headers found)"
echo ""
echo "=== Summary ==="
BUILD=$(curl -sI "$URL" | grep -i "x-build-id" | cut -d: -f2- | tr -d '\r\n ')
ENV=$(curl -sI "$URL" | grep -i "x-env" | cut -d: -f2- | tr -d '\r\n ')
echo "X-Build-Id: ${BUILD:-<(missing)>}"
echo "X-Env: ${ENV:-<(missing)>}"
