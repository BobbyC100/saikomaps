#!/usr/bin/env bash
# Create the three PRs (auth-wrapup, visual-alignment-pass, password-recovery) into main.
# Requires: GITHUB_TOKEN with repo scope, or run `gh auth login` and we use gh.
# Usage: ./scripts/create-prs.sh   OR   GITHUB_TOKEN=xxx ./scripts/create-prs.sh

set -e
OWNER="BobbyC100"
REPO="saikomaps"
BASE="main"

if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  echo "Using gh CLI..."
  create_pr_gh() {
    local branch=$1
    local title=$2
    local body=$3
    gh pr create --base "$BASE" --head "$branch" --title "$title" --body "$body"
  }
  USE_GH=1
elif [ -n "$GITHUB_TOKEN" ]; then
  echo "Using GitHub API with GITHUB_TOKEN..."
  create_pr_api() {
    local branch=$1
    local title=$2
    local body=$3
    local body_escaped
    body_escaped=$(echo "$body" | jq -Rs .)
    curl -s -X POST \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/$OWNER/$REPO/pulls" \
      -d "{\"title\":$(echo "$title" | jq -Rs .),\"head\":\"$branch\",\"base\":\"$BASE\",\"body\":$body_escaped}"
  }
  USE_GH=0
else
  echo "ERROR: Need either 'gh' CLI (run: gh auth login) or GITHUB_TOKEN env set."
  exit 1
fi

# PR 1: chore/auth-wrapup
TITLE1="Auth hardening: coverage route, guards, admin gating, rate limit"
BODY1="## Purpose
- PR1: Coverage route migration (\`/admin/coverage\` → \`/coverage\` public, no TEMP bypass)
- PR2: Centralized auth guards (Node + Edge), \`requireUserId\` / \`requireAdmin\`, middleware
- PR3: Admin gating on import/process and AI generate-map-details; creator routes use \`requireUserId\`
- PR4: Rate limiting (Upstash) on AI endpoint with fail-safe

## Files touched
- \`.env.example\`, \`README.md\`
- \`app/admin/coverage/page.tsx\`, \`app/coverage/page.tsx\`
- API routes: ai, auth/signup, import/*, locations, map-places, maps/*
- \`components/layouts/GlobalHeader.tsx\`, \`lib/auth.ts\`, \`lib/auth/guards.ts\`, \`lib/auth/guards.edge.ts\`, \`lib/rate-limit.ts\`, \`middleware.ts\`
- \`package.json\`, \`package-lock.json\`
- \`test-pr1-coverage.sh\`, \`test-pr2-guards.sh\`, \`test-pr3-migration.sh\`, \`test-pr4-ratelimit.sh\`

## How to test
- Run \`bash test-pr1-coverage.sh\`, \`test-pr2-guards.sh\`, \`test-pr3-migration.sh\`, \`test-pr4-ratelimit.sh\`
- Ensure \`NEXTAUTH_SECRET\`, \`ADMIN_EMAILS\` in env; optionally Upstash for rate limit"

if [ "$USE_GH" = 1 ]; then
  create_pr_gh "chore/auth-wrapup" "$TITLE1" "$BODY1"
else
  create_pr_api "chore/auth-wrapup" "$TITLE1" "$BODY1"
fi
echo "Created PR 1: chore/auth-wrapup"

# PR 2: chore/visual-alignment-pass
TITLE2="Visual alignment pass: user-facing screens and modals"
BODY2="## Purpose
Restraint-only visual alignment to home page baseline. No redesign, no new tokens, no layout or logic changes.

## Files touched (7)
- \`app/(auth)/login/page.tsx\`, \`app/(auth)/signup/page.tsx\`
- \`app/(creator)/dashboard/page.tsx\`
- \`components/layouts/DashboardLayout.tsx\`, \`components/layouts/GlobalHeader.tsx\`
- \`components/AddLocationModal.tsx\`
- \`app/map/[slug]/components/EditLocationModal.tsx\`

## How to test
- Login / signup / dashboard: parchment/warm-white/charcoal, 12px radius, no decorative blocks
- Global header and Add Location modal use CSS variables only
- No new design tokens introduced"

if [ "$USE_GH" = 1 ]; then
  create_pr_gh "chore/visual-alignment-pass" "$TITLE2" "$BODY2"
else
  create_pr_api "chore/visual-alignment-pass" "$TITLE2" "$BODY2"
fi
echo "Created PR 2: chore/visual-alignment-pass"

# PR 3: feat/password-recovery
TITLE3="feat: minimal password recovery flow"
BODY3="## Purpose
Minimal password recovery for credentials auth: forgot-password (email) + reset-password (token from email). No OAuth, no magic links.

- **Forgot:** Always 200 + success; if user exists, create hashed token, send link via Resend
- **Reset:** Validate token (hashed in DB), one-time use, 60 min expiry; update password (bcryptjs)
- **Rate limit:** In-memory 5/hour per (IP+email) on forgot-password
- **Security:** No email enumeration; min 8 char password

## Files touched
- DB: \`prisma/schema.prisma\`, migration \`password_reset_tokens\`
- API: \`app/api/auth/forgot-password/route.ts\`, \`app/api/auth/reset-password/route.ts\`
- Lib: \`lib/forgot-password-rate-limit.ts\`, \`lib/password-reset-token.ts\`, \`lib/send-password-reset-email.ts\`
- Pages: \`app/(auth)/forgot-password/page.tsx\`, \`app/(auth)/reset-password/page.tsx\`; login link on \`app/(auth)/login/page.tsx\`
- \`lib/validations.ts\`, \`package.json\` (Resend), \`.env.example\`, \`README.md\`, \`test-pr5-password-recovery.sh\`

## How to test
- Set \`RESEND_API_KEY\` (optional for dev: still returns 200, no email sent)
- Run \`bash test-pr5-password-recovery.sh\` to verify no user leak and reset returns 400 for invalid token
- Manual: request reset from /forgot-password, use link, set new password, log in"

if [ "$USE_GH" = 1 ]; then
  create_pr_gh "feat/password-recovery" "$TITLE3" "$BODY3"
else
  create_pr_api "feat/password-recovery" "$TITLE3" "$BODY3"
fi
echo "Created PR 3: feat/password-recovery"

echo ""
echo "All 3 PRs created. Merge in order: 1 → 2 → 3 (auth-wrapup, then visual-alignment-pass, then password-recovery)."
