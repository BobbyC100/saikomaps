/**
 * Prisma Client — re-exports the canonical singleton from @/lib/db.
 * Prefer importing { db } from '@/lib/db' directly in new code.
 */

import { db } from '@/lib/db';

export const prisma = db;
