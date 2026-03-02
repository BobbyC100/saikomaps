/**
 * Connection abstraction layer.
 * Single canonical Prisma client using env.DATABASE_URL.
 * No script may read process.env.DATABASE_URL directly.
 */

import { PrismaClient } from '@prisma/client';
import { assertDbTargetAllowed } from '@/lib/db-guard';
import { env } from './env';

// Guard runs once before any DB usage
assertDbTargetAllowed();

const client = new PrismaClient({
  datasourceUrl: env.DATABASE_URL,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export const db = {
  migration: client,
  admin: client,
  app: client,
  ingestion: client,
} as const;
