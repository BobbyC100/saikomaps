/**
 * About-page link discovery: same-domain, single hop, not PDF.
 */

import { ABOUT_PATTERNS } from "./constants";
import { resolveUrl, isSameDomainAllowed } from "./url";

export function findAboutLink(
  links: { href: string; text: string }[],
  baseUrl: string
): string | null {
  const baseOrigin = new URL(baseUrl).origin;
  const lower = (s: string) => s.toLowerCase();

  for (const { href, text } of links) {
    if (!isSameDomainAllowed(href, baseOrigin)) continue;
    const resolved = resolveUrl(href, baseUrl);
    const path = new URL(resolved).pathname.toLowerCase();
    if (path.endsWith(".pdf")) continue;
    const anchorText = lower(text);
    const pathSegments = path.replace(/^\/+|\/+$/g, "").split("/");
    const pathStr = pathSegments.join(" ");
    for (const pattern of ABOUT_PATTERNS) {
      if (anchorText.includes(pattern) || pathStr.includes(lower(pattern))) {
        return resolved;
      }
    }
  }
  return null;
}
