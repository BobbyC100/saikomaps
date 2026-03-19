/**
 * Preload .env and .env.local before scripts run.
 * Use: node -r ./scripts/load-env.js ...
 *
 * Load order: .env (non-sensitive defaults), then .env.local (secrets, override).
 * If SAIKO_DB_FROM_WRAPPER=1, the wrapper script already set DATABASE_URL — don't overwrite.
 */
const __EXISTING_DATABASE_URL__ = process.env.DATABASE_URL;

require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });

// Wrapper scripts (db-neon.sh, db-local.sh) set DATABASE_URL before invoking.
// Restore it so the wrapper's explicit choice wins over .env.local.
if (__EXISTING_DATABASE_URL__) {
  process.env.DATABASE_URL = __EXISTING_DATABASE_URL__;
}
