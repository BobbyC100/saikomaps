export type OfferingProgramKey = 'food' | 'wine' | 'beer' | 'coffee' | 'service';

export type OfferingExpectationProfile = {
  profileId: string;
  programs: Record<OfferingProgramKey, boolean>;
  richMode: {
    minCoverageSources: number;
    requireMenuSignals: boolean;
  };
};

type ProfileInput = {
  primaryVertical: string | null | undefined;
  placeType: 'venue' | 'activity' | 'public' | null | undefined;
};

const PROFILE_EAT: OfferingExpectationProfile = {
  profileId: 'eat-default',
  programs: { food: true, wine: true, beer: true, coffee: true, service: true },
  richMode: { minCoverageSources: 2, requireMenuSignals: true },
};

const PROFILE_DRINKS: OfferingExpectationProfile = {
  profileId: 'drinks-default',
  programs: { food: true, wine: true, beer: true, coffee: false, service: true },
  richMode: { minCoverageSources: 2, requireMenuSignals: true },
};

const PROFILE_STAY: OfferingExpectationProfile = {
  profileId: 'stay-default',
  programs: { food: false, wine: false, beer: false, coffee: false, service: true },
  richMode: { minCoverageSources: 2, requireMenuSignals: false },
};

const PROFILE_LOW_EXPECTATION: OfferingExpectationProfile = {
  profileId: 'low-expectation',
  programs: { food: false, wine: false, beer: false, coffee: false, service: false },
  richMode: { minCoverageSources: 99, requireMenuSignals: false },
};

export type OfferingEvidenceSnapshot = {
  coverageSourceCount: number;
  hasMenuSignals: boolean;
};

export function getOfferingExpectationProfile(input: ProfileInput): OfferingExpectationProfile {
  const vertical = (input.primaryVertical ?? '').toUpperCase();
  if (input.placeType === 'activity' || input.placeType === 'public') {
    return PROFILE_LOW_EXPECTATION;
  }
  if (vertical === 'EAT') return PROFILE_EAT;
  if (vertical === 'DRINKS') return PROFILE_DRINKS;
  if (vertical === 'STAY') return PROFILE_STAY;
  return PROFILE_LOW_EXPECTATION;
}

export function meetsRichOfferingEvidence(
  profile: OfferingExpectationProfile,
  evidence: OfferingEvidenceSnapshot,
): boolean {
  if (evidence.coverageSourceCount < profile.richMode.minCoverageSources) return false;
  if (profile.richMode.requireMenuSignals && !evidence.hasMenuSignals) return false;
  return true;
}
