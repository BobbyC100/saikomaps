#!/bin/bash
# test-pr3-migration.sh
# Tests PR#3: Admin lock + import/process + AI gating

echo "Testing PR#3: Admin Routes + No Bypasses..."

# Test 1: import/process uses requireAdmin (ADMIN-ONLY)
echo -n "Test 1: import/process uses requireAdmin... "
if grep -q "requireAdmin" app/api/import/process/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (not using requireAdmin)"
  exit 1
fi

# Test 2: ai/generate-map-details uses requireAdmin (ADMIN-ONLY)
echo -n "Test 2: ai/generate-map-details uses requireAdmin... "
if grep -q "requireAdmin" app/api/ai/generate-map-details/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (not using requireAdmin)"
  exit 1
fi

# Test 3: import/add-to-list uses requireUserId (CREATOR)
echo -n "Test 3: import/add-to-list uses requireUserId... "
if grep -q "requireUserId" app/api/import/add-to-list/route.ts && ! grep -q "requireAdmin" app/api/import/add-to-list/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (should use requireUserId, not requireAdmin)"
  exit 1
fi

# Test 4: import/upload uses requireUserId (CREATOR)
echo -n "Test 4: import/upload uses requireUserId... "
if grep -q "requireUserId" app/api/import/upload/route.ts && ! grep -q "requireAdmin" app/api/import/upload/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (should use requireUserId, not requireAdmin)"
  exit 1
fi

# Test 5: import/preview uses requireUserId (CREATOR)
echo -n "Test 5: import/preview uses requireUserId... "
if grep -q "requireUserId" app/api/import/preview/route.ts && ! grep -q "requireAdmin" app/api/import/preview/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (should use requireUserId, not requireAdmin)"
  exit 1
fi

# Test 6: import/add-to-list removed TEMP bypass
echo -n "Test 6: import/add-to-list removed TEMP bypass... "
if ! grep -q "TEMP.*auth" app/api/import/add-to-list/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (TEMP bypass still exists)"
  exit 1
fi

# Test 7: import/add-to-list removed getUserId helper
echo -n "Test 7: import/add-to-list removed getUserId... "
if ! grep -q "function getUserId" app/api/import/add-to-list/route.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (getUserId helper still exists)"
  exit 1
fi

# Test 8: All routes import from centralized guards
echo -n "Test 8: All routes use centralized guards... "
MISSING=0
for file in app/api/import/process/route.ts app/api/ai/generate-map-details/route.ts app/api/import/add-to-list/route.ts app/api/import/upload/route.ts app/api/import/preview/route.ts; do
  if ! grep -q "from '@/lib/auth/guards'" "$file"; then
    echo ""
    echo "  ✗ $file missing guard import"
    MISSING=$((MISSING + 1))
  fi
done
if [ $MISSING -eq 0 ]; then
  echo "✓ PASS"
else
  exit 1
fi

# Test 9: No TEMP bypasses remain in codebase
echo -n "Test 9: No TEMP bypasses in API routes... "
TEMP_COUNT=$(grep -r "TEMP.*auth\|TEMP.*bypass\|TEMP.*disabled" app/api --include="*.ts" 2>/dev/null | wc -l)
if [ "$TEMP_COUNT" -eq 0 ]; then
  echo "✓ PASS"
else
  echo "✗ FAIL ($TEMP_COUNT TEMP bypasses found)"
  grep -r "TEMP.*auth\|TEMP.*bypass\|TEMP.*disabled" app/api --include="*.ts"
  exit 1
fi

echo ""
echo "✓ All PR#3 tests passed!"
echo ""
echo "⚠ MANUAL CHECK REQUIRED:"
echo "  Admin-only routes:"
echo "    - /api/import/process → 403 for non-admin"
echo "    - /api/ai/generate-map-details → 403 for non-admin"
echo "  Creator routes (any logged-in user):"
echo "    - /api/import/upload → 401 if not logged in"
echo "    - /api/import/preview → 401 if not logged in"
echo "    - /api/import/add-to-list → 401 if not logged in"
