import { describe, expect, it } from "vitest";
import { computeSloSummary, type ScoreRow } from "./orchestration-scorecard";

describe("computeSloSummary", () => {
  it("handles multi-service entity with full menu handoff coverage", () => {
    const rows: ScoreRow[] = [
      {
        slug: "wildes",
        name: "Wildes",
        discoveredEligibleMenus: 3,
        fetchedMenuDocs: 8,
        fetchedDistinctUrls: 3,
        menuIdentityPresent: true,
        menuStructurePresent: true,
        offeringPresent: true,
        offeringReady: true,
        gateReasons: [],
        reasons: [],
      },
    ];

    const slo = computeSloSummary(rows);
    expect(slo.discoveryToFetchCoverage).toEqual({ numerator: 1, denominator: 1, ratio: 1 });
    expect(slo.fetchToInterpretCompletion).toEqual({ numerator: 1, denominator: 1, ratio: 1 });
    expect(slo.offeringAvailability).toEqual({ numerator: 1, denominator: 1, ratio: 1 });
  });

  it("uses explicit denominators and excludes non-eligible entities", () => {
    const rows: ScoreRow[] = [
      {
        slug: "no-menus",
        name: "No Menus",
        discoveredEligibleMenus: 0,
        fetchedMenuDocs: 0,
        fetchedDistinctUrls: 0,
        menuIdentityPresent: false,
        menuStructurePresent: false,
        offeringPresent: false,
        offeringReady: null,
        gateReasons: [],
        reasons: ["NO_MENU_SURFACES_DISCOVERED"],
      },
      {
        slug: "partial",
        name: "Partial",
        discoveredEligibleMenus: 2,
        fetchedMenuDocs: 1,
        fetchedDistinctUrls: 1,
        menuIdentityPresent: false,
        menuStructurePresent: false,
        offeringPresent: false,
        offeringReady: null,
        gateReasons: [],
        reasons: ["MENU_SURFACES_DISCOVERED_NOT_FETCHED"],
      },
    ];

    const slo = computeSloSummary(rows);
    expect(slo.discoveryToFetchCoverage).toEqual({ numerator: 0, denominator: 1, ratio: 0 });
    expect(slo.fetchToInterpretCompletion).toEqual({ numerator: 0, denominator: 1, ratio: 0 });
    expect(slo.offeringAvailability).toEqual({ numerator: 0, denominator: 0, ratio: null });
  });
});
