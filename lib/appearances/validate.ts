/**
 * Validation for place_appearances constraint:
 * Either hostPlaceId IS NOT NULL OR (latitude AND longitude AND addressText) are ALL NOT NULL
 */

export interface AppearanceInput {
  subjectPlaceId: string;
  hostPlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressText?: string | null;
  scheduleText: string;
  status?: 'ACTIVE' | 'ENDED' | 'ANNOUNCED';
  sources?: unknown;
  confidence?: number | null;
}

export function validateAppearanceLocation(
  input: Pick<AppearanceInput, 'hostPlaceId' | 'latitude' | 'longitude' | 'addressText'>
): { valid: boolean; error?: string } {
  if (input.hostPlaceId != null && input.hostPlaceId.trim() !== '') {
    return { valid: true };
  }
  const hasLat = input.latitude != null && !Number.isNaN(Number(input.latitude));
  const hasLng = input.longitude != null && !Number.isNaN(Number(input.longitude));
  const hasAddr =
    input.addressText != null &&
    typeof input.addressText === 'string' &&
    input.addressText.trim() !== '';
  if (hasLat && hasLng && hasAddr) {
    return { valid: true };
  }
  return {
    valid: false,
    error:
      'Either hostPlaceId must be provided, or all of latitude, longitude, and addressText must be provided.',
  };
}
