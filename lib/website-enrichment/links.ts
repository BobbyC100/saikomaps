/**
 * Link signal extraction: menu, reservation, ordering, social.
 */

import {
  MENU_PATTERNS,
  RESERVATION_DOMAINS,
  ORDERING_DOMAINS,
  SOCIAL_DOMAINS,
} from "./constants";
import { resolveUrl, getOrigin, isSameDomainAllowed } from "./url";

function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function linkMatchesPatterns(href: string, text: string, patterns: string[]): boolean {
  const lower = (s: string) => s.toLowerCase();
  const h = lower(href);
  const t = lower(text);
  return patterns.some((p) => h.includes(p) || t.includes(p));
}

export interface LinkSignals {
  menu_url: string | null;
  reservation_provider: string | null;
  reservation_url: string | null;
  ordering_provider: string | null;
  ordering_url: string | null;
  social_links: Record<string, string>;
}

export function extractLinkSignals(
  links: { href: string; text: string }[],
  baseUrl: string
): LinkSignals {
  const baseOrigin = getOrigin(baseUrl) ?? "";
  const result: LinkSignals = {
    menu_url: null,
    reservation_provider: null,
    reservation_url: null,
    ordering_provider: null,
    ordering_url: null,
    social_links: {},
  };

  // Prefer same-domain menu; prefer /menu over PDF
  let menuCandidate: { url: string; isPdf: boolean } | null = null;
  for (const { href, text } of links) {
    if (!linkMatchesPatterns(href, text, MENU_PATTERNS)) continue;
    const resolved = resolveUrl(href, baseUrl);
    const sameDomain = isSameDomainAllowed(resolved, baseOrigin);
    const isPdf = resolved.toLowerCase().endsWith(".pdf");
    if (sameDomain && !menuCandidate) {
      menuCandidate = { url: resolved, isPdf };
    } else if (sameDomain && menuCandidate?.isPdf && !isPdf) {
      menuCandidate = { url: resolved, isPdf: false };
    } else if (!menuCandidate) {
      menuCandidate = { url: resolved, isPdf };
    }
  }
  if (menuCandidate) result.menu_url = menuCandidate.url;

  // Reservation: domain match
  for (const { href } of links) {
    const resolved = resolveUrl(href, baseUrl);
    const domain = getDomain(resolved);
    if (!domain) continue;
    for (const [d, provider] of Object.entries(RESERVATION_DOMAINS)) {
      if (domain === d || domain.endsWith("." + d)) {
        if (domain.includes("yelp") && !resolved.toLowerCase().includes("reservations"))
          continue;
        result.reservation_provider = provider;
        result.reservation_url = resolved;
        break;
      }
    }
    if (result.reservation_provider) break;
  }

  // Ordering (optional v1)
  for (const { href } of links) {
    const resolved = resolveUrl(href, baseUrl);
    const domain = getDomain(resolved);
    if (!domain) continue;
    for (const [d, provider] of Object.entries(ORDERING_DOMAINS)) {
      if (domain === d || domain.endsWith("." + d)) {
        result.ordering_provider = provider;
        result.ordering_url = resolved;
        break;
      }
    }
    if (result.ordering_provider) break;
  }

  // Social
  for (const { href } of links) {
    const resolved = resolveUrl(href, baseUrl);
    const domain = getDomain(resolved);
    if (!domain) continue;
    for (const [d, key] of Object.entries(SOCIAL_DOMAINS)) {
      if (domain === d || domain.endsWith("." + d)) {
        if (!result.social_links[key]) result.social_links[key] = resolved;
        break;
      }
    }
  }

  return result;
}
