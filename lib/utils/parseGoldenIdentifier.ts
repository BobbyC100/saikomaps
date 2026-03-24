/**
 * Golden Identifier Parser
 * Detects identifier type from a raw pasted string and returns
 * structured IntakeInput fields for dedup resolution.
 *
 * Detection order:
 *  1. Raw GPID (ChIJ...)
 *  2. Google Maps URL → extract place_id
 *  3. Instagram URL → extract handle
 *  4. Instagram handle (@username)
 *  5. Website URL
 *  6. Unknown
 */

import { isGoogleMapsUrl, extractPlaceId } from './googleMapsParser'

export type IdentifierType = 'gpid' | 'google_maps_url' | 'instagram' | 'website' | 'unknown'

export interface ParsedIdentifier {
  type: IdentifierType
  /** Human-readable label: "Google Place ID", "Instagram: @handle", etc. */
  label: string
  /** Fields to merge into the intake POST body */
  intakeFields: {
    googlePlaceId?: string
    website?: string
    instagram?: string
  }
}

const RESERVED_INSTAGRAM_PATHS = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'tv',
  'ar',
])

function extractInstagramHandleFromUrl(rawUrl: string): string | null {
  try {
    const withProtocol = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
    const url = new URL(withProtocol)
    const host = url.hostname.toLowerCase()
    if (!host.includes('instagram.com')) return null

    const segments = url.pathname
      .split('/')
      .filter(Boolean)
      .map((s) => s.trim())

    if (segments.length === 0) return null
    const first = segments[0].toLowerCase()
    if (RESERVED_INSTAGRAM_PATHS.has(first)) return null

    const candidate = segments[0]
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(candidate)) return null
    return candidate
  } catch {
    return null
  }
}

export function parseGoldenIdentifier(raw: string): ParsedIdentifier {
  const trimmed = raw.trim()
  if (!trimmed) return { type: 'unknown', label: '', intakeFields: {} }

  // 1. Raw GPID — starts with "ChIJ" and is 27+ alphanumeric/dash/underscore chars
  if (/^ChIJ[A-Za-z0-9_-]{20,}$/.test(trimmed)) {
    return {
      type: 'gpid',
      label: `GPID: ${trimmed.slice(0, 15)}...`,
      intakeFields: { googlePlaceId: trimmed },
    }
  }

  // 2. Google Maps URL — extract place_id via existing parser
  if (isGoogleMapsUrl(trimmed)) {
    const placeId = extractPlaceId(trimmed)
    if (placeId && !placeId.startsWith('cid:')) {
      return {
        type: 'google_maps_url',
        label: 'Google Place ID (from URL)',
        intakeFields: { googlePlaceId: placeId },
      }
    }
    // CID-only or unparseable Maps URL — fall through to website
  }

  // 3. Instagram URL — profile URLs only (reject explore/reel/stories/etc)
  const instagramHandleFromUrl = extractInstagramHandleFromUrl(trimmed)
  if (instagramHandleFromUrl) {
    return {
      type: 'instagram',
      label: `Instagram: @${instagramHandleFromUrl}`,
      intakeFields: { instagram: instagramHandleFromUrl },
    }
  }

  // 4. Instagram handle — @username or bare short alphanumeric (no dots in domain sense)
  if (/^@[a-zA-Z0-9._]{1,30}$/.test(trimmed)) {
    const handle = trimmed.replace(/^@/, '')
    return {
      type: 'instagram',
      label: `Instagram: @${handle}`,
      intakeFields: { instagram: handle },
    }
  }

  // 5. Website URL — contains a dot and looks URL-ish
  if (trimmed.includes('.') && /^(https?:\/\/)?[a-zA-Z0-9]/.test(trimmed)) {
    try {
      const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
      const hostname = new URL(url).hostname
      // Exclude maps and social URLs that have dedicated parsers above
      if (
        !hostname.includes('google.')
        && !hostname.includes('goo.gl')
        && !hostname.includes('instagram.com')
      ) {
        return {
          type: 'website',
          label: `Website: ${hostname}`,
          intakeFields: { website: url },
        }
      }
    } catch {
      // Not a valid URL — fall through to unknown
    }
  }

  return { type: 'unknown', label: 'Unrecognized format', intakeFields: {} }
}
