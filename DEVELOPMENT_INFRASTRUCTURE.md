# Saiko Development Infrastructure Plan

**Status:** Proposal v2 — stress-tested, ready for implementation
**Date:** 2026-03-23
**Author:** Bobby C. + Claude

---

## Problem Statement

Saiko currently has no repeatable path from code change to verified production deployment. The symptoms:

1. Dev server is fragile — port conflicts, zombie processes, and stale `.next` caches mean localhost can't be trusted as a verification environment.
2. No branch strategy is enforced — feature branches exist but there's no gate between "code on a branch" and "code running in production."
3. No preview deployments — the only way to verify changes is on localhost, which is itself unreliable.
4. No CI beyond a partial build gate — GitHub Actions runs lint + typecheck + build on PRs, but doesn't validate schema, run tests, or connect to preview health.
5. No database safety by environment — no explicit rules for which DB previews hit, whether migrations can run, or what happens when environments bleed.
6. No rollback policy — if production breaks, there's no documented motion for recovery.

The result: code changes get written, committed, and pushed, but never verified in a browser — making it impossible to confidently ship.

---

## Current State

| Component | Status |
|---|---|
| **Git remote** | `origin` → `github.com/BobbyC100/saikomaps.git` |
| **Production branch** | `main` (auto-deploys to Vercel) |
| **Working branch** | `deployment-strategy-v1` (71 files changed, 2 commits ahead of `main`) |
| **Vercel project** | `saikomaps` (project ID: `prj_GwgbT5kk6ATwBLqRs5FYyZuDoS0e`) |
| **GitHub Actions** | `build-gate.yml` — lint, typecheck, build on PRs to `main` |
| **Dev server** | `scripts/dev.js` — custom wrapper with DB probes, then spawns `next dev` |
| **Node version** | 24 (per CI config) |
| **Framework** | Next.js 16.1.6, App Router, Sentry |
| **Database** | Neon (production), local Postgres (dev) |
| **ORM** | Prisma |

**What works:** Vercel auto-deploys `main` to production. GitHub Actions build gate catches type errors on PRs. Branch-based workflow partially in use.

**What's broken:** `dev.js` has a race condition (detects zombie processes as "LISTENING"), no process management or port cleanup, `.next/` cache persists across branch switches, no preview deployments surfaced on PRs, no env validation, no database isolation rules.

---

## Trust Model

This is the framing that governs everything below.

**Localhost is for iteration speed.** Use it when you need sub-second feedback during active development. Do not trust it as proof that code works.

**Preview is for verification.** A Vercel preview URL on a real branch is the primary way to confirm that changes render correctly, the app builds, and the deployment is healthy.

**CI is for enforcement.** The build gate is the automated quality floor. If CI fails, the PR cannot merge. Period.

**Production is protected.** `main` is always deployable. Nothing reaches `main` without passing CI and being verified on a preview URL.

---

## Layer 1 — Local Recovery

**Goal:** `npm run dev` is recoverable quickly when it breaks. It is not the primary verification environment.

### 1a. Port cleanup on start

Add to `dev.js` before spawning Next:

```javascript
async function killPort(port) {
  const { execSync } = require('node:child_process');
  try {
    const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
    if (result) {
      const pids = result.split('\n').filter(Boolean);
      for (const pid of pids) {
        try { execSync(`kill -9 ${pid}`); } catch (_) {}
      }
      console.log(`[dev.js] Killed stale process(es) on port ${port}: ${pids.join(', ')}`);
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (_) {
    // lsof returns non-zero if nothing found — fine
  }
}
```

Kill only the exact dev port (3000). Call `await killPort(DEV_PORT)` right before `runNextDev()`.

### 1b. Cache cleanup on branch switch

```bash
# .git/hooks/post-checkout (chmod +x)
#!/bin/sh
if [ "$3" = "1" ]; then  # branch switch only, not file checkout
  rm -rf .next
  echo "[post-checkout] Cleared .next cache"
fi
```

### 1c. Recovery scripts

