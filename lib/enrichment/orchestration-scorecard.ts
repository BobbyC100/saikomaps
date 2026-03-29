export type ScoreRow = {
  slug: string;
  name: string;
  discoveredEligibleMenus: number;
  fetchedMenuDocs: number;
  fetchedDistinctUrls: number;
  menuIdentityPresent: boolean;
  menuStructurePresent: boolean;
  offeringPresent: boolean;
  offeringReady: boolean | null;
  gateReasons: string[];
  reasons: string[];
};

export type SloMetric = {
  numerator: number;
  denominator: number;
  ratio: number | null;
};

export type SloSummary = {
  discoveryToFetchCoverage: SloMetric;
  fetchToInterpretCompletion: SloMetric;
  offeringAvailability: SloMetric;
};

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeSloSummary(rows: ScoreRow[]): SloSummary {
  const discoveryDenominatorRows = rows.filter((r) => r.discoveredEligibleMenus > 0);
  const discoveryNumeratorRows = discoveryDenominatorRows.filter(
    (r) => r.fetchedDistinctUrls >= r.discoveredEligibleMenus,
  );

  const fetchDenominatorRows = rows.filter((r) => r.fetchedDistinctUrls > 0);
  const fetchNumeratorRows = fetchDenominatorRows.filter(
    (r) => r.menuIdentityPresent && r.menuStructurePresent,
  );

  const offeringDenominatorRows = rows.filter((r) => r.menuIdentityPresent && r.menuStructurePresent);
  const offeringNumeratorRows = offeringDenominatorRows.filter(
    (r) => r.offeringPresent && r.offeringReady === true,
  );

  return {
    discoveryToFetchCoverage: {
      numerator: discoveryNumeratorRows.length,
      denominator: discoveryDenominatorRows.length,
      ratio: ratio(discoveryNumeratorRows.length, discoveryDenominatorRows.length),
    },
    fetchToInterpretCompletion: {
      numerator: fetchNumeratorRows.length,
      denominator: fetchDenominatorRows.length,
      ratio: ratio(fetchNumeratorRows.length, fetchDenominatorRows.length),
    },
    offeringAvailability: {
      numerator: offeringNumeratorRows.length,
      denominator: offeringDenominatorRows.length,
      ratio: ratio(offeringNumeratorRows.length, offeringDenominatorRows.length),
    },
  };
}
