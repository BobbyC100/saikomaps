/**
 * Preload .env and .env.local before scripts run.
 * Use: node -r ./scripts/load-env.js ...
 * Ensures GOOGLE_PLACES_API_KEY etc. are set before any ESM imports.
 *
 * Canonical DB key: DATABASE_URL only (Prisma standard).
 * Wrapper's DATABASE_URL (set by db-neon.sh/db-local.sh) wins over .env files.
 * If DATABASE_URL is still missing after loading, fall back to NEON_DATABASE_URL and log.
 *
 * Load order: .env, then .env.local (override). If SAIKO_DB=neon, skip .env.local.
 * If SAIKO_DB_FROM_WRAPPER=1, wrapper already set DATABASE_URL; do not overwrite.
 */
const __EXISTING_DATABASE_URL__ = process.env.DATABASE_URL;
const saikoDb = process.env.SAIKO_DB;

require("dotenv").config({ path: ".env" });
if (saikoDb !== "neon") {
  require("dotenv").config({ path: ".env.local", override: true });
}
if (saikoDb === "neon") {
  try {
    require("dotenv").config({ path: ".env.vercel.prod", override: true });
  } catch (_) {}
}

if (__EXISTING_DATABASE_URL__) {
  process.env.DATABASE_URL = __EXISTING_DATABASE_URL__;
} else if (!process.env.DATABASE_URL && process.env.NEON_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
  console.warn("[load-env] DATABASE_URL was unset; using NEON_DATABASE_URL. Prefer setting DATABASE_URL or running via ./scripts/db-neon.sh\n");
}
