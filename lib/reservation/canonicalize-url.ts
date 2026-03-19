/**
 * Reservation URL canonicalization.
 *
 * Strips session/tracking/date params, keeps stable identifiers.
 * Produces a clean, reusable booking URL.
 */

import { RESERVATION_URL_STRIP_PARAMS } from "../website-enrichment/constants";

export function canonicalizeReservationUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const param of [...url.searchParams.keys()]) {
      if (RESERVATION_URL_STRIP_PARAMS.has(param.toLowerCase())) {
        url.searchParams.delete(param);
      }
    }
    // Remove trailing ? if no params remain
    let result = url.toString();
    if (result.endsWith("?")) result = result.slice(0, -1);
    return result;
  } catch {
    return raw; // malformed URL — return as-is
  }
}
