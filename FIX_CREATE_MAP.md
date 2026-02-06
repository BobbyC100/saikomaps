# FIX: Create map failing due to missing demo user

The create map API was using `userId: 'demo-user-id'` but that user didn't exist in the database, causing `lists_user_id_fkey` foreign key errors.

## Step 1: Run SQL in Supabase (for development)

Run this in **Supabase → SQL Editor** so the demo user exists:

```sql
INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
VALUES (
  'demo-user-id',
  'demo@saikomaps.com',
  'Demo User',
  'not-a-real-hash',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
```

Or run the project script: `scripts/create-demo-user.sql`

**After running this once:** in development you can **create maps without logging in**. The API uses `demo-user-id` when there’s no session and `NODE_ENV === 'development'`.

## Step 2: Create map API (done)

The API route `app/api/maps/route.ts`:

- Uses `getServerSession(authOptions)` when the user is logged in.
- **Dev fallback:** when not logged in and `NODE_ENV === 'development'`, uses `demo-user-id` (so run Step 1 SQL first).
- In production, returns `401 Unauthorized` if not logged in.

**To create a map:** in dev, run the SQL once then create maps without logging in. In production, users must log in.
