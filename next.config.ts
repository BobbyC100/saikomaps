import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Sentry uses the instrumentation hook — no other config needed
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI logs during build
  silent: !process.env.CI,

  // Upload source maps for readable stack traces in Sentry
  // Requires SENTRY_AUTH_TOKEN in env (optional — can add later)
  widenClientFileUpload: true,

  // Hide source maps from client bundles
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable Sentry telemetry
  disableLogger: true,
});
