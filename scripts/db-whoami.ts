#!/usr/bin/env node
/**
 * DB sanity check: print connection target and confirm schema (tables/columns).
 * Uses config/env — requires .env.local with DATABASE_URL and DB_ENV (dev|staging|prod).
 *
 * Usage: npm run db:whoami
 *        ./scripts/db-neon.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/db-whoami.ts
 */

import { env } from '@/config/env';
import { db } from '@/config/db';

function parseDatabaseUrl(url: string | undefined): { host: string; database: string } {
  if (!url || typeof url !== 'string') return { host: '', database: '' };
  try {
    const raw = url.trim().replace(/^["']|["']$/g, '');
    const match = raw.match(/@([^/:@]+)(?::\d+)?(?:\/([^?]*))?/);
    const hostPart = match?.[1] ?? '';
    const dbPart = match?.[2] ?? '';
    const host = hostPart.trim();
    const database = dbPart.split('?')[0].trim() || '';
    return { host, database };
  } catch {
    return { host: '', database: '' };
  }
}

async function main() {
  const url = env.DATABASE_URL;
  const { host, database } = parseDatabaseUrl(url);

  console.log('--- DB whoami ---');
  console.log('DB_ENV:', env.DB_ENV);
  console.log('host:', host || '(unparseable)');
  console.log('database:', database || '(unparseable)');

  const prisma = db.admin;
  try {
    const row = await prisma.$queryRaw<[{ current_database: string; current_schema: string }]>`
      SELECT current_database() AS "current_database", current_schema() AS "current_schema"
    `;
    const dbName = row[0]?.current_database ?? '?';
    const schemaName = row[0]?.current_schema ?? '?';
    console.log('current_database():', dbName);
    console.log('current_schema():', schemaName);

    const tables = await prisma.$queryRaw<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'places'
      ) AS exists
    `;
    const placesExists = tables[0]?.exists ?? false;
    console.log('public.places exists:', placesExists);

    const grCol = await prisma.$queryRaw<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'golden_records' AND column_name = 'match_confidence'
      ) AS exists
    `;
    const matchConfidenceExists = grCol[0]?.exists ?? false;
    console.log('golden_records.match_confidence exists:', matchConfidenceExists);

    const placeConf = await prisma.$queryRaw<[{ overall: boolean; confidence: boolean }]>`
      SELECT
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'places' AND column_name = 'overall_confidence') AS overall,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'places' AND column_name = 'confidence') AS confidence
    `;
    const p = placeConf[0];
    console.log('places.overall_confidence exists:', p?.overall ?? false);
    console.log('places.confidence exists:', p?.confidence ?? false);
    console.log('---');
  } catch (e) {
    console.error('Query failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
