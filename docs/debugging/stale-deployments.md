# Debugging Stale Deployments & Local Updates

When `/place/[slug]` or the API doesn't reflect recent code changes, use this playbook.

---

## Quick Diagnostics

### 1. Verify Which Build Answered

**DevTools (browser):**
1. Open `/place/[slug]` (e.g. `/place/seco`)
2. DevTools → **Network** tab
3. Find the `places/[slug]` request
4. Click it → **Response Headers**

**Look for:**
- `X-Build-Id` — commit SHA (Vercel) or timestamp (local)
- `X-Env` — `development` | `staging` | `production`
- `X-Server-Time` — when the server handled the request

### 2. Verification Script

```bash
# Local
./scripts/verify-place-api-headers.sh http://localhost:3000 seco

# Staging
./scripts/verify-place-api-headers.sh https://your-staging-domain.com seco
```

**Example output:**
```
=== Place API Headers ===
URL: http://localhost:3000/api/places/seco

x-build-id: local-dev
x-env: development
x-server-time: 2026-02-18T23:00:00.000Z
cache-control: no-store, no-cache, must-revalidate

=== Summary ===
X-Build-Id:  local-dev
X-Env: development
```

---

## Common Causes

| Cause | Symptom | Fix |
|-------|---------|-----|
| **Browser cache** | "from disk cache" in Network tab | Hard refresh (Cmd+Shift+R / Ctrl+Shift+R), or use Incognito |
| **Stale .next** | Code changes don't appear | `npm run dev:clean` (clears .next, restarts dev) |
| **Edge / CDN cache** | Staging shows old data | Add `?__nocache=1` to API URL, or wait for cache TTL |
| **Wrong domain** | Hitting prod instead of staging | Check DevTools request URL |
| **Client fetch caching** | useEffect fetch returns stale | Dev uses `cache: 'no-store'` + `Cache-Control: no-cache` |

---

## Exact Commands

### Reset local dev (fresh build)
```bash
npm run dev:clean
```

### Bypass cache for a single request
```
/api/places/seco?__nocache=1
```
Adds `X-Cache-Bypass: 1` and forces `Cache-Control: no-store`.

### Debug logging (server-side)
```bash
DEBUG_HEADERS=1 npm run dev
```
Logs `slug`, `buildId`, `env`, `bypassCache` for each API request.

---

## What "Good" Looks Like

**Local dev:**
- `X-Build-Id`: `local-dev` or ISO timestamp
- `X-Env`: `development`
- `Cache-Control`: `no-store, no-cache, must-revalidate`
- No "from disk cache" on the fetch

**Staging:**
- `X-Build-Id`: short commit SHA (e.g. `ad9e848`)
- `X-Env`: `staging` or `preview`
- Navigating to `/place/[slug]` reflects latest deploy

**Production:**
- `X-Build-Id`: commit SHA
- `X-Env`: `production`
- `Cache-Control`: `private, max-age=60, stale-while-revalidate=120` (normal requests)

---

## Architecture Note

The place page fetches data **client-side** in `useEffect`. That means:
- First paint shows loading state
- API response determines content
- Browser/CDN caching affects what you see

To eliminate client-side staleness entirely, consider moving the fetch to a server component or SSR (Phase 4 in the task list).
