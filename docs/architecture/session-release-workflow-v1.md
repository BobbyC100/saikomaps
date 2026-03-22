---
doc_id: SOP-SESSION-RELEASE-V1
doc_type: sop
status: active
owner: Bobby Ciccaglione
created: 2026-03-22
last_updated: 2026-03-22
project_id: SAIKO
systems:
  - deployment
  - knowledge-management
related_docs:
  - docs/RELEASE-RUNBOOK.md
---

# Session Release Workflow v1

Standard operating procedure for shipping work at the end of a Claude Code session.

## Trigger

End of a productive session where code, docs, or both were changed.

## Steps

### 1. Commit to branch

- Stage meaningful changes
- Exclude `data/logs/`, `.DS_Store`, and other artifacts
- Use descriptive commit messages
- Branch name should reflect the work (e.g., `coverage-source-enrichment`, `build-gate-v1`)

### 2. Documentation review

- If new architecture, contracts, or workflows were introduced, ensure a doc exists or was updated
- Update `docs/registry.json` if new docs were added (`npm run docs:registry`)
- Keep terminology consistent with existing docs

### 3. Entity stats snapshot

- Query DB for total entities, by-status breakdown, GPID coverage
- Quick pulse check on inventory (not required if session was docs-only)

### 4. Open PR with auto-merge

```bash
git push -u origin <branch-name>
gh pr create --title "<title>" --body "<description>" --auto
```

Or push and create PR in GitHub UI, then click "Enable auto-merge".

The PR triggers the **Build Gate** (lint changed files, typecheck, prisma generate, production build). If all checks pass, the PR auto-merges into `main`.

### 5. Vercel deploys production

Merge to `main` triggers Vercel auto-deploy to tracesla.com. No manual step needed.

### 6. Session summary

Brief recap of what was accomplished for the user.

## Build Gate checks

| Step | What it catches |
|------|-----------------|
| Install | Dependency issues, lockfile drift |
| Prisma generate | Schema/client mismatch |
| Lint (changed files) | Code quality issues in new/modified code |
| Typecheck | Type errors across the full codebase |
| Build | Build failures, missing modules, SSR issues |

## If the build gate fails

1. Read the CI error logs
2. Fix on the same branch
3. Push — CI re-runs automatically
4. Auto-merge proceeds once green

## If production breaks after merge

Follow the [Release Runbook](../RELEASE-RUNBOOK.md):

1. Rollback immediately (`vercel rollback <deploy-id>`)
2. Diagnose on a branch
3. Fix via normal PR flow

## What this replaces

Previously: push directly to `main` and hope Vercel builds successfully. This caused 10+ consecutive failed production deploys in March 2026.

Now: every change is validated before it reaches production. Auto-merge removes friction without removing safety.
