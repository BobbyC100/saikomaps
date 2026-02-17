# Manual Validation Status Report

**Date**: February 17, 2026  
**Validator**: Bobby

---

## Validation Checklist

### ✅ Check 1: AI Endpoint Gating (401/403/200)

**Status**: ⏳ **REQUIRES YOUR MANUAL TEST**

**Test Commands**:

**A) Logged Out → 401**
```bash
curl -i -X POST "http://localhost:3000/api/ai/generate-map-details" \
  -H "Content-Type: application/json" \
  --data '{"places":[{"name":"Test","address":"123 Main","latitude":34.05,"longitude":-118.25,"types":[],"category":"eat"}]}'
```
**Expected**: `HTTP/1.1 401` + `{"error":"Unauthorized"}`

**Result**: [ ] Pass / [ ] Fail

---

**B) Logged In (Non-Admin) → 403**
```bash
# 1. Log in to http://localhost:3000 as NON-ADMIN user
# 2. Open DevTools → Application → Cookies → Copy all cookies
# 3. Run:

curl -i -X POST "http://localhost:3000/api/ai/generate-map-details" \
  -H "Content-Type: application/json" \
  -H "Cookie: <PASTE_COOKIES_HERE>" \
  --data '{"places":[{"name":"Test","address":"123 Main","latitude":34.05,"longitude":-118.25,"types":[],"category":"eat"}]}'
```
**Expected**: `HTTP/1.1 403` + `{"error":"Forbidden - Admin access required"}`

**Result**: [ ] Pass / [ ] Fail

---

**C) Logged In (Admin) → 200 + Headers**
```bash
# 1. Log in to http://localhost:3000 as ADMIN (rjcicc@gmail.com)
# 2. Open DevTools → Application → Cookies → Copy all cookies
# 3. Run:

curl -i -X POST "http://localhost:3000/api/ai/generate-map-details" \
  -H "Content-Type: application/json" \
  -H "Cookie: <PASTE_ADMIN_COOKIES_HERE>" \
  --data '{
    "places": [
      {"name":"Seco","address":"123 Main","latitude":34.05,"longitude":-118.25,"types":["restaurant"],"category":"eat"},
      {"name":"Budonoki","address":"456 Elm","latitude":34.06,"longitude":-118.26,"types":["restaurant"],"category":"eat"},
      {"name":"Tacos 1986","address":"789 Oak","latitude":34.07,"longitude":-118.27,"types":["restaurant"],"category":"eat"}
    ]
  }'
```
**Expected**: 
- `HTTP/1.1 200`
- Headers: `X-RateLimit-Limit: 10`, `X-RateLimit-Remaining: 9`, `X-RateLimit-Reset: <timestamp>`

**Result**: [ ] Pass / [ ] Fail

---

### ✅ Check 2: Upstash Fail-Closed Behavior

**Status**: ⏳ **REQUIRES YOUR MANUAL TEST**

**CRITICAL**: This ensures you don't ship unlimited AI calls if Upstash is misconfigured.

**A) Production Mode Without Upstash → Must Fail Closed**

```bash
# 1. Add Upstash vars to .env.local first:
echo "UPSTASH_REDIS_REST_URL=<your-url>" >> .env.local
echo "UPSTASH_REDIS_REST_TOKEN=<your-token>" >> .env.local

# 2. Build for production
npm run build

# 3. Temporarily remove Upstash vars
unset UPSTASH_REDIS_REST_URL
unset UPSTASH_REDIS_REST_TOKEN

# 4. Start in production mode
NODE_ENV=production npm run start

# 5. Hit AI endpoint as admin (use curl from Check 1C)
```

**Expected**: 
- Request fails with `HTTP/1.1 500`
- Response: `{"error":"Failed to generate map details"}`
- Logs show: `[Rate Limit] Error: Missing Upstash Redis configuration`

**Result**: [ ] Pass / [ ] Fail

---

**B) Dev Mode Without Upstash → Warns, Allows**

```bash
# 1. Keep Upstash vars unset
# 2. Start in dev mode
NODE_ENV=development npm run dev

# 3. Hit AI endpoint as admin
```

**Expected**: 
- Request succeeds with `HTTP/1.1 200`
- Console shows: `[Rate Limit] Rate limiting unavailable in development - allowing request`

**Result**: [ ] Pass / [ ] Fail

---

### ✅ Check 3: Ownership Enforcement

**Status**: ⏳ **REQUIRES YOUR MANUAL TEST**

**Two-Account Test**:

**Step 1: User A Creates Map**
1. Log in as `rjcicc@gmail.com` (admin/User A)
2. Go to `/dashboard`
3. Create a new map
4. Copy the map ID (from URL: `/maps/[MAP_ID]/edit`)