```json
{
  "dev:reset": "npx kill-port 3000 && rm -rf .next && node ./scripts/dev.js",
  "dev:safe": "rm -rf .next && node ./scripts/dev.js"
}
```

`dev:reset` is the full recovery — kills port, clears cache, restarts. `dev:safe` is a clean start without the kill step. Neither is a panic button; both are controlled maintenance tools.

### 1d. Env sanity check on startup

Add to `dev.js` immediately after env loading, before DB probes:

```javascript
function validateEnv() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`[dev.js] Missing required env vars: ${missing.join(', ')}`);
    console.error('[dev.js] Copy .env.example to .env.local and fill in values.');
    process.exit(1);
  }
}
```

---

## Layer 2 — Preview-First Verification

**Goal:** Every PR gets a live preview URL. Preview is the primary verification step, not localhost.

### 2a. Enable Vercel preview deployments

Vercel creates preview deployments by default for non-production branches. Verify:

1. Vercel Dashboard → Project `saikomaps` → Settings → Git
2. Confirm "Preview Deployments" is enabled for all branches
3. If not connected: Settings → Git → Connect to GitHub → `BobbyC100/saikomaps`

Every push to a non-`main` branch gets a unique preview URL. These appear as GitHub PR checks.

### 2b. Preview environment variables

In Vercel Dashboard → Settings → Environment Variables, set required vars for the **Preview** environment:

- `DATABASE_URL` — Neon connection string (see Layer 2.5 for safety rules)
- API keys (Google Places, etc.)
- `SENTRY_DSN` — same as production or a separate preview DSN
- Any other secrets the app needs at build/runtime

### 2c. Preview health definition

A preview URL existing is **not** the same as "deploy verified." A PR is only preview-verified when:

1. The Vercel preview deployment succeeds (build completes, no deploy error)
2. The app loads at the preview URL (not a blank page or error screen)
3. At least one critical route renders — specifically, an entity page like `/place/buvons` loads with content

If the preview URL shows an error page or fails to build, the PR is not merge-ready regardless of CI status.

### 2d. Vercel CLI (optional, useful)

```bash
npm i -g vercel
vercel link
vercel env pull .env.local  # pulls env vars for local dev
```

Also enables `vercel dev` as a local dev server that matches production runtime more closely than `next dev`.

---

## Layer 2.5 — Environment & Data Safety

**Goal:** Preview deployments have validated env parity and safe database/service isolation. This is the layer most likely to bite you later if left unwritten.

### Database rules by environment

| Environment | Database | Migrations | Writes |
|---|---|---|---|
| **Local dev** | Local Postgres | Yes — run freely | Local only |
| **Preview (Vercel)** | Neon production (read-only) | **No** — never run migrations from preview | **No** — read-only, no write paths |
| **Production (Vercel)** | Neon production | Only via explicit deploy + migration step | Full access |

**Key rules:**

1. Preview deployments must NOT run Prisma migrations. If the build step includes `prisma migrate deploy`, gate it behind an environment check (`if (process.env.VERCEL_ENV === 'production')`). This is a hard rule, not a preference.
2. Previews use the production Neon database in read-only mode only. No write paths, no mutations, no background jobs that touch production data. When write features land (admin UI, user accounts), create a separate Neon branch database for previews.
3. No preview deployment should fire webhooks, trigger third-party callbacks, or write to production-integrated services (analytics, email, etc.). Gate all side effects behind `VERCEL_ENV === 'production'` checks.

### Environment validation as code

Maintain a canonical `.env.example` at the repo root listing every required variable:

```bash
# .env.example — canonical list of required env vars
# Copy to .env.local and fill in values

DATABASE_URL=           # Neon connection string (pooled)
DIRECT_URL=             # Neon direct connection (for migrations)
GOOGLE_PLACES_API_KEY=  # Google Places API
SENTRY_DSN=             # Sentry error tracking
# ... etc
```

The `dev.js` env sanity check (Layer 1d) validates against this. CI can also validate that required vars are present in the Vercel environment.

