/**
 * URL Cache Module
 * 
 * Provides getOrFetch() interface for disk-based caching with TTL.
 * Handles cache keying, storage, and validation.
 * 
 * Design:
 * - Cache keyed by finalUrl (after redirects)
 * - Stores HTML, headers, metadata
 * - TTL-based expiration (default 7 days)
 * - Compact evidence storage
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface CacheEntry {
  html: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  cachedAt: string; // ISO timestamp
  etag?: string;
  lastModified?: string;
}

export interface GetOrFetchOptions {
  ttlDays?: number;
}

export interface GetOrFetchResult {
  html: string | null;
  status: number;
  fromCache: boolean;
  finalUrl: string;
  headers: Record<string, string>;
  error?: string;
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_DIR = path.join(__dirname, '../cache');
const DEFAULT_TTL_DAYS = 7;

/**
 * Generate cache key from URL
 * Uses domain + path hash for filesystem-safe naming
 */
function getCacheKey(url: string): string {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/\./g, '_');
    const pathHash = crypto.createHash('md5').update(parsed.pathname + parsed.search).digest('hex').slice(0, 8);
    return `${domain}__${pathHash}`;
  } catch {
    // Fallback: hash entire URL
    return crypto.createHash('md5').update(url).digest('hex');
  }
}

/**
 * Get cache file path for a URL
 */
function getCachePath(url: string): string {
  const key = getCacheKey(url);
  const domainDir = key.split('__')[0];
  const dir = path.join(CACHE_DIR, domainDir);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  return path.join(dir, `${key}.json`);
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry, ttlDays: number): boolean {
  const cachedAt = new Date(entry.cachedAt);
  const now = new Date();
  const ageMs = now.getTime() - cachedAt.getTime();
  const maxAgeMs = ttlDays * 24 * 60 * 60 * 1000;
  
  return ageMs < maxAgeMs;
}

/**
 * Read cache entry from disk
 */
function readCache(url: string): CacheEntry | null {
  const cachePath = getCachePath(url);
  
  if (!fs.existsSync(cachePath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(cachePath, 'utf-8');
    return JSON.parse(data) as CacheEntry;
  } catch (error) {
    console.warn(`Failed to read cache for ${url}:`, error);
    return null;
  }
}

/**
 * Write cache entry to disk
 */
function writeCache(url: string, entry: CacheEntry): void {
  const cachePath = getCachePath(url);
  
  try {
    fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), 'utf-8');
  } catch (error) {
    console.warn(`Failed to write cache for ${url}:`, error);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get cached response or fetch fresh if needed
 * 
 * This is the main interface. It:
 * 1. Checks cache validity
 * 2. Returns cached if valid
 * 3. Fetches fresh if expired/missing
 * 4. Stores finalUrl in cache for redirect handling
 * 
 * @param url - The URL to fetch
 * @param fetcher - Function that performs the actual HTTP fetch
 * @param opts - Options including TTL
 */
export async function getOrFetch(
  url: string,
  fetcher: (url: string, conditionalHeaders?: Record<string, string>) => Promise<{
    html: string | null;
    status: number;
    finalUrl: string;
    headers: Record<string, string>;
    error?: string;
  }>,
  opts: GetOrFetchOptions = {}
): Promise<GetOrFetchResult> {
  const ttlDays = opts.ttlDays ?? DEFAULT_TTL_DAYS;
  
  // Check cache first
  const cached = readCache(url);
  
  if (cached && isCacheValid(cached, ttlDays)) {
    // Cache hit!
    return {
      html: cached.html,
      status: cached.status,
      fromCache: true,
      finalUrl: cached.finalUrl,
      headers: cached.headers,
    };
  }
  
  // Cache miss or expired - fetch fresh
  // If we have cached ETag/Last-Modified, use conditional GET
  const conditionalHeaders: Record<string, string> = {};
  if (cached?.etag) {
    conditionalHeaders['If-None-Match'] = cached.etag;
  }
  if (cached?.lastModified) {
    conditionalHeaders['If-Modified-Since'] = cached.lastModified;
  }
  
  const result = await fetcher(url, conditionalHeaders);
  
  // If 304 Not Modified, refresh cache timestamp and return cached content
  if (result.status === 304 && cached) {
    const refreshedEntry: CacheEntry = {
      ...cached,
      cachedAt: new Date().toISOString(),
    };
    writeCache(url, refreshedEntry);
    
    return {
      html: cached.html,
      status: 200, // Return 200 to caller (content is valid)
      fromCache: true,
      finalUrl: cached.finalUrl,
      headers: cached.headers,
    };
  }
  
  // Store in cache if successful
  if (result.status === 200 && result.html) {
    const entry: CacheEntry = {
      html: result.html,
      finalUrl: result.finalUrl,
      status: result.status,
      headers: result.headers,
      cachedAt: new Date().toISOString(),
      etag: result.headers['etag'],
      lastModified: result.headers['last-modified'],
    };
    
    // Cache by finalUrl (after redirects) to prevent duplicate fetches
    writeCache(result.finalUrl, entry);
    
    // Also create alias mapping if URL changed
    if (result.finalUrl !== url) {
      writeCache(url, entry);
    }
  }
  
  return {
    html: result.html,
    status: result.status,
    fromCache: false,
    finalUrl: result.finalUrl,
    headers: result.headers,
    error: result.error,
  };
}

/**
 * Clear cache for a specific URL
 */
export function clearCache(url: string): void {
  const cachePath = getCachePath(url);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { files: number; sizeBytes: number } {
  if (!fs.existsSync(CACHE_DIR)) {
    return { files: 0, sizeBytes: 0 };
  }
  
  let files = 0;
  let sizeBytes = 0;
  
  const walk = (dir: string) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith('.json')) {
        files++;
        sizeBytes += stat.size;
      }
    }
  };
  
  walk(CACHE_DIR);
  
  return { files, sizeBytes };
}
