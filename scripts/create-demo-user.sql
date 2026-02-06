-- FIX: Create map failing due to missing demo user
-- The create map API used to use userId: 'demo-user-id' but that user didn't exist.
-- Step 1: Run this SQL in Supabase SQL Editor to unblock development.
-- For production: use real auth (login first); the API now uses session user.

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
