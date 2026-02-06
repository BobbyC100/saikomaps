/**
 * Google Maps URL Parser
 * Extracts place_id from various Google Maps URL formats
 */

/**
 * Extracts place_id from Google Maps URLs
 * Supports both full URLs and short links (maps.app.goo.gl)
 */
export function extractPlaceId(url: string): string | null {
  try {
    // Clean up the URL
    const cleanUrl = url.trim();

    // Pattern 1: Short URLs (maps.app.goo.gl) - these need to be resolved first
    // For MVP, we'll try to extract if possible, otherwise return null
    if (cleanUrl.includes('maps.app.goo.gl')) {
      // These redirect to full URLs, so we can't extract directly
      // Return null to indicate we need the full URL
      return null;
    }

    // Pattern 2: Standard place URLs with place_id parameter
    // Example: https://www.google.com/maps/place/...?q=...&ftid=...&place_id=ChIJ...
    const placeIdMatch = cleanUrl.match(/[?&]place_id=([A-Za-z0-9_-]+)/);
    if (placeIdMatch) {
      return placeIdMatch[1];
    }

    // Pattern 3: Data URL format (most common from share links)
    // Example: https://www.google.com/maps/place/.../@...data=!4m6!3m5!1s[PLACE_ID]
    // The pattern is: 1s followed by the place_id or CID
    // CID format: 1s0x[hex]:0x[hex] - extract first part before colon
    const dataMatch = cleanUrl.match(/1s([A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?)/);
    if (dataMatch) {
      // Handle CID format (0x...:0x...) - use first part
      const potentialId = dataMatch[1];
      if (potentialId.includes(':')) {
        const cidPart = potentialId.split(':')[0];
        // For CID format, we'll return it and let the API handle it
        // But first try to see if it's a valid place_id format
        if (cidPart.startsWith('ChIJ')) {
          return cidPart; // Standard place_id
        }
        // For CID, we need to use Place Search API instead
        // Return null to trigger text search fallback
        return null;
      }
      // Verify it looks like a place_id (starts with ChIJ typically)
      if (potentialId.startsWith('ChIJ') || potentialId.startsWith('0x')) {
        return potentialId;
      }
    }

    // Pattern 4: CID (Customer ID) format
    // Example: https://www.google.com/maps?cid=12345678901234567890
    const cidMatch = cleanUrl.match(/[?&]cid=(\d+)/);
    if (cidMatch) {
      // CID can be converted to place_id, but for simplicity we'll return it as-is
      // and let the API handle it
      return `cid:${cidMatch[1]}`;
    }

    // Pattern 5: FID (Feature ID) format
    // Example: https://www.google.com/maps?ftid=...
    const fidMatch = cleanUrl.match(/[?&]ftid=([A-Za-z0-9_-]+)/);
    if (fidMatch) {
      return fidMatch[1];
    }

    return null;
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error);
    return null;
  }
}

/**
 * Validates if a string looks like a Google Maps URL
 */
export function isGoogleMapsUrl(url: string): boolean {
  const googleMapsPatterns = [
    'maps.google.com',
    'www.google.com/maps',
    'maps.app.goo.gl',
    'goo.gl/maps',
  ];

  return googleMapsPatterns.some((pattern) => url.includes(pattern));
}

/**
 * Resolves a short Google Maps URL to get the full URL
 * Note: This requires making an HTTP request to follow the redirect
 */
export async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  try {
    // This would need to be implemented server-side
    // For now, return null to indicate it needs resolution
    if (!shortUrl.includes('maps.app.goo.gl')) {
      return shortUrl;
    }

    // In a real implementation, you would:
    // 1. Make a HEAD request to the short URL
    // 2. Follow the redirect
    // 3. Extract the final URL
    // For MVP, we'll just return null
    return null;
  } catch (error) {
    console.error('Error resolving short URL:', error);
    return null;
  }
}
