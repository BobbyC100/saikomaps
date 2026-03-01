/**
 * Fetch with spec limits: 1.5MB max, 5s timeout, max 3 redirects, optional robots check.
 */

import { MAX_HTML_BYTES, FETCH_TIMEOUT_MS, MAX_REDIRECTS } from "./constants";
import type { FetchResult } from "./types";
import { getOrigin } from "./url";

async function fetchRobotsTxt(origin: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${origin}/robots.txt`, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "SaikoMapsBot/1.0 (merchant enrichment)" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

/**
 * Simple check: if path is disallowed by robots.txt we skip. No crawler delay parsing.
 */
function isPathDisallowed(robotsTxt: string, path: string, userAgent: string): boolean {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim().toLowerCase());
  let inRelevantGroup = false;
  for (const line of lines) {
    if (line.startsWith("user-agent:")) {
      const ua = line.slice(11).trim();
      inRelevantGroup = ua === "*" || userAgent.toLowerCase().includes(ua);
      continue;
    }
    if (inRelevantGroup && line.startsWith("disallow:")) {
      const disallowPath = line.slice(9).trim();
      if (!disallowPath) continue;
      const pattern = disallowPath.replace(/\*/g, ".*");
      const re = new RegExp(`^${pattern}`);
      if (re.test(path)) return true;
    }
  }
  return false;
}

export interface FetchOptions {
  respectRobots?: boolean;
  userAgent?: string;
}

/**
 * Fetch URL with size limit and timeout. Follows redirects (browser default is typically 20; we cap at MAX_REDIRECTS by counting).
 */
export async function fetchWithLimits(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const { respectRobots = true, userAgent = "SaikoMapsBot/1.0 (merchant enrichment)" } = options;
  const origin = getOrigin(url);
  if (origin && respectRobots) {
    const robots = await fetchRobotsTxt(origin);
    if (robots) {
      const path = new URL(url).pathname || "/";
      if (isPathDisallowed(robots, path, userAgent)) {
        return {
          url,
          finalUrl: url,
          status: 403,
          html: "",
          contentType: null,
        };
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let redirectCount = 0;
  let currentUrl = url;

  try {
    while (redirectCount <= MAX_REDIRECTS) {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": userAgent },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (location && redirectCount < MAX_REDIRECTS) {
          currentUrl = new URL(location, currentUrl).toString();
          redirectCount++;
          continue;
        }
      }

      clearTimeout(timeoutId);
      const contentType = res.headers.get("content-type") ?? null;
      if (!res.ok || !contentType?.toLowerCase().includes("text/html")) {
        return {
          url,
          finalUrl: currentUrl,
          status: res.status,
          html: "",
          contentType,
        };
      }

      const reader = res.body?.getReader();
      if (!reader) {
        return {
          url,
          finalUrl: currentUrl,
          status: res.status,
          html: "",
          contentType,
        };
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      let done = false;
      while (!done && total < MAX_HTML_BYTES) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          chunks.push(value);
          total += value.length;
          if (total > MAX_HTML_BYTES) break;
        }
      }
      reader.cancel();

      const decoder = new TextDecoder("utf-8", { fatal: false });
      const combined = chunks.length === 1 ? chunks[0] : concatChunks(chunks);
      const htmlFinal = decoder.decode(combined);

      return {
        url,
        finalUrl: currentUrl,
        status: res.status,
        html: htmlFinal,
        contentType,
      };
    }

    clearTimeout(timeoutId);
    return {
      url,
      finalUrl: currentUrl,
      status: 310,
      html: "",
      contentType: null,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    const isAbort = (e as Error).name === "AbortError";
    return {
      url,
      finalUrl: null,
      status: isAbort ? 408 : 500,
      html: "",
      contentType: null,
    };
  }
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
