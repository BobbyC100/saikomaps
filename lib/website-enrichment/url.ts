/**
 * URL normalization and same-domain checks (SAIKO spec v1.1)
 */

const TRACKING_PARAM_PREFIXES = ["utm_", "gclid", "fbclid"];

/**
 * Normalize URL: strip fragment, remove tracking params, ensure valid.
 */
export function normalizeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return input.trim();
  }
  url.hash = "";
  const search = new URLSearchParams(url.search);
  for (const key of Array.from(search.keys())) {
    const lower = key.toLowerCase();
    if (TRACKING_PARAM_PREFIXES.some((p) => lower.startsWith(p))) {
      search.delete(key);
    }
  }
  url.search = search.toString();
  return url.toString();
}

/**
 * Return origin (protocol + host) for same-domain checks.
 */
export function getOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * True if href is same domain as baseOrigin, not external, not PDF.
 */
export function isSameDomainAllowed(
  href: string,
  baseOrigin: string
): boolean {
  try {
    const u = new URL(href, baseOrigin);
    if (u.origin !== baseOrigin) return false;
    const path = u.pathname.toLowerCase();
    if (path.endsWith(".pdf")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve href against base URL (for same-domain links).
 */
export function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}
