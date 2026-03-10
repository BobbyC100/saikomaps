# Password Reset Instructions

## ✅ Step 1: Hash Generated

**New Password**: `NewStrongPassword123!`

**Hash** (copy this):
```
$2a$10$FMwGg.Fwj3RzJvRxJljQRuwg.boMa4N.wI0FtyhALhbDFHI29Re7u
```

---

## ✅ Step 2: Prisma Studio is Running

**URL**: http://localhost:5555

### Update Password in Prisma Studio:

1. **Open**: http://localhost:5555 in your browser

2. **Click**: `users` table (left sidebar)

3. **Find**: The row where `email` = `rjcicc@gmail.com`

4. **Click**: On that row to edit it

5. **Find the field**: `passwordHash`

6. **Paste this value**:
   ```
   $2a$10$FMwGg.Fwj3RzJvRxJljQRuwg.boMa4N.wI0FtyhALhbDFHI29Re7u
   ```

7. **Click**: "Save 1 change" button (green button at top)

---

## Alternative: Direct SQL Update

If you prefer SQL, run this:

```bash
# Connect to your local database
psql postgresql://bobbyciccaglione@localhost:5432/saiko_maps

# Then run:
UPDATE users
SET password_hash = '$2a$10$FMwGg.Fwj3RzJvRxJljQRuwg.boMa4N.wI0FtyhALhbDFHI29Re7u'
WHERE email = 'rjcicc@gmail.com';

# Verify:
SELECT email, password_hash IS NOT NULL as has_password FROM users WHERE email = 'rjcicc@gmail.com';

# Exit:
\q
```

---

## ✅ Step 3: Test Login

Once password is updated:

1. **Go to**: http://localhost:3001/login

2. **Log in with**:
   - Email: `rjcicc@gmail.com`
   - Password: `NewStrongPassword123!`

3. **If successful**:
   - You'll be redirected to dashboard
   - Then get your session cookie for testing

---

## Troubleshooting

**If login fails**, check:

1. **Server logs**: Check terminal for errors
   ```bash
   tail -20 /Users/bobbyciccaglione/.cursor/projects/Users-bobbyciccaglione-code-saiko-maps/terminals/322858.txt
   ```

2. **Verify password was saved**:
   - Go back to Prisma Studio
   - Check the `passwordHash` field still has the value
   - Should start with `$2a$10$`

3. **Check if user exists**:
   ```bash
   # In Prisma Studio, filter users by email:
   # email = "rjcicc@gmail.com"
   ```

---

## Summary

**Generated Hash**:
```
$2a$10$FMwGg.Fwj3RzJvRxJljQRuwg.boMa4N.wI0FtyhALhbDFHI29Re7u
```

**Prisma Studio**: http://localhost:5555  
**Login Page**: http://localhost:3001/login  
**New Password**: `NewStrongPassword123!`

**Next**: After updating in Prisma Studio, try logging in!
