# CRITICAL: Login Authentication Issue - CTO Handoff

**Date**: 2026-02-17  
**Priority**: HIGH - Blocking development/testing  
**Status**: UNRESOLVED after multiple hours of debugging

---

## Problem Statement

User `rjcicc@gmail.com` cannot log in to the application. Authentication consistently fails with "Invalid email or password" despite valid credentials being in the database.

---

## The Mystery: Hash Mismatch Between Script and Runtime

### What We Know For Certain

1. **The database query returns the WRONG hash at runtime**
   - Script query (works): Returns hash `$2a$10$0aQl5uD7Y0yh3FqQNYDLkeoGHkle6MEB.gY6O4Hf99QTimkXZeaw6`
   - Auth flow query (fails): Returns hash `$2a$12$yO4Sty9dw6wi11e/.npGdu0v0JTrXVPmz/6xf3yDDDcMgI98/WvEm`
   - **These are completely different hashes from the same email query!**

2. **Both scripts use the same DATABASE_URL**
   ```bash
   DATABASE_URL="postgresql://neondb_owner:npg_82owEOWzQguI@ep-spring-sun-aiht1nns-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
   ```

3. **The password being entered is correct**
   ```
   [AUTH] password raw: "NewStrongPassword123" len: 20
   [AUTH] password charCodes: [78, 101, 119, 83, 116, 114, ...] ✅
   ```

4. **The hardcoded password test ALSO fails**
   ```
   [AUTH] hardcodedOk: false typedOk: false
   ```
   This proves it's not a form input issue - even `compare("NewStrongPassword123!", hash)` returns false.

5. **The old hash ($2a$12$) is from a previous password that we don't know**

---

## Root Cause Theories

### Theory #1: Multiple Database Connections (MOST LIKELY)
The Neon pooler might be routing different connections to different database instances or read replicas with stale data.

**Evidence**:
- Same connection string returns different hashes
- Neon uses connection pooling (`-pooler` in URL)
- Could be hitting a read replica with replication lag

**Test**:
```bash
# Query the database directly 5 times and see if hash changes
for i in {1..5}; do
  DATABASE_URL="postgresql://..." npx tsx -e "
    import { PrismaClient } from '@prisma/client';
    const p = new PrismaClient();
    const u = await p.users.findUnique({ where: { email: 'rjcicc@gmail.com' }});
    console.log('Attempt', $i, ':', u?.passwordHash?.slice(0, 15));
    await p.\$disconnect();
  "
done
```

**Fix if this is the cause**:
- Use the direct (non-pooled) connection string instead of `-pooler` for writes
- Add `?pgbouncer=true` to connection string
- Or force connection routing: `?options=-c%20search_path%3Dpublic`

### Theory #2: Prisma Connection Caching
Prisma Client might be caching the database connection or query results despite server restarts.

**Evidence**:
- Server restart didn't pick up new hash
- Cleared `.next` cache and ran `prisma generate` - still old hash
- The Prisma instance in the auth module might be initialized once and reused

**Test**:
Add to `lib/auth.ts` before the query:
```typescript
await db.$executeRawUnsafe('SELECT pg_sleep(0.1)'); // Force new query
const user = await db.users.findUnique({
  where: { email },
});
console.log('[AUTH] Direct query hash:', user?.passwordHash);
```

**Fix if this is the cause**:
- Call `await db.$disconnect()` after password update
- Use `@prisma/client/runtime` to clear query cache
- Restart the entire Next.js process (not just server)

### Theory #3: Multiple Users in Database
There might be duplicate users or the email is not unique.

**Test**:
```sql
SELECT id, email, left(password_hash, 15) as hash_prefix, created_at 
FROM users 
WHERE email = 'rjcicc@gmail.com'
ORDER BY created_at DESC;
```

**Fix if this is the cause**:
- Delete duplicate users
- Add unique constraint to email field

### Theory #4: Prisma Schema Field Mapping Issue
The `passwordHash` field might be mapped to the wrong column or have transformations.

**Check `prisma/schema.prisma`**:
```prisma
model users {
  // ... other fields ...
  passwordHash String? @map("password_hash")  // ← Verify this mapping
}
```

---

## Critical Evidence From Logs

### Latest Auth Attempt
```
[AUTH] credentials keys: [ 'email', 'password', 'redirect', 'csrfToken', 'callbackUrl', 'json' ]
[AUTH] email raw: "rjcicc@gmail.com" len: 16 ✅
[AUTH] password raw: "NewStrongPassword123" len: 20 ✅
[AUTH] password charCodes: [78, 101, 119, 83, ...] ✅
[AUTH] User found: true ✅
[AUTH] hash raw: "$2a$12$yO4Sty9dw6wi11e/.npGdu0v0JTrXVPmz/6xf3yDDDcMgI98/WvEm" len: 60 ❌ WRONG HASH
[AUTH] hash trimmed same: true ✅
[AUTH] hash prefix: $2a$12$ ❌ WRONG PREFIX (should be $2a$10$)
[AUTH] hardcodedOk: false typedOk: false ❌ BOTH FAIL
```

