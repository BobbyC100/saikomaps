/**
 * Preload .env and .env.local before scripts run.
 * Use: node -r ./scripts/load-env.js ...
 * Ensures GOOGLE_PLACES_API_KEY etc. are set before any ESM imports.
 */
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });
if (!process.env.GOOGLE_PLACES_API_KEY && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
  process.env.GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}
if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && process.env.GOOGLE_PLACES_API_KEY) {
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
}
