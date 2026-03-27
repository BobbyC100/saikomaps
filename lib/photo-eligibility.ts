import type { PhotoSource } from '@prisma/client';

export type IneligibleReason =
  | 'MISSING_DIM'
  | 'MIN_DIM'
  | 'ASPECT'
  | 'DUPLICATE'
  | 'MANUAL_REJECT';

export type EligibilityResult = {
  eligible: boolean;
  reason: IneligibleReason | null;
};

export type EligibilityInput = {
  widthPx: number | null;
  heightPx: number | null;
  aspectRatio?: number | null;
};

export const SOURCE_RANK: Record<PhotoSource, number> = {
  WEBSITE: 1,
  MANUAL: 1,
  INSTAGRAM: 2,
  GOOGLE: 3,
};

export function getSourceRank(source: PhotoSource): number {
  return SOURCE_RANK[source];
}

export function evaluateEligibility(photo: EligibilityInput): EligibilityResult {
  if (photo.widthPx == null || photo.heightPx == null) {
    return { eligible: false, reason: 'MISSING_DIM' };
  }

  if (Math.min(photo.widthPx, photo.heightPx) < 900) {
    return { eligible: false, reason: 'MIN_DIM' };
  }

  const aspectRatio = photo.aspectRatio ?? photo.widthPx / photo.heightPx;
  if (Number.isFinite(aspectRatio) && (aspectRatio > 3.2 || aspectRatio < 0.3)) {
    return { eligible: false, reason: 'ASPECT' };
  }

  return { eligible: true, reason: null };
}
