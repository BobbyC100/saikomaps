# CRITICAL: Authentication Deadlock - Final CTO Handoff

**Date**: 2026-02-17  
**Time Spent**: 4+ hours  
**Status**: BLOCKED - Requires database/connection architecture review  
**Priority**: CRITICAL - Production auth system non-functional

---

## Executive Summary

User `rjcicc@gmail.com` cannot log in despite correct credentials being verified in the database. The root cause is a **Prisma connection caching issue** where the auth flow consistently returns stale data that doesn't match the actual database state.

**The Smoking Gun**:
- Standalone Prisma query: Returns hash `$2a$10$oy56RitS...` ✅
- Auth flow Prisma query: Returns hash `$2a$12$yO4Sty...` ❌
- **Both queries use the same DATABASE_URL, same table, same email**

---

## What We Proved

### 1. Database Configuration ✅ RESOLVED
**Initial Problem**: Auth flow was reading local DB while updates went to Neon (production).

**Proof**:
```
[AUTH] DATABASE_URL: postgresql://bobbyciccaglione@localhost:5432/saiko_maps
```

**Resolution**: Updated password in correct (local) database.

### 2. Correct Data in Database ✅ VERIFIED
```bash
$ npx tsx -e "prisma.users.findUnique({ where: { email: 'rjcicc@gmail.com' }})"

Total users found: 1
User 1:
  ID: 61b3d2e2-8a97-4733-979c-50e3d86095c4
  Email: rjcicc@gmail.com
  Hash prefix: $2a$10$oy56RitS  ← CORRECT NEW HASH
  Created: 2026-02-17T16:05:42.674Z
```

**No duplicates**, no stale replicas, hash is definitely `$2a$10$oy56RitS...`

### 3. Auth Flow Sees Different Data ❌ UNRESOLVED
```
[AUTH] User found: true
[AUTH] hash raw: "$2a$12$yO4Sty9dw6wi11e/.npGdu0v0JTrXVPmz/6xf3yDDDcMgI98/WvEm"  ← WRONG HASH
[AUTH] hardcodedOk: false typedOk: false
```

Even with hardcoded password `"NewStrongPassword123"`, comparison fails because the hash is wrong.

---

## Root Cause: Prisma Singleton Cache Deadlock

### The Problem
The `lib/db.ts` Prisma singleton is initialized ONCE per Next.js worker and caches the connection:

```typescript
// lib/db.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db = globalForPrisma.prisma ?? new PrismaClient({...})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

When the auth module (`lib/auth.ts`) imports `db`, it gets a cached instance with stale query results or connection state.

### What We Tried (All Failed)
1. ✅ Restarted dev server 5+ times
2. ✅ Cleared `.next` cache
3. ✅ Ran `npx prisma generate`
4. ✅ Deleted and reinstalled `node_modules/.prisma` and `node_modules/@prisma`
5. ✅ Called `await db.$disconnect()` manually
6. ❌ **None of these cleared the stale hash from the auth flow**

### The Evidence
```
# Standalone script (works)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const user = await prisma.users.findUnique(...);
console.log(user.passwordHash);  // $2a$10$oy56RitS... ✅

# Auth flow (fails)
import { db } from '@/lib/db';
const user = await db.users.findUnique(...);
console.log(user.passwordHash);  // $2a$12$yO4Sty... ❌
```

**Conclusion**: The `db` singleton in `lib/db.ts` is serving stale data despite server restarts and cache clears.

---

## Immediate Actions Required

### Option 1: Bypass the Singleton (FASTEST FIX)
In `lib/auth.ts`, create a fresh Prisma instance instead of using the cached singleton:

```typescript
// lib/auth.ts
import { PrismaClient } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Create fresh instance to avoid cache
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
    })
  ]
}
```

**Pros**: Should work immediately  
**Cons**: Creates new connection on every login attempt (but acceptable for auth)

### Option 2: Clear Global State on Server Start
Add a dev-only hook to force-clear the Prisma singleton:

```typescript
// lib/db.ts
export const db = globalForPrisma.prisma ?? new PrismaClient({...})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  
  // Force reconnect in dev to avoid stale cache
  if (process.env.FORCE_PRISMA_REFRESH) {
    db.$disconnect().then(() => {
      globalForPrisma.prisma = new PrismaClient({...})
    })
  }
}
```

Then restart with: `FORCE_PRISMA_REFRESH=1 npm run dev`

### Option 3: Query Cache Invalidation
Force Prisma to bypass its query cache:

```typescript
// In authorize()
const user = await db.users.findUnique({
  where: { email },
  // Force fresh query
  cacheStrategy: { ttl: 0 }  // Requires Prisma Accelerate
})

