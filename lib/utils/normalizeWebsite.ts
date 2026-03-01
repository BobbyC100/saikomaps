/**
 * Deterministic website normalization for Actor idempotency.
 * Canonical root only: https, no path, no www, lowercase hostname.
 *
 * Example: https://www.GjelinaGroup.com/about/ → https://gjelinagroup.com
 */

export function normalizeWebsite(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return input.trim();
  }

  url.protocol = "https";
  url.pathname = "";
  url.search = "";
  url.hash = "";
  url.username = "";
  url.password = "";

  let host = url.hostname.toLowerCase();
  if (host.startsWith("www.")) host = host.slice(4);

  return `https://${host}`;
}
