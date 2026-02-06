-- Create test data for Add Location feature
-- Run this in your Supabase SQL editor or with: psql $DATABASE_URL -f scripts/create-test-data.sql

-- Create test user
INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
VALUES (
  'test-user-123',
  'test@saikomaps.com',
  'Test User',
  'test-hash',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Create test list
INSERT INTO lists (id, user_id, title, subtitle, slug, intro_text, template_type, published, created_at, updated_at)
VALUES (
  'test-list-123',
  'test-user-123',
  'Test Guide',
  'A test guide for development',
  'test-guide',
  'This is a test guide for development purposes.',
  'city_guide',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  user_id = 'test-user-123',
  title = 'Test Guide',
  published = true;

-- Verify
SELECT 'Test data created!' as status;
SELECT id, email, name FROM users WHERE email = 'test@saikomaps.com';
SELECT id, slug, title FROM lists WHERE slug = 'test-guide';
