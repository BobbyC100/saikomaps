---
doc_id: OPS-RELEASE-RUNBOOK-V1
doc_type: operations
status: active
title: "Saiko Release Runbook v1"
owner: Bobby Ciccaglione
created: "2026-03-01"
last_updated: "2026-03-22"
project_id: SAIKO
systems:
  - deployment
  - ci-cd
related_docs: []
summary: >
  Release runbook covering the deploy flow (branch → PR → build gate → preview →
  merge → production), branch protection rules, incident response / rollback
  procedures, database migration rules, and build gate checks.
---

# Saiko Release Runbook v1

## Release Flow

```
local dev → push branch → open PR → build gate passes → preview deploy → merge → production
```

### Step by step

1. **Work on a branch** — never push directly to `main`
2. **Open a PR** against `main`
3. **Build gate runs automatically** — lint, typecheck, Prisma generate, production build
4. **Preview deploy** — Vercel creates a preview URL on every PR push. Click through it.
5. **Merge when green** — both build gate and preview look good
6. **Production deploys** — Vercel auto-deploys `main` to tracesla.com

## Branch Protection (set up in GitHub)

Go to **Settings → Branches → Add rule** for `main`:
- Require status checks to pass: `build-gate`
- Require branches to be up to date before merging: yes
- Do not allow bypassing the above settings

## Incident Response: Rollback First

If production is broken:

1. **Confirm the issue** — check tracesla.com, Vercel dashboard, Sentry
2. **Rollback immediately** — don't fix forward as the first move
   ```bash
   # List recent production deploys
   vercel ls saikomaps --prod

   # Rollback to last known good deploy
   vercel rollback <deployment-id>
   ```
   Or use the Vercel dashboard: Deployments → find last good deploy → Promote to Production
3. **Open an incident note** — what broke, when, who noticed
4. **Fix on a branch** — normal PR flow, build gate, preview
5. **Merge the fix** — production redeploys

## Database Migration Rules

App rollback is instant. DB rollback is not. Keep them decoupled.

1. **Additive migrations first** — add columns/tables, don't remove or rename
2. **Deploy code that works with old AND new schema** — so rollback is safe
3. **Backfill data** if needed
4. **Only later** remove old columns/paths in a separate deploy

Never ship a breaking schema change and new app code in the same deploy.

## What the Build Gate Checks

| Step | Command | What it catches |
|------|---------|-----------------|
| Install | `npm ci` | Dependency issues, lockfile drift |
| Prisma generate | `npx prisma generate` | Schema/client mismatch |
| Lint | `npm run lint` | Code quality, import issues |
| Typecheck | `npm run typecheck` | Type errors across the codebase |
| Build | `npm run build` | Build failures, missing modules, SSR issues |

## Costs

- GitHub Actions: uses free included minutes (~2-3 min per build)
- Vercel preview deploys: included in your plan
- No additional services required
