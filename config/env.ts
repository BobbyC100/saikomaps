/**
 * Typed environment validation for DB configuration.
 * Loads .env.local explicitly (only) — no .env fallback to avoid DB config ambiguity.
 * Validates DATABASE_URL and DB_ENV. Fails at startup if invalid.
 *
 * For production (Vercel): only DATABASE_URL is set; app uses lib/db with Prisma.
 * For local scripts using config/db: DATABASE_URL and DB_ENV are required.
 */

import { config } from 'dotenv';
import { z } from 'zod';

// Explicitly load only .env.local — avoid reintroducing .env ambiguity
config({ path: '.env.local' });

const envSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL must be set in .env.local' })
    .min(1, 'DATABASE_URL must be set in .env.local')
    .refine((u) => u.startsWith('postgres://') || u.startsWith('postgresql://'), {
      message: 'DATABASE_URL must be a postgres or postgresql URL',
    }),
  DB_ENV: z.enum(['dev', 'staging', 'prod'], {
    required_error: 'DB_ENV must be set in .env.local (dev|staging|prod)',
    invalid_type_error: 'DB_ENV must be dev | staging | prod',
  }),
});

/** Validated env for scripts (requires DATABASE_URL and DB_ENV in .env.local). */
export const env = envSchema.parse(process.env);
