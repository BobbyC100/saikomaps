/**
 * HTML Fetcher Module
 * 
 * Handles HTTP requests with:
 * - Redirect following and finalUrl tracking
 * - Conditional GET (ETag/Last-Modified)
 * - User agent rotation
 * - Timeout handling
 * - Per-domain jitter delays
 * 
 * Design:
 * - Returns finalUrl after redirects
 * - Extracts relevant headers (ETag, Last-Modified, Content-Type)
 * - Simple error handling (no retries - handled at higher level)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FetchOptions {
  timeoutMs?: number;
  userAgent?: string;
  conditionalHeaders?: Record<string, string>;
}

export interface FetchResult {
  html: string | null;
  status: number;
  finalUrl: string;
  headers: Record<string, string>;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_TIMEOUT_MS = 15000;

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Generate jitter delay for per-domain politeness
 */
export function getJitterDelay(): number {
  return 500 + Math.random() * 700; // 500-1200ms
}

// ============================================================================
// DOMAIN DELAY TRACKING
// ============================================================================

const lastFetchByDomain = new Map<string, number>();

/**
 * Enforce per-domain delay with jitter
 */
export async function waitForDomain(url: string): Promise<void> {
  try {
    const domain = new URL(url).hostname;
    const lastFetch = lastFetchByDomain.get(domain) || 0;
    const now = Date.now();
    const elapsed = now - lastFetch;
    const jitter = getJitterDelay();
    
    if (elapsed < jitter) {
      await sleep(jitter - elapsed);
    }
    
    lastFetchByDomain.set(domain, Date.now());
  } catch {
    // Invalid URL, skip delay
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// FETCH IMPLEMENTATION
// ============================================================================

/**
 * Fetch HTML from URL with redirect handling
 * 
 * @param url - URL to fetch
 * @param opts - Fetch options
 * @returns Result with finalUrl after redirects
 */
export async function fetchHtml(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = opts.userAgent ?? getRandomUserAgent();
  
  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // Build headers
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
    };
    
    // Add conditional GET headers
    if (opts.conditionalHeaders) {
      Object.assign(headers, opts.conditionalHeaders);
    }
    
    const response = await fetch(normalizedUrl, {
      headers,
      signal: controller.signal,
      redirect: 'follow', // Automatic redirect following
    });
    
    clearTimeout(timeout);
    
    // Extract relevant response headers
    const responseHeaders: Record<string, string> = {};
    const headersToExtract = ['etag', 'last-modified', 'content-type', 'content-length'];
    for (const header of headersToExtract) {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders[header] = value;
      }
    }
    
    // Handle 304 Not Modified
    if (response.status === 304) {
      return {
        html: null,
        status: 304,
        finalUrl: response.url, // URL after redirects
        headers: responseHeaders,
      };
    }
    
    // Handle non-OK responses
    if (!response.ok) {
      return {
        html: null,
        status: response.status,
        finalUrl: response.url,
        headers: responseHeaders,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return {
        html: null,
        status: response.status,
        finalUrl: response.url,
        headers: responseHeaders,
        error: `Invalid content type: ${contentType}`,
      };
    }
    
    // Read HTML
    const html = await response.text();
    
    return {
      html,
      status: response.status,
      finalUrl: response.url, // URL after redirects
      headers: responseHeaders,
    };
    
  } catch (error) {
    clearTimeout(timeout);
    
    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        html: null,
        status: 0,
        finalUrl: normalizedUrl,
        headers: {},
        error: 'Request timed out',
      };
    }
    
    // Handle other errors
    return {
      html: null,
      status: 0,
      finalUrl: normalizedUrl,
      headers: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract domain from URL for concurrency control
 */
export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
