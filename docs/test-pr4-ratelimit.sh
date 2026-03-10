#!/bin/bash
# test-pr4-ratelimit.sh
# Tests PR#4: Upstash rate limiting implementation

echo "Testing PR#4: Rate Limiting with Upstash..."

# Test 1: Rate limit library exists
echo -n "Test 1: Rate limit library exists... "
if [ -f "lib/rate-limit.ts" ]; then
  echo "✓ PASS"
else
  echo "✗ FAIL (lib/rate-limit.ts not found)"
  exit 1
fi

# Test 2: Rate limit exports required functions
echo -n "Test 2: Rate limit exports rateLimit function... "
if grep -q "export async function rateLimit" lib/rate-limit.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (rateLimit function not exported)"
  exit 1
fi

# Test 3: Rate limit presets exist
echo -n "Test 3: Rate limit presets defined... "
if grep -q "RateLimitPresets" lib/rate-limit.ts && \
   grep -q "AI_GENERATION" lib/rate-limit.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (RateLimitPresets not properly defined)"
  exit 1
fi

# Test 4: AI endpoint imports rate limit
echo -n "Test 4: AI endpoint imports rate limit... "
if grep -q "from '@/lib/rate-limit'" app/api/ai/generate-map-details/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (AI endpoint doesn't import rate-limit)"
  exit 1
fi

# Test 5: AI endpoint uses rate limit
echo -n "Test 5: AI endpoint calls rateLimit()... "
if grep -q "await rateLimit" app/api/ai/generate-map-details/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (AI endpoint doesn't call rateLimit)"
  exit 1
fi

# Test 6: AI endpoint returns 429 on rate limit
echo -n "Test 6: AI endpoint returns 429... "
if grep -q "status: 429" app/api/ai/generate-map-details/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (AI endpoint doesn't return 429)"
  exit 1
fi

# Test 7: Rate limit headers returned
echo -n "Test 7: Rate limit headers present... "
if grep -q "X-RateLimit-Limit" app/api/ai/generate-map-details/route.ts && \
   grep -q "X-RateLimit-Remaining" app/api/ai/generate-map-details/route.ts && \
   grep -q "X-RateLimit-Reset" app/api/ai/generate-map-details/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (Rate limit headers missing)"
  exit 1
fi

# Test 8: Upstash packages installed
echo -n "Test 8: Upstash packages in package.json... "
if grep -q '"@upstash/redis"' package.json && \
   grep -q '"@upstash/ratelimit"' package.json; then
  echo "✓ PASS"
else
  echo "✗ FAIL (Upstash packages not installed)"
  exit 1
fi

# Test 9: Env vars documented in .env.example
echo -n "Test 9: Upstash env vars in .env.example... "
if grep -q "UPSTASH_REDIS_REST_URL" .env.example && \
   grep -q "UPSTASH_REDIS_REST_TOKEN" .env.example; then
  echo "✓ PASS"
else
  echo "✗ FAIL (Upstash env vars not in .env.example)"
  exit 1
fi

# Test 10: Fail-safe behavior in production
echo -n "Test 10: Production fail-safe behavior... "
if grep -q "NODE_ENV === 'production'" lib/rate-limit.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (No production fail-safe handling)"
  exit 1
fi

echo ""
echo "✓ All PR#4 tests passed!"
echo ""
echo "⚠ MANUAL CHECK REQUIRED:"
echo "  1. Set up Upstash Redis account at https://console.upstash.com/"
echo "  2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local"
echo "  3. Test rate limiting:"
echo "     - Make 10 requests to /api/ai/generate-map-details → should succeed"
echo "     - 11th request → should return 429 with rate limit headers"
echo "     - Headers present: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset"
echo "     - Wait 1 hour → rate limit should reset"
echo "  4. Test without Upstash env vars:"
echo "     - Development: should warn but allow request"
echo "     - Production: should fail closed with clear error"
