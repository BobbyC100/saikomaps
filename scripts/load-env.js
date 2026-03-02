/**
 * Preload .env.local for non-DB vars (e.g. GOOGLE_PLACES_API_KEY).
 *
 * v3.0: For DB selection, scripts must use config/env.ts + config/db.ts.
 * This file no longer sets DATABASE_URL — config/env validates and config/db provides connections.
 *
 * Use: node -r ./scripts/load-env.js ... (for scripts that need GOOGLE_PLACES_*, etc.)
 * Scripts that touch DB should import config/db (which triggers config/env validation).
 */
require('dotenv').config({ path: '.env.local' });