---

## Layer 3 — Protected Branching

**Goal:** Clear, enforceable rules for how code flows from change to production.

### The flow

```
feature branch → push → CI runs + preview deploys → PR to main → gates pass → merge → auto-deploy to production
```

### Branch rules

1. **`main` is production.** Always deployable. Never push directly.
2. **Feature branches for all work.** Naming: `feat/`, `fix/`, `chore/`, `refactor/`.
3. **PRs are the merge gate.** Every change goes through a PR to `main`.
4. **Squash merge preferred.** Keeps `main` history clean, each commit is one logical change. Trade-off: harder to bisect if PRs are large, so keep PRs small.

### Branch protection (GitHub settings)

Go to GitHub → Settings → Branches → Add rule for `main`:

- **Require a pull request before merging:** Yes
- **Require status checks to pass:** Yes — require `build-gate` job
- **Require branches to be up to date before merging:** Yes
- **Do not allow bypassing the above settings:** Yes
- **Dismiss stale approvals on new commits:** Yes (when reviews are added later)
- **Require PR reviews:** No (solo dev for now — add when team grows)
- **No direct pushes to `main`:** Enforced by the PR requirement above

Without branch protection, this workflow is a norm, not a control. Branch protection makes it enforceable.

---

## Layer 4 — CI as Production Proxy

**Goal:** The build gate mimics Vercel's production build path as closely as possible. If CI passes, production build should not fail.

### Build gate pipeline (updated `build-gate.yml`)

```yaml
name: Build Gate

on:
  pull_request:
    branches: [main]

jobs:
  build-gate:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    env:
      DATABASE_URL: "postgresql://placeholder:placeholder@localhost:5432/placeholder"

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Prisma schema validation
        run: npx prisma validate && node scripts/check-schema.js

      - name: Lint (changed files)
        run: |
          git fetch origin main --depth=1
          CHANGED=$(git diff --name-only origin/main...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' | head -100)
          if [ -n "$CHANGED" ]; then
            echo "$CHANGED" | xargs npx eslint --no-error-on-unmatched-pattern
          else
            echo "No JS/TS files changed, skipping lint"
          fi

      - name: Typecheck
        run: npm run typecheck

      - name: Tests
        run: npm test

      - name: Production build
        run: npm run build
```

**What changed from current:**

1. Added `npx prisma validate` + `node scripts/check-schema.js` — catches duplicate models, enums, conflicting `@@map` values, and schema drift before it reaches production
2. Added `npm test` — runs `check:place-page` + `vitest run`
3. Changed `npm install --ignore-scripts` to `npm ci` — deterministic installs from lockfile
4. Production build (`npm run build`) is the final and most valuable step — it runs `prisma generate && next build`, which catches both Prisma client sync issues AND the exact bundling/runtime failures that would break a Vercel deploy

**The single strongest rule:** CI must mimic Vercel's production build path. If CI passes, the Vercel deploy should not fail. `prisma validate` catches schema drift; production build catches everything else (bundling, client sync, env issues). Together they cover both categories of deploy failure.

---

## Layer 5 — Standardized Execution

**Goal:** The Cowork VM is a thin, reproducible execution node — not a magical machine.

### Cowork workflow

```
1. Claude makes code changes in VM (files change on disk immediately)
2. Claude runs `npx tsc --noEmit` in VM (typecheck passes)
3. Claude commits to feature branch and pushes
4. Vercel builds a preview URL automatically
5. Bobby checks preview URL to verify changes
6. If good → merge PR → auto-deploy to production
```

This bypasses localhost entirely for verification. The preview URL IS the verification step.

### Why this works

- No port conflicts, no stale cache, no "refresh the page" debugging
- Preview URL matches production behavior (same Vercel runtime, same Neon DB)
- Bobby can check from any device
- Same commands run locally, in VM, and in CI

### When localhost is still useful

- Rapid iteration on UI needing sub-second hot-reload feedback
- Debugging server-side behavior with breakpoints
- Working with local-only DB features

