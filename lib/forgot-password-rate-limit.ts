/**
 * In-memory rate limit for forgot-password (e.g. 5 per hour per key).
 * Use email or IP as key. For production with multiple instances, use Upstash or similar.
 */

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 5

const store = new Map<string, { count: number; resetAt: number }>()

function getKey(identifier: string): string {
  return `forgot:${identifier}`
}

export function checkForgotPasswordRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const key = getKey(identifier)
  const now = Date.now()
  const entry = store.get(key)

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1 }
  }

  if (now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1 }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  entry.count += 1
  return { allowed: true, remaining: MAX_REQUESTS - entry.count }
}
