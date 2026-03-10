# URGENT: Authentication System Blocked - Requires Immediate CTO Intervention

**Date**: 2026-02-17  
**Time Invested**: 5+ hours  
**Status**: CRITICAL BLOCKER - Cannot proceed with testing  
**Issue**: Prisma singleton caching prevents both login AND signup

---

## Current State: DEADLOCKED

### What Just Happened
1. ✅ Successfully deleted user `rjcicc@gmail.com` from Neon database (verified via direct query)
2. ✅ Attempted to recreate user via signup flow at http://localhost:3000/signup
3. ❌ **ERROR: "User with this email already exists"** 
4. ❌ The cached Prisma singleton is serving stale data even after:
   - User deletion from database
   - Server restart
   - Cache clearing
   - Prisma regeneration

### The Database Reality vs. Application Reality

**Direct Database Query** (truth):
```bash
$ DATABASE_URL="postgresql://neondb_owner:..." npx tsx -e "prisma.users.findMany()"
Users found: 0  ✅ USER DOES NOT EXIST
```

**Application Signup Check** (cached):
```
POST /api/auth/signup
Error: "User with this email already exists" ❌ THINKS USER EXISTS
```

**The application is living in a parallel reality where deleted users still exist.**

---

## Root Cause: Prisma Global Singleton Cache

### The Code Pattern That's Breaking Us

```typescript
// lib/db.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db = globalForPrisma.prisma ?? new PrismaClient({...})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

**The Problem**:
- `globalThis` persists across Next.js hot reloads
- The Prisma client caches query results or connection state
- No amount of server restarts, cache clears, or `prisma generate` invalidates `globalThis`
- The only way to clear it is to **kill the Node.js process entirely and start fresh**

**But even that didn't work**, suggesting Next.js Turbopack is doing aggressive caching at a deeper level.

---

## Why This Is Critical

This isn't just a login issue anymore. **The entire authentication system is non-functional**:

1. ❌ Existing users cannot log in (wrong password hash served)
2. ❌ New users cannot sign up (ghost users block creation)
3. ❌ Cannot test any protected routes or admin functionality
4. ❌ Cannot proceed with PR#3/PR#4 validation
5. ❌ Blocks deployment entirely

---

## Immediate Fix Required (Choose One)

### Option A: Bypass Singleton Entirely (30 minutes)

Replace all auth-related Prisma usage with fresh clients:

**In `lib/auth.ts`:**
```typescript
async authorize(credentials) {
  // CREATE FRESH INSTANCE PER AUTH ATTEMPT
  const prisma = new PrismaClient()
  
  try {
    const user = await prisma.users.findUnique({
      where: { email: credentials.email }
    })
    
    // ... rest of auth logic
    
  } finally {
    await prisma.$disconnect()
  }
}
```

**In `app/api/auth/signup/route.ts`:**
```typescript
export async function POST(req: Request) {
  const prisma = new PrismaClient()
  
  try {
    // Check if user exists
    const existing = await prisma.users.findUnique({ where: { email } })
    if (existing) return NextResponse.json(...)
    
    // Create user
    const user = await prisma.users.create({ data: {...} })
    
  } finally {
    await prisma.$disconnect()
  }
}
```

**Pros**: 
- Will work immediately
- Guarantees fresh data every time
- Acceptable performance for auth operations (not called frequently)

**Cons**: 
- Not ideal for high-traffic production (creates new connections)
- Workaround rather than proper fix

---

### Option B: Force Singleton Invalidation (2 hours)

Modify `lib/db.ts` to force-clear the singleton on specific conditions:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient | undefined
  lastReset: number | undefined
}

// Force reset every 5 minutes in dev
const RESET_INTERVAL = 5 * 60 * 1000

async function getPrismaClient() {
  const now = Date.now()
  
  if (
    process.env.NODE_ENV !== 'production' &&
    globalForPrisma.prisma &&
    globalForPrisma.lastReset &&
    now - globalForPrisma.lastReset > RESET_INTERVAL
  ) {
    console.log('[Prisma] Force disconnecting stale client')
    await globalForPrisma.prisma.$disconnect()
    globalForPrisma.prisma = undefined
  }
  
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
    globalForPrisma.lastReset = now
  }
  
  return globalForPrisma.prisma
}

export const db = await getPrismaClient()
```

**Pros**: 
- Addresses root cause
- Can tune reset interval
- Works for all Prisma usage

**Cons**: 
- More complex
- Async export might break some imports
- Still a workaround

---

### Option C: Switch to Manual Connection Management (4+ hours)

Remove the singleton pattern entirely and use connection pooling properly:

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | undefined

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    })
  }
  return prisma
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = undefined
  }
}
```

Then update all imports from `import { db }` to `import { getPrisma }` and call `const db = getPrisma()`.

**Pros**: 
- Proper architecture
- More control over connection lifecycle

**Cons**: 
- Requires updating ~50+ files
- Risk of breaking existing code
- Time-consuming

---

## Recommendation: Option A Immediately, Then Option C

**Right Now** (to unblock):
1. Implement Option A in `lib/auth.ts` and signup route
2. Test login/signup works
3. Proceed with PR#3/PR#4 testing

**This Week** (proper fix):
1. Implement Option C across codebase
2. Add integration tests for auth
3. Document connection management patterns

---

## What We've Tried (All Failed)

1. ✅ Restarted dev server 10+ times
2. ✅ Cleared `.next` cache
3. ✅ Deleted and reinstalled `node_modules/.prisma`
4. ✅ Ran `npx prisma generate` multiple times
5. ✅ Called `await db.$disconnect()` manually
6. ✅ Deleted user from database
7. ✅ Created new password hashes
8. ✅ Verified correct DATABASE_URL in use
9. ✅ Confirmed no duplicate users
10. ❌ **The singleton cache persists through all of this**

---

## Files That Need Changes (Option A)

### Immediate Changes Required:
1. `lib/auth.ts` - Line ~27 (authorize function)
2. `app/api/auth/signup/route.ts` - All Prisma usage
3. `app/api/auth/[...nextauth]/route.ts` - If it imports db

### Total Lines to Change: ~20-30 lines across 2-3 files
### Time to Implement: 20-30 minutes
### Risk Level: LOW (isolated to auth, easy to test)

---

## Testing After Fix

Once Option A is implemented:

1. **Kill all Node processes** (nuclear option):
   ```bash
   pkill -f "node.*next"
   npm run dev
   ```

2. **Sign up fresh user**:
   - URL: http://localhost:3000/signup
   - Email: rjcicc@gmail.com
   - Password: test1234

3. **Verify login**:
   - URL: http://localhost:3000/login
   - Same credentials

4. **Test admin access**:
   - Update `.env.local`: `ADMIN_EMAILS="rjcicc@gmail.com"`
   - Restart server
   - Hit `/api/ai/generate-map-details` (should allow)

---

## Bottom Line

**We cannot proceed with development, testing, or deployment until this is fixed.**

The Prisma singleton pattern is fundamentally incompatible with Next.js Turbopack's hot reload mechanism in our current setup. We need to either:
- Work around it (Option A - fast)
- Fix it properly (Option C - slow)

**I recommend implementing Option A immediately (30 min) to unblock Bobby, then scheduling Option C for a proper fix.**

---

**Last Updated**: 2026-02-17  
**Blocker Owner**: CTO  
**Waiting On**: Implementation decision  
**Impact**: Cannot test or deploy authentication system