For these cases, use `npm run dev:reset`.

### VM reproducibility requirements

The VM should not become a snowflake. Requirements for any execution environment:

- Node version pinned via `.nvmrc`, matched to Vercel's production Node version exactly
- `npm ci` for deterministic installs (not `npm install`)
- `.env.example` documents every required var
- Same scripts run identically in VM, on local machine, and in CI
- No VM-specific setup that isn't codified in the repo

---

## Definition of Done for PRs

A PR is merge-ready when all of the following are true:

- [ ] Lint passes (CI)
- [ ] Typecheck passes (CI)
- [ ] Tests pass (CI)
- [ ] Production build passes (CI)
- [ ] Prisma schema validates (CI)
- [ ] Preview deployment succeeds (Vercel)
- [ ] App loads on preview URL (manual check)
- [ ] Feature verified by Bobby when user-facing
- [ ] Migration reviewed if schema changed
- [ ] No writes to production services from preview

---

## Rollback Policy

### If production breaks after a merge

1. **Immediate:** Revert the merge commit on `main` (or use Vercel's instant rollback to the previous deployment in the dashboard). Do this within minutes, not hours.
2. **Fix forward only when:** the blast radius is low, the fix is obvious, and you can ship it faster than reverting.
3. **Default posture:** revert first, investigate second.

### Vercel rollback mechanics

- Vercel Dashboard → Deployments → find the last healthy deployment → "Promote to Production"
- This is instant and doesn't require a code change
- After rollback, the broken commit is still on `main` — revert it in a follow-up PR

### Per-layer rollback

| Layer | Rollback |
|---|---|
| Dev server changes | Revert `dev.js` edits, remove git hook. `npm run dev:direct` always works. |
| Vercel previews | Additive — disabling changes nothing about production. |
| Branch protection | Disable in GitHub settings instantly. |
| CI additions | Remove steps from `build-gate.yml`. |
| Database migration | Depends on migration type — additive is safe, destructive requires manual recovery. |

---

## Implementation Order

| Step | What | Effort | Blocks |
|---|---|---|---|
| **1** | Verify Vercel preview deployments are working | 10 min | Nothing |
| **2** | Set env vars for Vercel Preview environment | 10 min | Step 1 |
| **3** | Set branch protection rules on `main` in GitHub | 5 min | Nothing |
| **4** | Create `.env.example` at repo root | 10 min | Nothing |
| **5** | Fix `dev.js`: add port cleanup + env validation | 15 min | Nothing |
| **6** | Add `dev:reset` and `dev:safe` to package.json | 2 min | Nothing |
| **7** | Add `post-checkout` git hook | 5 min | Nothing |
| **8** | Update `build-gate.yml` with full pipeline | 15 min | Nothing |
| **9** | Add migration safety gate (env check in build) | 10 min | Nothing |
| **10** | Open PR for `deployment-strategy-v1` → `main` | 5 min | Steps 1-3 |
| **11** | Verify preview URL for the PR | 5 min | Step 10 |
| **12** | Merge and verify production deploy | 5 min | Step 11 |

Steps 1-9 can be done in parallel. Critical path (Steps 1-3, then 10-12): ~30 minutes.

---

## Locked Decisions

These were open questions; now resolved after stress testing.

1. **Preview database isolation:** Use production Neon DB in read-only mode. No migrations, no write paths from previews. Add `prisma validate` + migration safety gate to CI immediately. Defer branch databases until write features (admin UI, user accounts) land.

2. **`deployment-strategy-v1` branch:** Merge as one PR. The changes are cohesive and tested together; splitting introduces merge conflict risk. Require CI pass + verified preview deploy before squash merge.

3. **`.nvmrc` for Node version pinning:** Add now. Set to match Vercel's production Node version exactly — not assumed, verified. This eliminates environment drift between local, VM, CI, and Vercel.

4. **Vercel CLI local install:** Defer. Preview deployments are the source of truth for verification. Local emulation via `vercel dev` is not needed right now.
