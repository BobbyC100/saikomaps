# Login Issue - Debug Summary

## Problem Statement
User cannot log in despite having valid credentials in the database. The login form submits but authentication fails.

## Environment
- **Dev Server**: http://localhost:3001
- **User Email**: `rjcicc@gmail.com`
- **Password**: `NewStrongPassword123!`
- **NextAuth Provider**: CredentialsProvider with bcryptjs

## What We Know

### 1. Database State ✅
- User exists in database with email `rjcicc@gmail.com`
- Password hash is present and correctly formatted
- Hash was generated fresh using: `await hash('NewStrongPassword123!', 10)`
- Hash verified immediately after generation: `await compare(password, hash)` returns `true`

### 2. Server Logs Show Consistent Failure
```
[AUTH] Authorize called with email: rjcicc@gmail.com
[AUTH] User found: true
[AUTH] User has passwordHash: true
[AUTH] Password valid: false
[AUTH] Password comparison failed
POST /api/auth/callback/credentials 401 in 251ms
```

**Key Issue**: `bcryptjs.compare(credentials.password, user.passwordHash)` returns `false` during login, even though the same comparison succeeds in standalone tests.

### 3. Standalone Tests Pass ✅
When testing the same hash and password outside the auth flow:
```bash
# This works correctly
npx tsx -e "
  const { compare } = require('bcryptjs');
  const result = await compare(
    'NewStrongPassword123!',
    '\$2a\$10\$CX8ndx97Bis8inS/Xvft6.Q9CTYg7Hh2N8dkQRWlCdes3ou60dtuu'
  );
  console.log(result); // true
"
```

### 4. Auth Configuration
**File**: `lib/auth.ts`

```typescript
CredentialsProvider({
  name: 'credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    // Logs show this is being called
    const user = await db.users.findUnique({
      where: { email: credentials.email }
    });
    
    const valid = await compare(credentials.password, user.passwordHash);
    // This returns false ❌
    
    if (!valid) return null;
    
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? '',
    };
  }
})
```

### 5. Recent Changes
- Added `redirect` callback to auth config to handle post-login navigation
- Added extensive debug logging to track auth flow
- Generated fresh password hash using `scripts/reset-password.ts`

## Theories to Investigate

### Theory 1: Password Encoding Issue
The password typed in the login form might be getting encoded/transformed differently than the literal string we're testing with.

**Test**: Add logging to see exact password bytes received:
```typescript
console.log('[AUTH] Password length:', credentials.password.length);
console.log('[AUTH] Password chars:', credentials.password.split('').map(c => c.charCodeAt(0)));
```

### Theory 2: bcryptjs Version Mismatch
Different versions of bcryptjs might have compatibility issues.

**Check**: 
```bash
npm list bcryptjs
# Verify same version used in auth.ts and reset-password.ts
```

### Theory 3: Async/Database Context Issue
The `user.passwordHash` retrieved from Prisma might have whitespace or encoding issues.

**Test**:
```typescript
console.log('[AUTH] Hash length:', user.passwordHash.length);
console.log('[AUTH] Hash trim match:', user.passwordHash === user.passwordHash.trim());
console.log('[AUTH] Hash bytes:', Buffer.from(user.passwordHash).length);
```

### Theory 4: Hot Reload Cache
The dev server might be using cached auth module that doesn't reflect latest changes.

**Action**: Already tried restarting server multiple times. May need to clear `.next` cache:
```bash
rm -rf .next
npm run dev
```

## Files Modified During Debug Session
1. `lib/auth.ts` - Added debug logging, added redirect callback
2. `scripts/create-admin-user.ts` - Created to seed admin user
3. `scripts/reset-password.ts` - Created to regenerate hash
4. `.env.local` - Added `NEXTAUTH_SECRET` and `ADMIN_EMAILS`

## Next Steps for CTO

1. **Add detailed password logging** to see exact bytes being compared:
   ```typescript
   console.log('Password:', JSON.stringify(credentials.password));
   console.log('Hash:', JSON.stringify(user.passwordHash));
   ```

2. **Test with simpler password** like `test1234` to rule out special character issues with `!`

3. **Check bcryptjs installation**:
   ```bash
   npm list bcryptjs
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Try bcrypt native** instead of bcryptjs to rule out library issue:
   ```bash
   npm uninstall bcryptjs
   npm install bcrypt
   # Update imports from 'bcryptjs' to 'bcrypt'
   ```

5. **Verify Prisma schema** - check if `passwordHash` field has any constraints or transformations

6. **Check for middleware interference** - temporarily disable `middleware.ts` to rule out request transformation

## Current Hash in Database
```
$2a$10$CX8ndx97Bis8inS/Xvft6.Q9CTYg7Hh2N8dkQRWlCdes3ou60dtuu
```

This hash is for password: `NewStrongPassword123!`

## Environment Variables Required
```env
NEXTAUTH_SECRET=<generated-with-openssl>
NEXTAUTH_URL=http://localhost:3001
ADMIN_EMAILS=rjcicc@gmail.com
DATABASE_URL=<postgres-connection-string>
```

---

**Last Updated**: 2026-02-17
**Status**: Login failing with 401, bcrypt.compare returns false in auth flow but true in standalone tests
