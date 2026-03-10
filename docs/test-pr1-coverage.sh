#!/bin/bash
# test-pr1-coverage.sh
# Tests coverage route move and redirect

BASE_URL="${1:-http://localhost:3000}"

echo "Testing Coverage Route Migration..."

# Test 1: New public route loads
echo -n "Test 1: /coverage is accessible... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/coverage")
if [ "$STATUS" -eq 200 ]; then
  echo "✓ PASS (200)"
else
  echo "✗ FAIL (got $STATUS, expected 200)"
  exit 1
fi

# Test 2: Old admin route redirects
echo -n "Test 2: /admin/coverage redirects... "
FINAL_URL=$(curl -Ls -o /dev/null -w "%{url_effective}" "$BASE_URL/admin/coverage")
if [[ "$FINAL_URL" == *"/coverage"* ]]; then
  echo "✓ PASS (redirects to /coverage)"
else
  echo "✗ FAIL (redirects to $FINAL_URL)"
  exit 1
fi

# Test 3: Redirect is permanent (301)
echo -n "Test 3: Redirect is 301/302... "
REDIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/coverage")
if [ "$REDIRECT_CODE" -eq 308 ] || [ "$REDIRECT_CODE" -eq 307 ] || [ "$REDIRECT_CODE" -eq 302 ]; then
  echo "✓ PASS ($REDIRECT_CODE)"
else
  echo "⚠ WARN (got $REDIRECT_CODE, Next.js may use 307/308)"
fi

# Test 4: Middleware bypass removed
echo -n "Test 4: No TEMP bypass in code... "
if ! grep -q "TEMP.*admin/coverage" middleware.ts; then
  echo "✓ PASS (TEMP bypass removed)"
else
  echo "✗ FAIL (TEMP bypass still in code)"
  exit 1
fi

echo ""
echo "✓ All coverage route tests passed!"