### Latest Script Query (same connection string)
```bash
$ DATABASE_URL="postgresql://neondb_owner:npg_82owEOWzQguI@..." npx tsx -e "..."

Hash in Neon DB:
$2a$10$0aQl5uD7Y0yh3FqQNYDLkeoGHkle6MEB.gY6O4Hf99QTimkXZeaw6 ✅ CORRECT HASH
Prefix: $2a$10$ ✅ CORRECT PREFIX
```

**CONCLUSION**: Same query, same connection string, different results = connection routing or caching issue.

---

## Environment Details

### Database Configuration
```env
# .env (loaded first)
DATABASE_URL="postgresql://neondb_owner:npg_82owEOWzQguI@ep-spring-sun-aiht1nns-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# .env.local (should override but might not for Prisma)
DATABASE_URL="postgresql://bobbyciccaglione@localhost:5432/saiko_maps"
```

**Issue**: Both files have DATABASE_URL. Script uses Neon, dev server startup logs show both files loaded:
```
[dotenv] injecting env (1) from .env
[dotenv] injecting env (11) from .env.local
```

The order matters - if `.env.local` doesn't override properly, Prisma might use `.env` for some queries and `.env.local` for others.

### Correct Credentials
- **Email**: `rjcicc@gmail.com`
- **Password**: `NewStrongPassword123` (no exclamation mark)
- **Expected Hash**: `$2a$10$0aQl5uD7Y0yh3FqQNYDLkeoGHkle6MEB.gY6O4Hf99QTimkXZeaw6`
- **Actual Hash in Auth Flow**: `$2a$12$yO4Sty9dw6wi11e/.npGdu0v0JTrXVPmz/6xf3yDDDcMgI98/WvEm`

---

## Immediate Action Required

### Step 1: Verify Single Source of Truth
Remove the duplicate DATABASE_URL to eliminate confusion:

```bash
# In .env.local, comment out or remove DATABASE_URL
# Let .env be the only source
```

Then restart EVERYTHING:
```bash
lsof -ti:3001 | xargs kill -9
rm -rf .next node_modules/.prisma
npx prisma generate
npm run dev
```

### Step 2: Query Database Directly
Use a SQL client to verify exactly what's in the database:

```sql
SELECT 
  id,
  email,
  password_hash,
  created_at,
  updated_at
FROM users 
WHERE email = 'rjcicc@gmail.com';
```

If the hash is `$2a$12$yO4Sty9d...` then our script is NOT actually updating the right database.

### Step 3: Force Update Via Direct SQL
If the issue persists, bypass Prisma entirely:

```bash
# Generate the correct hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('NewStrongPassword123', 10).then(console.log)"

# Copy the output hash, then:
psql "postgresql://neondb_owner:..." -c "
UPDATE users 
SET password_hash = '<paste-hash-here>' 
WHERE email = 'rjcicc@gmail.com';
SELECT password_hash FROM users WHERE email = 'rjcicc@gmail.com';
"
```

### Step 4: Check for Neon Replication Lag
In Neon console, check:
- Database status/health
- Any read replicas configured
- Connection pooler settings
- Recent migrations or schema changes

---

## Files Modified During Debug Session

1. `lib/auth.ts` - Added extensive diagnostic logging
2. `scripts/create-admin-user.ts` - User creation script
3. `scripts/reset-password.ts` - Password reset script
4. `.env.local` - Added NEXTAUTH_SECRET, ADMIN_EMAILS

---

## Next Steps Priority Order

1. **VERIFY DATABASE STATE** - Manually query Neon to see actual hash
2. **ELIMINATE .env CONFUSION** - Use only one DATABASE_URL
3. **TRY DIRECT CONNECTION** - Use non-pooled Neon connection string
4. **CHECK FOR DUPLICATES** - Ensure only one user with that email
5. **SQL DIRECT UPDATE** - Bypass Prisma if needed

---

## Contact Info

- **User Email**: rjcicc@gmail.com
- **Dev Server**: http://localhost:3001
- **Database**: Neon PostgreSQL (pooled connection)

---

## Attachments

- Full diagnostic logs: Available in terminal output
- Auth configuration: `lib/auth.ts`
- Environment files: `.env`, `.env.local`

**This is NOT a bcrypt bug. This is NOT a form input bug. This is a database connection routing or caching issue where different queries return different data from what should be the same row.**
