/**
 * Pre-insert filter: drop nav/footer junk before creating OperatorPlaceCandidate rows.
 * Silent drop — no logging for Phase 2.
 */

import type { VenueFound } from "@/lib/website-enrichment/operator-extract";

const URL_PATH_NOISE = [
  "privacy",
  "terms",
  "careers",
  "contact",
  "about",
  "gift",
  "events",
  "catering",
  "reservations",
] as const;

const NAME_NOISE_EXACT = ["learn more", "view details", "click here"] as const;

/** Returns true if venue is nav/footer junk and should be dropped. */
export function isVenueNoise(venue: VenueFound): boolean {
  // 1) URL-based filters
  const url = venue.url;
  if (url) {
    const lower = url.toLowerCase();
    if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return true;
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.toLowerCase();
      if (URL_PATH_NOISE.some((p) => path.includes(p))) return true;
    } catch {
      // Invalid URL — continue to name checks
    }
  }

  // 2) Name-based filters
  const name = venue.name.trim();
  if (name.includes("{") || name.includes("}")) return true;
  if (name.includes(".cls-")) return true;
  if (NAME_NOISE_EXACT.some((n) => name.toLowerCase() === n)) return true;

  return false;
}
