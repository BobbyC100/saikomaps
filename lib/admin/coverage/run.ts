/**
 * Data Coverage Audit — Query Runner
 * Executes SQL queries using Prisma's raw query interface
 */

import { db } from '@/lib/db';

/**
 * Run a query that returns a single row
 */
export async function runOne<T>(sql: string): Promise<T> {
  const rows = await db.$queryRawUnsafe<T[]>(sql);
  return rows[0];
}

/**
 * Run a query that returns multiple rows
 */
export async function runMany<T>(sql: string): Promise<T[]> {
  return db.$queryRawUnsafe<T[]>(sql);
}
