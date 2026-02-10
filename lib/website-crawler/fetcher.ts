/**
 * Hybrid Website Fetcher
 * 
 * Fetches websites with:
 * - Parallel homepage + /about requests (fast path)
 * - Retry logic with exponential backoff
 * - User agent rotation
 * - Rate limiting between requests
 * - Timeout handling
 */

import { FetcherConfig, FetchResult } from './types';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_CONFIG: FetcherConfig = {
  requestDelayMs: 1500,      // Delay between requests
  batchSize: 20,             // Process in batches
  batchDelayMs: 5000,        // Delay between batches
  requestTimeoutMs: 10000,   // 10s timeout per request
  maxRetries: 2,
  retryDelayMs: 3000,
  userAgents: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  ],
};

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomUserAgent(config: FetcherConfig): string {
  return config.userAgents[Math.floor(Math.random() * config.userAgents.length)];
}

function normalizeUrl(url: string): string {
  // Ensure URL has protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  // Remove trailing slash for consistency
  return url.replace(/\/$/, '');
}

// ============================================================================
// CORE FETCH FUNCTION
// ============================================================================

/**
 * Fetch a single URL with retry logic
 */
export async function fetchWithRetry(
  url: string,
  config: FetcherConfig = DEFAULT_CONFIG,
  retries: number = config.maxRetries
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(config),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    // Check for blocked responses
    if (response.status === 403 || response.status === 401) {
      return {
        html: null,
        finalUrl: response.url,
        status: 'blocked',
        errorMessage: `HTTP ${response.status}: Access denied`,
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return {
      html,
      finalUrl: response.url,
      status: 'ok',
    };

  } catch (error) {
    clearTimeout(timeout);

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      if (retries > 0) {
        await sleep(config.retryDelayMs);
        return fetchWithRetry(url, config, retries - 1);
      }
      return {
        html: null,
        finalUrl: url,
        status: 'timeout',
        errorMessage: 'Request timed out after retries',
      };
    }

    // Retry on other errors
    if (retries > 0) {
      await sleep(config.retryDelayMs);
      return fetchWithRetry(url, config, retries - 1);
    }

    return {
      html: null,
      finalUrl: url,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// HYBRID FETCHER
// ============================================================================

export interface HybridFetchResult {
  homepage: FetchResult;
  aboutPage: FetchResult | null;
}

/**
 * Fetch homepage and attempt /about in parallel
 * 
 * Strategy:
 * 1. Fetch homepage and /about concurrently
 * 2. If direct /about works, use it
 * 3. If /about 404s, we'll discover the link from homepage
 * 
 * This minimizes latency while maintaining coverage.
 */
export async function fetchHybrid(
  websiteUrl: string,
  config: FetcherConfig = DEFAULT_CONFIG
): Promise<HybridFetchResult> {
  const baseUrl = normalizeUrl(websiteUrl);
  const aboutUrl = `${baseUrl}/about`;

  // Fetch both in parallel
  const [homepageResult, aboutResult] = await Promise.all([
    fetchWithRetry(baseUrl, config),
    fetchWithRetry(aboutUrl, config).catch(() => null), // /about is optional
  ]);

  // If direct /about got a 404, treat as not found (not an error)
  let aboutPage: FetchResult | null = aboutResult;
  if (aboutResult?.status === 'error' && aboutResult.errorMessage?.includes('404')) {
    aboutPage = null;
  }

  return {
    homepage: homepageResult,
    aboutPage: aboutPage?.status === 'ok' ? aboutPage : null,
  };
}

/**
 * Fetch a discovered page (menu, wine list, or about link)
 */
export async function fetchDiscoveredPage(
  url: string,
  config: FetcherConfig = DEFAULT_CONFIG
): Promise<FetchResult> {
  await sleep(config.requestDelayMs); // Rate limit
  return fetchWithRetry(url, config);
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process items in batches with delays
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  config: FetcherConfig = DEFAULT_CONFIG,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += config.batchSize) {
    const batch = items.slice(i, i + config.batchSize);
    
    for (let j = 0; j < batch.length; j++) {
      const globalIndex = i + j;
      const result = await processor(batch[j], globalIndex);
      results.push(result);
      
      onProgress?.(globalIndex + 1, items.length);
      
      // Delay between requests within batch
      if (j < batch.length - 1) {
        await sleep(config.requestDelayMs);
      }
    }
    
    // Delay between batches
    if (i + config.batchSize < items.length) {
      await sleep(config.batchDelayMs);
    }
  }
  
  return results;
}
