#!/usr/bin/env bash
# Pre-deploy gate — run before every deploy.
# All checks must pass. If any fail, do not deploy.
set -euo pipefail

echo "═══════════════════════════════════════"
echo "  Saiko Pre-Deploy Gate"
echo "═══════════════════════════════════════"
echo ""

FAIL=0

# 1. Schema check (duplicate models, enums, @@map conflicts)
echo "► Schema check..."
if node scripts/check-schema.js; then
  echo "  ✓ Schema clean"
else
  echo "  ✗ Schema check FAILED"
  FAIL=1
fi
echo ""

# 2. Type check
echo "► Type check..."
if npx tsc --noEmit 2>&1 | grep -v "node_modules/" | grep -q "error TS"; then
  echo "  ✗ Type errors found"
  npx tsc --noEmit 2>&1 | grep -v "node_modules/" | grep "error TS" | head -5
  FAIL=1
else
  echo "  ✓ No type errors"
fi
echo ""

# 3. Contract tests
echo "► Contract tests..."
if npx vitest run tests/contracts/ --reporter=dot 2>&1 | grep -q "Tests.*failed"; then
  echo "  ✗ Contract tests FAILED"
  FAIL=1
else
  echo "  ✓ Contract tests pass"
fi
echo ""

# 4. Build
echo "► Production build..."
if npx next build > /dev/null 2>&1; then
  echo "  ✓ Build succeeds"
else
  echo "  ✗ Build FAILED"
  FAIL=1
fi
echo ""

# Verdict
echo "═══════════════════════════════════════"
if [ $FAIL -eq 0 ]; then
  echo "  ✓ ALL CHECKS PASSED — safe to deploy"
  echo "═══════════════════════════════════════"
  exit 0
else
  echo "  ✗ DEPLOY BLOCKED — fix failures above"
  echo "═══════════════════════════════════════"
  exit 1
fi
