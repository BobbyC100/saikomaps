#!/usr/bin/env node
/**
 * Test PostgreSQL connection - helps find the right DATABASE_URL for local Postgres
 * Run: node scripts/test-db-connection.js
 */
const { execSync } = require('child_process');
const os = require('os');

const user = os.userInfo().username;

const urls = [
  `postgresql://localhost:5432/saiko_maps`,
  `postgresql://${user}@localhost:5432/saiko_maps`,
  `postgresql://postgres@localhost:5432/saiko_maps`,
];

console.log('Testing PostgreSQL connection (Postgres.app / local)...\n');

for (const url of urls) {
  process.stdout.write(`  ${url} ... `);
  try {
    execSync('npx prisma db pull --force', {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
    console.log('✅ OK');
    console.log(`\nUse this in your .env:\nDATABASE_URL="${url}"\n`);
    process.exit(0);
  } catch {
    console.log('❌');
  }
}

console.log('\n❌ None of the URLs worked.');
console.log('   - Ensure Postgres.app is running');
console.log('   - Create the database first (in Postgres.app: open psql, run CREATE DATABASE saiko_maps;)');
console.log('   - Or use Supabase connection string from dashboard\n');
