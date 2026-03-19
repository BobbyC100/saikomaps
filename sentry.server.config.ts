/**
 * Sentry Server-Side Configuration
 * Captures API route errors, server component errors, and SSR failures.
 * Loaded automatically by @sentry/nextjs via the instrumentation hook.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: sample 10% of server transactions in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment tagging
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Only enable when DSN is present
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
});
