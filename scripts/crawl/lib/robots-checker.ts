/**
 * Robots.txt Checker Module
 * 
 * Simple "best effort" robots.txt checking:
 * - Fetch once per domain
 * - Check for User-agent: * with Disallow: /
 * - If fetch fails, treat as "unknown" and proceed
 * - Cache results in memory
 * 
 * Design:
 * - Minimal parsing (only check for blanket disallow)
 * - Non-blocking (failures don't stop crawling)
 * - Domain-level caching
 */

// ============================================================================
// TYPES
// ============================================================================

export type RobotsStatus = 'allowed' | 'disallowed' | 'unknown';

export interface RobotsCheckResult {
  status: RobotsStatus;
  reason: string;
}

// ============================================================================
// CACHE
// ============================================================================

const robotsCache = new Map<string, RobotsCheckResult>();

// ============================================================================
// ROBOTS.TXT PARSING
// ============================================================================

/**
 * Check if robots.txt disallows all crawling
 * 
 * Simple check for:
 *   User-agent: *
 *   Disallow: /
 * 
 * This catches only the most explicit "don't crawl" signals.
 */
function parseRobotsTxt(content: string): RobotsCheckResult {
  const lines = content.split('\n').map(l => l.trim().toLowerCase());
  
  let inUserAgentWildcard = false;
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith('#') || line === '') {
      continue;
    }
    
    // Check for User-agent: *
    if (line.startsWith('user-agent:')) {
      const agent = line.substring('user-agent:'.length).trim();
      inUserAgentWildcard = agent === '*';
      continue;
    }
    
    // If we're in User-agent: *, check for Disallow: /
    if (inUserAgentWildcard && line.startsWith('disallow:')) {
      const path = line.substring('disallow:'.length).trim();
      if (path === '/' || path === '/*') {
        return {
          status: 'disallowed',
          reason: 'robots.txt has User-agent: * / Disallow: /',
        };
      }
    }
    
    // Reset if we hit a new User-agent that's not *
    if (line.startsWith('user-agent:') && !line.includes('*')) {
      inUserAgentWildcard = false;
    }
  }
  
  return {
    status: 'allowed',
    reason: 'robots.txt does not block User-agent: *',
  };
}

/**
 * Fetch robots.txt for a domain
 */
async function fetchRobotsTxt(domain: string): Promise<string | null> {
  const robotsUrl = `https://${domain}/robots.txt`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'SaikoBot/1.0 (https://saiko.com; contact@saiko.com)',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.text();
  } catch (error) {
    return null;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if URL is allowed by robots.txt
 * 
 * @param url - URL to check
 * @returns Result with status and reason
 */
export async function checkRobots(url: string): Promise<RobotsCheckResult> {
  let domain: string;
  
  try {
    domain = new URL(url).hostname;
  } catch {
    return {
      status: 'unknown',
      reason: 'Invalid URL',
    };
  }
  
  // Check cache
  if (robotsCache.has(domain)) {
    return robotsCache.get(domain)!;
  }
  
  // Fetch robots.txt
  const robotsContent = await fetchRobotsTxt(domain);
  
  let result: RobotsCheckResult;
  
  if (!robotsContent) {
    // Fetch failed - treat as unknown and proceed
    result = {
      status: 'unknown',
      reason: 'robots.txt not found or fetch failed',
    };
  } else {
    // Parse and check
    result = parseRobotsTxt(robotsContent);
  }
  
  // Cache result
  robotsCache.set(domain, result);
  
  return result;
}

/**
 * Pre-warm cache for multiple domains
 * Useful for batch processing
 */
export async function checkRobotsBatch(urls: string[]): Promise<Map<string, RobotsCheckResult>> {
  const domains = new Set<string>();
  
  for (const url of urls) {
    try {
      domains.add(new URL(url).hostname);
    } catch {
      // Skip invalid URLs
    }
  }
  
  // Check all domains in parallel
  const checks = Array.from(domains).map(async domain => {
    const url = `https://${domain}`;
    const result = await checkRobots(url);
    return { domain, result };
  });
  
  const results = await Promise.all(checks);
  
  const map = new Map<string, RobotsCheckResult>();
  for (const { domain, result } of results) {
    map.set(domain, result);
  }
  
  return map;
}

/**
 * Clear robots cache
 */
export function clearRobotsCache(): void {
  robotsCache.clear();
}

/**
 * Get cache statistics
 */
export function getRobotsCacheStats(): { domains: number; disallowed: number } {
  const domains = robotsCache.size;
  let disallowed = 0;
  
  for (const result of robotsCache.values()) {
    if (result.status === 'disallowed') {
      disallowed++;
    }
  }
  
  return { domains, disallowed };
}
