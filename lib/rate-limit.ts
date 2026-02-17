/**
 * Rate Limiting with Upstash Redis
 * 
 * Provides sliding window rate limiting for API endpoints
 * using Upstash Redis for serverless-friendly distributed rate limiting.
 * 
 * Usage:
 *   import { rateLimit } from '@/lib/rate-limit'
 *   
 *   const { success, limit, remaining, reset } = await rateLimit(identifier, {
 *     interval: 3600, // 1 hour in seconds
 *     limit: 10,      // 10 requests per hour
 *   })
 *   
 *   if (!success) {
 *     return NextResponse.json({ error: 'Rate limit exceeded' }, { 
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': limit.toString(),
 *         'X-RateLimit-Remaining': '0',
 *         'X-RateLimit-Reset': reset.toString(),
 *       }
 *     })
 *   }
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitConfig {
  /**
   * Time window in seconds
   */
  interval: number;
  /**
   * Maximum number of requests allowed in the interval
   */
  limit: number;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  success: boolean;
  /**
   * Maximum requests allowed in the interval
   */
  limit: number;
  /**
   * Remaining requests in current window
   */
  remaining: number;
  /**
   * Unix timestamp (seconds) when the rate limit resets
   */
  reset: number;
}

// Initialize Redis client (singleton)
let redis: Redis | null = null;

function getRedis(): Redis {
  if (redis) return redis;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    throw new Error(
      'Missing Upstash Redis configuration. ' +
      'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
    );
  }
  
  redis = new Redis({
    url,
    token,
  });
  
  return redis;
}

// Cache of Ratelimit instances by config
const ratelimiters = new Map<string, Ratelimit>();

function getRatelimiter(config: RateLimitConfig): Ratelimit {
  const key = `${config.interval}:${config.limit}`;
  
  if (ratelimiters.has(key)) {
    return ratelimiters.get(key)!;
  }
  
  const redis = getRedis();
  
  const ratelimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, `${config.interval}s`),
    analytics: true,
    prefix: '@upstash/ratelimit',
  });
  
  ratelimiters.set(key, ratelimiter);
  return ratelimiter;
}

/**
 * Rate limit a request based on identifier
 * 
 * @param identifier - Unique identifier for the rate limit (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and headers
 * 
 * @throws {Error} If Upstash Redis is not configured
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const ratelimiter = getRatelimiter(config);
    const { success, limit, remaining, reset } = await ratelimiter.limit(identifier);
    
    return {
      success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error('[Rate Limit] Error:', error);
    
    // In production, fail closed (deny request)
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Rate limiting unavailable - please try again later');
    }
    
    // In development, warn but allow request
    console.warn('[Rate Limit] Rate limiting unavailable in development - allowing request');
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Math.floor(Date.now() / 1000) + config.interval,
    };
  }
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * For expensive AI operations
   * 10 requests per hour
   */
  AI_GENERATION: {
    interval: 3600, // 1 hour
    limit: 10,
  } as RateLimitConfig,
  
  /**
   * For general API operations
   * 100 requests per hour
   */
  API_STANDARD: {
    interval: 3600, // 1 hour
    limit: 100,
  } as RateLimitConfig,
  
  /**
   * For auth operations (signup, login)
   * 5 attempts per 15 minutes
   */
  AUTH: {
    interval: 900, // 15 minutes
    limit: 5,
  } as RateLimitConfig,
} as const;
