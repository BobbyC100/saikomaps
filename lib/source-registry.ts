// lib/source-registry.ts

export const SOURCE_QUALITY = {
  editorial_eater: 0.95,
  editorial_infatuation: 0.95,
  editorial_timeout: 0.90,
  primary_website: 0.90,
  google_places: 0.85,
  foursquare: 0.70,
  user_submitted: 0.50,
} as const;

export type SourceKey = keyof typeof SOURCE_QUALITY;

export function getSourceQuality(source: string): number {
  const score = SOURCE_QUALITY[source as SourceKey];
  return score ?? 0; // IMPORTANT: unknown sources lose by default
}

export function isKnownSource(source: string): boolean {
  return (source as SourceKey) in SOURCE_QUALITY;
}
