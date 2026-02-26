/**
 * Preload .env and .env.local before scripts run.
 * Use: node -r ./scripts/load-env.js ...
 * Ensures GOOGLE_PLACES_API_KEY etc. are set before any ESM imports.
 * Wrapper's DATABASE_URL (set by db-neon.sh/db-local.sh) wins over .env files.
 *
 * SAIKO_DB=neon → load .env only (Neon URL).
 * SAIKO_DB=local → load .env then .env.local (local URL wins).
 * Unset → .env then .env.local (override=true); existing DATABASE_URL from wrapper wins.
 */
const __EXISTING_DATABASE_URL__ = process.env.DATABASE_URL;
const saikoDb = process.env.SAIKO_DB;

if (saikoDb === "neon") {
  require("dotenv").config({ path: ".env" });
  // Optional: allow .env.vercel.prod to override DATABASE_URL for prod-like Neon
  try {
    require("dotenv").config({ path: ".env.vercel.prod", override: true });
  } catch (_) {}
} else if (saikoDb === "local") {
  require("dotenv").config({ path: ".env" });
  require("dotenv").config({ path: ".env.local", override: true });
} else {
  require("dotenv").config({ path: ".env" });
  require("dotenv").config({ path: ".env.local", override: true });
}

if (__EXISTING_DATABASE_URL__) {
  process.env.DATABASE_URL = __EXISTING_DATABASE_URL__;
}
