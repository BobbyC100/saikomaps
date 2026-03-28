# Deployment Runbook (Fast, Cheap, Safe)

This app deploys with:
- Web app: Vercel
- Database: Neon (managed Postgres)
- CI gate: GitHub Actions (`Build Gate`)

This is the default path for lowest ops overhead and fast rollback.

## 1) One-time setup

### 1.1 Repository hygiene
- Keep deployable code in this repository only.
- Keep secrets out of git (`.env.local`, `.env.production` are ignored).

### 1.2 Vercel project
- Create a Vercel project from this GitHub repo.
- Framework preset: Next.js.
- Root directory: repository root.

### 1.3 Neon databases
- Create two Neon databases (or branches):
  - `saiko_maps_staging`
  - `saiko_maps_prod`
- Copy connection strings for each.

### 1.4 Vercel environment variables
Set env vars separately for each Vercel environment:
- `Preview` -> staging DB
- `Production` -> prod DB

Minimum required vars are in `.env.example`.

Recommended mapping:
- `DATABASE_URL` -> Neon pooled URL
- `DIRECT_URL` -> Neon direct URL (if running migrations)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (`https://<your-prod-domain>` in production)
- `GOOGLE_PLACES_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `ANTHROPIC_API_KEY` (only if extraction/enrichment is used)

## 2) Branch and release policy

- `main` is production.
- All work lands via PR.
- Require `Build Gate` to pass before merge.
- Disable direct pushes to `main` (set in GitHub branch protection).

## 3) Deploy flow (daily)

1. Open PR.
2. Confirm `Build Gate` passes.
3. Validate Vercel Preview URL.
4. Merge PR to `main`.
5. Verify Vercel Production deployment health.

## 4) Database safety policy

Before schema or bulk data changes:
- Confirm target DB (`staging` vs `prod`) explicitly.
- Take Neon backup/snapshot.
- Run changes in staging first.
- Promote only after successful smoke test.

For scripts that write data, prefer explicit wrappers:
- local: `./scripts/db-local.sh ...`
- neon: `./scripts/db-neon.sh ...`

## 5) Data pipeline operations

Do not run heavy enrichment on every app deploy.
Run ingestion/enrichment as separate jobs:
- manual operator run
- or scheduled workflow/cron after app deployment

This isolates app availability from long-running data writes.

## 6) Smoke checks after production deploy

- Open home page and a known place page.
- Run auth login flow.
- Verify one API endpoint responds.
- Confirm DB writes for one safe test action.
- Check server logs for runtime errors.

## 7) Rollback (fast path)

If deploy is bad:
1. In Vercel, redeploy the previous successful deployment.
2. If bad data writes were applied, restore Neon backup/branch.
3. Re-open a fix PR; do not patch production manually.

## 8) First production checklist

- [ ] GitHub branch protection on `main`
- [ ] Vercel project connected
- [ ] Staging and prod Neon DBs configured
- [ ] Env vars set for Preview and Production
- [ ] `Build Gate` passing on PR
- [ ] Rollback tested once in staging
