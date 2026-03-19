/**
 * Sentry Client-Side Configuration
 * Captures browser errors, unhandled rejections, and performance data.
 * Loaded automatically by @sentry/nextjs via the instrumentation hook.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: sample 10% of transactions in production, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay: capture 1% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
  ],

  // Environment tagging
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Filter noise: ignore common non-actionable browser errors
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection captured',
    /Loading chunk \d+ failed/,
    /Network request failed/,
  ],

  // Don't send PII by default
  sendDefaultPii: false,

  // Only enable in production or when DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
