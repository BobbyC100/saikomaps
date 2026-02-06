/**
 * Generate a URL-friendly slug from place name + neighborhood
 * e.g. "Granada" in "Echo Park" → "granada-echo-park"
 * If collision, append short random suffix: "granada-echo-park-x7k2"
 */
export function generatePlaceSlug(name: string, neighborhood?: string): string {
  const base = [name, neighborhood].filter(Boolean).join(' ');
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return slug;
}

/**
 * Ensure slug is unique by appending a 4-char random suffix if needed.
 * Caller should pass a function that checks if slug exists in DB.
 */
export function ensureUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const trySlug = async (slug: string): Promise<string> => {
    const taken = await exists(slug);
    if (!taken) return slug;
    const suffix = Math.random().toString(36).slice(2, 6);
    return trySlug(`${baseSlug}-${suffix}`);
  };
  return trySlug(baseSlug);
}
