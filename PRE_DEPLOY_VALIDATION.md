# Pre-Deploy Validation Checklist

**Date**: February 17, 2026  
**Deployment Target**: Production  
**Approver**: CTO

---

## Status Overview

- ✅ Code Complete (PR#2-4)
- ✅ Automated Tests Passing (27/27)
- ⏳ **Manual Validation Required** (6 checks below)

---

## 1️⃣ AI Endpoint Gating Behavior

**Endpoint**: `POST /api/ai/generate-map-details`

### Test All Three States:

**Test 1A: Logged Out → 401**
```bash
curl -X POST http://localhost:3000/api/ai/generate-map-details \
  -H "Content-Type: application/json" \
  -d '{"places":[{"name":"Test","address":"123 Main St","latitude":34.05,"longitude":-118.25,"types":[],"category":"eat"}]}' \
  -i
```
**Expected**: `HTTP/1.1 401 Unauthorized`
```json
{"error":"Unauthorized"}
```

---

**Test 1B: Logged In (Non-Admin) → 403**
```bash
# Log in as non-admin user, then:
curl -X POST http://localhost:3000/api/ai/generate-map-details \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<NON_ADMIN_SESSION>" \
  -d '{"places":[...]}' \
  -i
```
**Expected**: `HTTP/1.1 403 Forbidden`
```json
{"error":"Forbidden - Admin access required"}
```

---

**Test 1C: Admin → 200 + Rate Limit Headers**
```bash
# Log in as admin user, then:
curl -X POST http://localhost:3000/api/ai/generate-map-details \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<ADMIN_SESSION>" \
  -d '{
    "places": [
      {"name":"Seco","address":"123 Main","latitude":34.05,"longitude":-118.25,"types":["restaurant"],"category":"eat"},
      {"name":"Budonoki","address":"456 Elm","latitude":34.06,"longitude":-118.26,"types":["restaurant"],"category":"eat"},
      {"name":"Tacos 1986","address":"789 Oak","latitude":34.07,"longitude":-118.27,"types":["restaurant"],"category":"eat"}
    ]
  }' \
  -i
```
**Expected**: `HTTP/1.1 200 OK`
**Headers Present**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: <unix-timestamp>
```

**Result**: [ ] Pass / [ ] Fail  
**Notes**: _______________

---

## 2️⃣ Upstash Fail-Closed Behavior

### Test Production Mode Without Env Vars

**Setup**:
```bash
# In .env.local, temporarily comment out:
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...

# Set production mode
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

**Test**:
```bash
curl -X POST http://localhost:3000/api/ai/generate-map-details \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<ADMIN_SESSION>" \
  -d '{"places":[...]}' \
  -i
```

**Expected**: `HTTP/1.1 500 Internal Server Error`
**Body**:
```json
{
  "error": "Failed to generate map details"
}
```
**Server logs should show**:
```
[Rate Limit] Error: Missing Upstash Redis configuration...
```

---

### Test Development Mode Without Env Vars

**Setup**:
```bash
# Same as above (env vars commented out)
NODE_ENV=development npm run dev
```

**Test**: Same curl command

**Expected**: `HTTP/1.1 200 OK` (request allowed)
**Server logs should show**:
```
[Rate Limit] Rate limiting unavailable in development - allowing request
```

**Result**: [ ] Pass / [ ] Fail  
**Notes**: _______________

---

## 3️⃣ No Stray Auth Drift

### Automated Check (Already Run)

```bash
grep -r "demo-user-id\|__dev_owner__\|x-dev-owner\|temp-admin-user\|function getUserId(" app/
```

**Result**: ✅ **PASS** - Zero matches found

---

## 4️⃣ Ownership Enforcement

### Two-Account Test

**Setup**:
1. Create two test accounts:
   - User A: `usera@test.com`
   - User B: `userb@test.com`

2. User A: Create a map via dashboard
   - Note the map ID (e.g., `abc-123`)

**Test 4A: User B Tries to Edit User A's Map**
```bash
# Log in as User B, then:
curl -X PATCH http://localhost:3000/api/maps/abc-123 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<USERB_SESSION>" \
  -d '{"title":"Hacked"}' \
  -i
```
**Expected**: `HTTP/1.1 403 Forbidden`
```json
{"error":"Forbidden - Not resource owner"}
```

---

**Test 4B: User B Tries to Delete Place from User A's Map**
```bash
# Get a mapPlaceId from User A's map, then:
curl -X DELETE http://localhost:3000/api/map-places/xyz-789 \
  -H "Cookie: next-auth.session-token=<USERB_SESSION>" \
  -i
```
**Expected**: `HTTP/1.1 403 Forbidden`
```json
{"error":"Forbidden - Not resource owner"}
```

---

**Test 4C: User A Can Edit Own Map**
```bash
# Log in as User A, then:
curl -X PATCH http://localhost:3000/api/maps/abc-123 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<USERA_SESSION>" \
  -d '{"title":"Updated Title"}' \
  -i
```
**Expected**: `HTTP/1.1 200 OK`

**Result**: [ ] Pass / [ ] Fail  
**Notes**: _______________

---

## 5️⃣ NEXTAUTH_SECRET in ALL Environments

### Local
```bash
grep NEXTAUTH_SECRET .env.local
```
**Expected**: Non-empty value  
**Status**: [ ] Verified / [ ] Missing

---

### Preview (Vercel)
1. Go to https://vercel.com/[your-team]/saiko-maps
2. Settings → Environment Variables
3. Search for `NEXTAUTH_SECRET`

**Expected**: Present in Preview environment  
**Status**: [ ] Verified / [ ] Missing

---

### Production (Vercel)
Same as above, check Production environment.

**Expected**: Present in Production environment  
**Status**: [ ] Verified / [ ] Missing

---

**⚠️ CRITICAL**: If missing in ANY environment, sessions will invalidate randomly.

**Fix**:
```bash
# Generate new secret
openssl rand -base64 32

# Add to all environments
NEXTAUTH_SECRET=<generated-secret>
```

**Result**: [ ] Pass / [ ] Fail  
**Notes**: _______________

---

## 6️⃣ First-Hour Post-Deploy Monitoring

### Setup Monitoring Dashboard

**Vercel Logs**:
- https://vercel.com/[your-team]/saiko-maps/logs

**Upstash Dashboard**:
- https://console.upstash.com/

---

### Metrics to Watch (First Hour)

**1. Authentication Error Rates**

**Baseline (Pre-Deploy)**:
- 401 errors: ___/hour
- 403 errors: ___/hour

**Post-Deploy (Target)**:
- 401 errors: <5% increase
- 403 errors: <5% increase

**Action if >5% spike**: Investigate logs, consider rollback

---

**2. Rate Limit Behavior**

**Check for 429 responses**:
```bash
# In Vercel logs, search for "429"
```

**Expected**: 
- Should see 429s when admin hits 11th request
- Upstash dashboard shows request count

**Action if no 429s ever**: Rate limiting may not be active

---

**3. Upstash Request Volume**

**Upstash Dashboard → Analytics**:
- Commands/hour: Should match AI endpoint call volume
- Latency: <50ms for rate limit checks

**Action if latency >100ms**: May need to upgrade Upstash tier

---

**4. Error Log Review**

**Search logs for**:
```
[Rate Limit] Error
Missing Upstash Redis configuration
Rate limiting unavailable
```

**Expected**: Zero occurrences in production

**Action if found**: Check env vars, verify Upstash connectivity

---

### Rollback Trigger

**Rollback if ANY of these occur**:
- 401/403 spike >5% within first 15 minutes
- Rate limiting not activating (no 429s when expected)
- Upstash connection failures in logs
- User reports of "logged out randomly"

**Rollback Command**:
```bash
# Revert last 3 commits (PR#2-4)
git revert HEAD~3..HEAD
git push origin main --force-with-lease
```

---

## Sign-Off

### Validation Complete

- [ ] 1️⃣ AI endpoint gating (401/403/200) - **Tested by**: ___________
- [ ] 2️⃣ Upstash fail-closed behavior - **Tested by**: ___________
- [ ] 3️⃣ No auth drift - **Automated**: ✅ Pass
- [ ] 4️⃣ Ownership enforcement - **Tested by**: ___________
- [ ] 5️⃣ NEXTAUTH_SECRET in all envs - **Verified by**: ___________
- [ ] 6️⃣ Post-deploy monitoring ready - **Owner**: ___________

---

### CTO Approval

**Validation Status**: [ ] All 6 checks passed  
**Approved By**: ___________  
**Date**: ___________  
**Deployment Window**: ___________

---

### Post-Deploy Report

**Deployed At**: ___________  
**First Hour Metrics**:
- 401 rate: ___/hour (baseline: ___)
- 403 rate: ___/hour (baseline: ___)
- 429 rate: ___/hour (expected: >0 if admin hits limit)
- Upstash latency: ___ms (target: <50ms)

**Issues Found**: [ ] None / [ ] List below

**Status**: [ ] Stable / [ ] Rolled Back

---

**Next Review**: 24 hours post-deploy
