#!/usr/bin/env node
/**
 * Add prl_override column to places table.
 * Uses DATABASE_URL from .env + .env.local (same as dev server).
 * Run: node -r ./scripts/load-env.js scripts/add-prl-override-column.js
 */
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });
const { execSync } = require('child_process');
execSync('npx prisma db execute --schema=prisma/schema.prisma --stdin', {
  input: 'ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "prl_override" INTEGER;',
  stdio: ['pipe', 'inherit', 'inherit'],
  env: process.env,
});
console.log('prl_override column added (or already exists).');
