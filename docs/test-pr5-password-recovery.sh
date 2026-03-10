#!/usr/bin/env bash
# test-pr5-password-recovery.sh
# Verifies password recovery endpoints exist and return expected status without leaking user existence.

set -e
BASE="${BASE_URL:-http://localhost:3000}"

echo "Testing PR#5: Password Recovery..."
echo "Base URL: $BASE"
echo ""

# Test 1: Forgot password returns 200 and { success: true } for any email (no leak)
echo "Test 1: POST /api/auth/forgot-password returns 200 and success: true..."
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com"}')
BODY=$(echo "$RES" | head -n -1)
CODE=$(echo "$RES" | tail -n 1)
if [ "$CODE" != "200" ]; then
  echo "  ✗ FAIL (expected 200, got $CODE)"
  exit 1
fi
if ! echo "$BODY" | grep -q '"success":true'; then
  echo "  ✗ FAIL (response must contain success: true)"
  echo "  Body: $BODY"
  exit 1
fi
echo "  ✓ PASS (200, success: true)"

# Test 2: Forgot password with invalid body still returns 200 (no leak)
echo "Test 2: POST /api/auth/forgot-password with invalid email still returns 200..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{}')
if [ "$CODE" != "200" ]; then
  echo "  ✗ FAIL (expected 200, got $CODE) - must not leak validation errors with different status"
  exit 1
fi
echo "  ✓ PASS (200)"

# Test 3: Reset password with invalid token returns 400 (not 200)
echo "Test 3: POST /api/auth/reset-password with invalid token returns 400..."
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid","newPassword":"NewPass123","confirmPassword":"NewPass123"}')
CODE=$(echo "$RES" | tail -n 1)
if [ "$CODE" != "400" ]; then
  echo "  ✗ FAIL (expected 400 for invalid token, got $CODE)"
  exit 1
fi
echo "  ✓ PASS (400 for invalid token)"

echo ""
echo "✓ All PR#5 password recovery tests passed!"
