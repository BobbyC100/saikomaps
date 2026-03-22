---
doc_id: SOP-CHEATSHEET-V1
doc_type: sop
status: active
owner: Bobby Ciccaglione
created: 2026-03-22
last_updated: 2026-03-22
project_id: SAIKO
systems:
  - deployment
  - data-pipeline
related_docs:
  - docs/architecture/session-release-workflow-v1.md
  - docs/RELEASE-RUNBOOK.md
---

# Saiko Operations Cheatsheet

## Session Lifecycle

| Say this | What happens |
|----------|-------------|
| _(just start talking)_ | New session — tell me what you're working on |
| "check your memory" | I'll review what we've been working on across sessions |
| "boot down" / "wrap up" | Commit, docs review, PR with auto-merge, entity stats, summary |

## Local Dev

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start local dev server (port 3000) |
| `npm run dev:clean` | Nuke `.next` cache and restart (fixes stale builds) |
| `npm run dev:neon` | Dev server pointing at Neon (production DB) |
| `npm run dev:local` | Dev server pointing at local Postgres |
| `npm run build` | Production build (same as what CI runs) |
| `npm run typecheck` | Type check without building |
| `npm run lint` | Lint the codebase |
| `npm run test` | Run tests |

## Database

| Command | What it does |
|---------|-------------|
| `npm run db:whoami` | Show which database you're connected to |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:push` | Push schema changes to DB (no migration) |
| `npm run sync:db` | Sync DB state |

## Enrichment Pipeline

| Command | What it does |
|---------|-------------|
| `npm run enrich:place -- --slug=<slug>` | Full 7-stage enrichment for one entity |
| `npm run enrich:place -- --slug=<slug> --dry-run` | Preview what would happen |
| `npm run enrich:place -- --slug=<slug> --from=3` | Resume from stage 3 |
| `npm run enrich:place -- --slug=<slug> --only=5` | Run only stage 5 |

## Coverage Pipeline

| Command | What it does |
|---------|-------------|
| `npx tsx scripts/discover-coverage-sources.ts` | Find new coverage articles |
| `npx tsx scripts/fetch-coverage-sources.ts` | Fetch discovered articles |
| `npx tsx scripts/extract-coverage-sources.ts` | Extract entity mentions from articles |
| Add `--sources=resy_editorial,food_gps` | Limit to specific sources |
| Add `--dry-run` | Preview without writing |

## Docs & Knowledge Base

| Command | What it does |
|---------|-------------|
| `npm run docs:registry` | Rebuild docs/registry.json from frontmatter |
| `npm run docs:sync` | Sync docs to Google Drive |
| `npm run docs:context` | Generate context file for LLM handoffs |

## Git & Deploy

| Command | What it does |
|---------|-------------|
| `git checkout -b <name>` | Start a new branch |
| `git push -u origin <name>` | Push branch to GitHub |
| Open PR + enable auto-merge | CI runs → auto-merges → Vercel deploys |
| `vercel rollback <deploy-id>` | Instant rollback if production breaks |

## Emergency

| Situation | Do this |
|-----------|---------|
| Production is broken | `vercel rollback <deploy-id>` — rollback first, diagnose second |
| Local dev won't start | `npm run dev:clean` |
| DB connection issues | `npm run db:whoami` to check which DB you're hitting |
| Build fails locally | `npm run typecheck` to isolate type errors |
| Stale git lock | `rm .git/index.lock` |
