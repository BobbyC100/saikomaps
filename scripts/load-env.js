/**
 * Preload .env and .env.local before scripts run.
 * Use: node -r ./scripts/load-env.js ...
 * Ensures GOOGLE_PLACES_API_KEY etc. are set before any ESM imports.
 * Wrapper's DATABASE_URL (set by db-neon.sh/db-local.sh) wins over .env files.
 */
const __EXISTING_DATABASE_URL__ = process.env.DATABASE_URL;
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });
if (__EXISTING_DATABASE_URL__) {
  process.env.DATABASE_URL = __EXISTING_DATABASE_URL__;
}
