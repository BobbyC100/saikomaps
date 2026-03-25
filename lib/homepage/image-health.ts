const IMAGE_HEALTH_TTL_MS = 1000 * 60 * 30
const IMAGE_HEALTH_TIMEOUT_MS = 2500

type CacheEntry = {
  ok: boolean
  expiresAt: number
}

const imageHealthCache = new Map<string, CacheEntry>()

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return Boolean(entry && entry.expiresAt > Date.now())
}

async function checkWithMethod(url: string, method: 'HEAD' | 'GET'): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), IMAGE_HEALTH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers:
        method === 'GET'
          ? {
              Range: 'bytes=0-0',
            }
          : undefined,
    })

    if (!response.ok) return false

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    return contentType.includes('image/')
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function isImageUrlReachable(url: string): Promise<boolean> {
  const cached = imageHealthCache.get(url)
  if (isFresh(cached)) return cached.ok

  let ok = await checkWithMethod(url, 'HEAD')
  if (!ok) ok = await checkWithMethod(url, 'GET')

  imageHealthCache.set(url, {
    ok,
    expiresAt: Date.now() + IMAGE_HEALTH_TTL_MS,
  })

  return ok
}
