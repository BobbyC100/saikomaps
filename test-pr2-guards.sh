#!/bin/bash
# test-pr2-guards.sh
# Tests centralized auth guards

echo "Testing Centralized Auth Guards..."

# Test 1: Auth guard files exist
echo -n "Test 1: Guard files exist... "
if [ -f "lib/auth/guards.ts" ] && [ -f "lib/auth/guards.edge.ts" ]; then
  echo "✓ PASS"
else
  echo "✗ FAIL (guard files not found)"
  exit 1
fi

# Test 2: Guards export required functions
echo -n "Test 2: Node guards export functions... "
if grep -q "export async function requireUserId" lib/auth/guards.ts && \
   grep -q "export async function requireAdmin" lib/auth/guards.ts && \
   grep -q "export function isAdminEmail" lib/auth/guards.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (missing exports)"
  exit 1
fi

# Test 3: Edge guards export required functions
echo -n "Test 3: Edge guards export functions... "
if grep -q "export async function getUserEmailEdge" lib/auth/guards.edge.ts && \
   grep -q "export function isAdminEmailEdge" lib/auth/guards.edge.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (missing edge exports)"
  exit 1
fi

# Test 4: Middleware uses centralized guards
echo -n "Test 4: Middleware imports edge guards... "
if grep -q "from '@/lib/auth/guards.edge'" middleware.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (middleware not using guards)"
  exit 1
fi

# Test 5: Old getAdminEmails function removed
echo -n "Test 5: Old getAdminEmails removed... "
if ! grep -q "function getAdminEmails" middleware.ts; then
  echo "✓ PASS"
else
  echo "✗ FAIL (old function still exists)"
  exit 1
fi

# Test 6: bcrypt removed from package.json
echo -n "Test 6: bcrypt dependency removed... "
if ! grep -q '"bcrypt"' package.json; then
  echo "✓ PASS"
else
  echo "✗ FAIL (bcrypt still in dependencies)"
  exit 1
fi

# Test 7: bcryptjs still present
echo -n "Test 7: bcryptjs dependency present... "
if grep -q '"bcryptjs"' package.json; then
  echo "✓ PASS"
else
  echo "✗ FAIL (bcryptjs missing)"
  exit 1
fi

# Test 8: NEXTAUTH_SECRET in .env.example
echo -n "Test 8: .env.example has NEXTAUTH_SECRET... "
if grep -q "NEXTAUTH_SECRET" .env.example; then
  echo "✓ PASS"
else
  echo "✗ FAIL (.env.example not updated)"
  exit 1
fi

echo ""
echo "✓ All auth guard tests passed!"
echo ""
echo "⚠ MANUAL CHECK REQUIRED:"
echo "  1. Verify NEXTAUTH_SECRET exists in .env.local"
echo "  2. Verify ADMIN_EMAILS configured in all environments"
echo "  3. Run 'npm install' to update dependencies"