**Step 2: User B Tries to Edit**
1. Log out, create new account or log in as different user (User B)
2. Navigate to `/maps/[MAP_ID]/edit` (User A's map)
3. Try to edit the map

**Expected**: Redirect or 403 error

---

**API Test**:
```bash
# 1. Get User B's cookies from browser
# 2. Try to PATCH User A's map:

curl -i -X PATCH "http://localhost:3000/api/maps/[USER_A_MAP_ID]" \
  -H "Content-Type: application/json" \
  -H "Cookie: <USER_B_COOKIES>" \
  --data '{"title":"Hacked"}'
```

**Expected**: `HTTP/1.1 403` + `{"error":"Forbidden - Not resource owner"}`

**Result**: [ ] Pass / [ ] Fail

---

### ⚠️ Check 4: NEXTAUTH_SECRET in All Environments

**Status**: ⚠️ **ACTION REQUIRED**

**Local (.env.local)**:
- **Status**: ❌ **MISSING** - Needs to be added

**Action**:
```bash
# Generate secret
openssl rand -base64 32

# Add to .env.local
echo "NEXTAUTH_SECRET=<generated-secret>" >> .env.local
```

**Verify**:
```bash
grep NEXTAUTH_SECRET .env.local
```

**Result**: [ ] Added and verified

---

**Vercel Preview**:
1. Go to: https://vercel.com/bobbyai/saiko-maps/settings/environment-variables
2. Filter: "Preview" environment
3. Search for: `NEXTAUTH_SECRET`

**Result**: [ ] Present / [ ] Missing

---

**Vercel Production**:
1. Same dashboard as above
2. Filter: "Production" environment
3. Search for: `NEXTAUTH_SECRET`

**Result**: [ ] Present / [ ] Missing

---

**Upstash Variables** (also need to be added):

**Local (.env.local)**:
```bash
# Add after setting up Upstash account
echo "UPSTASH_REDIS_REST_URL=https://your-db.upstash.io" >> .env.local
echo "UPSTASH_REDIS_REST_TOKEN=your_token_here" >> .env.local
```

**Vercel Preview & Production**:
- Add `UPSTASH_REDIS_REST_URL`
- Add `UPSTASH_REDIS_REST_TOKEN`

**Result**: [ ] Added to all environments

---

### ✅ Check 5: Monitoring Ready

**Status**: ⏳ **REQUIRES YOUR SETUP**

**Vercel Logs**:
1. Go to: https://vercel.com/bobbyai/saiko-maps/logs
2. Test filter: Status code `401`
3. Test filter: Status code `403`
4. Test filter: Status code `429`
5. Test filter: Status code `5xx`

**Can you see logs?**: [ ] Yes / [ ] No

---

**Upstash Dashboard**:
1. Go to: https://console.upstash.com/
2. Create Redis database (if not done)
3. Navigate to database → Analytics
4. Can you see: Command count, Latency graphs?

**Dashboard accessible?**: [ ] Yes / [ ] No

---

**After Deploy - Verify**:
- Make AI request as admin
- Check Upstash dashboard increments command count
- Make 11th request, verify 429 appears in Vercel logs

---

## Summary Checklist

Reply with this when all checks pass:

```
✅ AI gating: [✅ / ❌] (401/403/200 + headers)
✅ Upstash fail-closed: [✅ / ❌] (prod fails, dev allows)
✅ Ownership: [✅ / ❌] (403 cross-user)
✅ Secrets: [✅ / ❌] (local/preview/prod)
✅ Monitoring: [✅ / ❌] (can observe 401/403/429/5xx + Upstash)
```

---

## Pre-Validation Setup Required

**Before you can run tests, you MUST**:

1. **Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

2. **Create .env.local with all required vars**:
```bash
# Copy current vars
cp .env.local .env.local.backup

# Add missing vars
cat << 'EOF' >> .env.local

# Auth (REQUIRED)
NEXTAUTH_SECRET=<paste-generated-secret-here>

# Rate Limiting (REQUIRED for PR#4 testing)
UPSTASH_REDIS_REST_URL=<from-upstash-dashboard>
UPSTASH_REDIS_REST_TOKEN=<from-upstash-dashboard>
EOF
```

3. **Set up Upstash**:
   - Go to https://console.upstash.com/
   - Create account (free tier OK)
   - Create Redis database
   - Copy REST URL and TOKEN
   - Paste into .env.local above

4. **Restart dev server**:
```bash
npm run dev
```

5. **Then run the validation tests above**

---

**Current Blocker**: Missing NEXTAUTH_SECRET and Upstash credentials in .env.local

Once added, you can proceed with manual validation tests.