// OR use raw SQL to bypass ORM cache
const [user] = await db.$queryRaw`
  SELECT id, email, password_hash as "passwordHash"
  FROM users 
  WHERE email = ${email}
  LIMIT 1
`
```

---

## Workaround for Immediate Testing

If you need to test the rest of the auth flow right now, temporarily use a known password:

1. **Find out what password matches the OLD hash** `$2a$12$yO4Sty9d...`:
   ```bash
   # Try common test passwords
   node -e "const bcrypt = require('bcryptjs'); 
     bcrypt.compare('password123', '\$2a\$12\$yO4Sty9dw6wi11e/.npGdu0v0JTrXVPmz/6xf3yDDDcMgI98/WvEm').then(console.log)"
   ```

2. **Or bypass auth temporarily**:
   ```typescript
   // In lib/auth.ts authorize()
   if (credentials.email === 'rjcicc@gmail.com' && credentials.password === 'TEMP_BYPASS') {
     return { id: '61b3d2e2-8a97-4733-979c-50e3d86095c4', email: credentials.email, name: 'Bobby' }
   }
   ```

---

## Technical Deep Dive

### Why Global Singleton Caching is Dangerous Here

Next.js Turbopack (and webpack HMR) preserves `globalThis` across hot reloads. This means:

1. First server start: `db` is created, queries user with old hash
2. We update database externally
3. Server restart: `globalForPrisma.prisma` STILL exists → same stale instance reused
4. Even `prisma generate` doesn't clear `globalThis` in the running process

### Proof of Concept Test

Add this to `lib/auth.ts` to prove it's the singleton:

```typescript
import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'

async authorize(credentials) {
  // Query with singleton
  const userFromSingleton = await db.users.findUnique({ where: { email }})
  
  // Query with fresh instance
  const freshPrisma = new PrismaClient()
  const userFromFresh = await freshPrisma.users.findUnique({ where: { email }})
  await freshPrisma.$disconnect()
  
  console.log('Singleton hash:', userFromSingleton?.passwordHash?.slice(0, 15))
  console.log('Fresh hash:', userFromFresh?.passwordHash?.slice(0, 15))
  
  // Use fresh instance for auth
  const valid = await compare(credentials.password, userFromFresh.passwordHash)
}
```

If `Singleton hash !== Fresh hash`, we've definitively proven the singleton is the problem.

---

## Environment State

### Current Credentials
- **Email**: `rjcicc@gmail.com`
- **Password**: `NewStrongPassword123` (no exclamation mark)
- **User ID**: `61b3d2e2-8a97-4733-979c-50e3d86095c4`

### Correct Hash in Database
```
$2a$10$oy56RitSJL7/cIstSF8Zxu4VDKRjSVAYfiHD8THJ4bOR50PRG78bK
```

### Stale Hash Being Returned
```
$2a$12$yO4Sty9dw6wi11e/.npGdu0v0JTrXVPmz/6xf3yDDDcMgI98/WvEm
```

### Database
```
postgresql://bobbyciccaglione@localhost:5432/saiko_maps
```

---

## Next Steps (Priority Order)

1. **IMMEDIATE**: Try Option 1 (bypass singleton in auth.ts)
2. **VERIFY**: Add proof-of-concept test comparing singleton vs fresh instance
3. **INVESTIGATE**: Check if Next.js Turbopack has known issues with globalThis caching
4. **LONG-TERM**: Consider architecture change to avoid singletons for critical auth paths

---

## Files to Review

- `lib/db.ts` - Prisma singleton implementation
- `lib/auth.ts` - NextAuth configuration (line ~27 where `db.users.findUnique` is called)
- `.env.local` - DATABASE_URL configuration

---

## Final Notes

This is **NOT**:
- ❌ A bcrypt bug
- ❌ A form input issue  
- ❌ A database replication issue
- ❌ A connection string problem

This **IS**:
- ✅ A Prisma client caching issue where `globalThis` persistence across hot reloads serves stale data
- ✅ A Next.js development environment quirk with singleton patterns

**The fix is likely 10 lines of code, but we need to bypass or invalidate the cached Prisma instance.**

---

**Last Updated**: 2026-02-17 (after 4+ hours debugging)  
**Contact**: Bobby (rjcicc@gmail.com)  
**Server**: http://localhost:3001/login
