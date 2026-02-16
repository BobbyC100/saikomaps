# Security + Auth Hardening PR

## Summary

Launch blocker fixes to eliminate security risks before v1 deployment:

### 1. Debug Endpoint Protection ✅
- Added `debugEnabled()` guard to all debug routes
- Routes return 404 in production by default
- Only enabled when `NODE_ENV !== 'production'` AND `DEBUG_ROUTES_ENABLED=true`
- Protected routes:
  - `/api/debug/env`
  - `/api/debug/_debug/env`
  - `/api/debug/locations`

### 2. Auth Middleware ✅
- Created `middleware.ts` with NextAuth JWT-based auth
- Protected creator routes (redirect to login):
  - `/dashboard/*`, `/create/*`, `/import/*`, `/maps/new`, `/maps/*/edit`, `/profile`
- Protected admin routes (require admin email):
  - `/admin/*`, `/api/admin/*`
- Protected write API methods (return 401):
  - `POST/PUT/DELETE` to `/api/maps/*`, `/api/import/*`, `/api/locations/*`, `/api/map-places/*`, `/api/spots/*`
- Public routes remain accessible:
  - `/`, `/map/[slug]`, `/place/[slug]`, `/login`, `/signup`

### 3. Demo/Test Pages Removed ✅
- Deleted `/test-add-location` page
- Deleted `/search-results-demo` page

---

## Environment Variables Required

Add to Vercel (Production + Preview):

```bash
# Debug routes (set to false for production)
DEBUG_ROUTES_ENABLED=false

# Admin access (comma-separated email list)
ADMIN_EMAILS=bobby@example.com,admin@example.com

# NextAuth (should already exist)
NEXTAUTH_SECRET=<your-secret>
NEXTAUTH_URL=https://saikomaps.vercel.app
```

---

## Verification Commands

### 1. Debug endpoints return 404 in production

```bash
# Should return 404
curl -i https://saikomaps.vercel.app/api/debug/env

# Expected output:
# HTTP/2 404
# Not Found
```

```bash
# Should return 404
curl -i https://saikomaps.vercel.app/api/debug/_debug/env
```

```bash
# Should return 404
curl -i https://saikomaps.vercel.app/api/debug/locations
```

### 2. Protected routes redirect to login

```bash
# Should redirect to /login?next=/dashboard
curl -i https://saikomaps.vercel.app/dashboard

# Expected output:
# HTTP/2 307 (or 302/303)
# Location: https://saikomaps.vercel.app/login?next=%2Fdashboard
```

```bash
# Should redirect to login
curl -i https://saikomaps.vercel.app/maps/new
```

### 3. Admin routes return 403 for non-admins

```bash
# When logged in as non-admin user
curl -i https://saikomaps.vercel.app/admin/review \
  -H "Cookie: next-auth.session-token=<valid-non-admin-token>"

# Expected output:
# HTTP/2 403
# Forbidden
```

### 4. Write APIs return 401 without auth

```bash
# Should return 401
curl -i -X POST https://saikomaps.vercel.app/api/maps \
  -H "Content-Type: application/json" \
  -d '{"name": "test"}'

# Expected output:
# HTTP/2 401
# Unauthorized
```

### 5. Public routes remain accessible

```bash
# Should return 200
curl -i https://saikomaps.vercel.app/

# Should return 200
curl -i https://saikomaps.vercel.app/login

# Should return 200 (if slug exists)
curl -i https://saikomaps.vercel.app/map/some-map-slug
```

### 6. Demo pages return 404

```bash
# Should return 404
curl -i https://saikomaps.vercel.app/test-add-location

# Should return 404
curl -i https://saikomaps.vercel.app/search-results-demo
```

---

## Testing in Development

To enable debug routes locally:

```bash
# In .env.local
DEBUG_ROUTES_ENABLED=true
```

Then:

```bash
npm run dev
curl http://localhost:3000/api/debug/env
# Should return env data (not 404)
```

---

## Files Changed

- `app/api/debug/env/route.ts` - Added debugEnabled() guard
- `app/api/debug/_debug/env/route.ts` - Added debugEnabled() guard
- `app/api/debug/locations/route.ts` - Added debugEnabled() guard
- `middleware.ts` - NEW: Auth middleware with NextAuth JWT
- `app/(creator)/test-add-location/page.tsx` - DELETED
- `app/(viewer)/search-results-demo/page.tsx` - DELETED

---

## Deployment Checklist

Before merging:

- [ ] Set `DEBUG_ROUTES_ENABLED=false` in Vercel Production
- [ ] Set `DEBUG_ROUTES_ENABLED=false` in Vercel Preview
- [ ] Set `ADMIN_EMAILS=<comma-separated-list>` in Vercel Production
- [ ] Set `ADMIN_EMAILS=<comma-separated-list>` in Vercel Preview
- [ ] Verify `NEXTAUTH_SECRET` is set in Production
- [ ] Test all verification commands above after deployment

After merging:

- [ ] Run verification curl commands against production
- [ ] Test login flow: visit `/dashboard` → redirects → login → redirects back
- [ ] Test admin flow: login as non-admin → visit `/admin/review` → see 403
- [ ] Confirm public routes still work without login
