// =============================================================================
// SaikoAI Source Collector — Shared Config
//
// Publication registry and category search priorities. Used by collect-b,
// benchmark, and any future Approach A (CSE) pipeline.
// =============================================================================

export interface Publication {
  name: string;
  domain: string;
  tier: number;
}

export const SOURCE_REGISTRY: Publication[] = [
  // Tier 1 — Primary Authority
  { name: "Michelin Guide", domain: "guide.michelin.com", tier: 1 },
  { name: "LA Times", domain: "latimes.com", tier: 1 },
  { name: "NYT", domain: "nytimes.com", tier: 1 },
  { name: "L.A. Taco", domain: "lataco.com", tier: 1 },
  { name: "Sprudge", domain: "sprudge.com", tier: 1 },
  { name: "Punch", domain: "punchdrink.com", tier: 1 },
  // Tier 2 — Editorial Consensus
  { name: "Eater LA", domain: "la.eater.com", tier: 2 },
  { name: "The Infatuation", domain: "theinfatuation.com", tier: 2 },
  { name: "Time Out LA", domain: "timeout.com", tier: 2 },
  { name: "Bon Appétit", domain: "bonappetit.com", tier: 2 },
  // Tier 3 — Confirmation
  { name: "Food GPS", domain: "foodgps.com", tier: 3 },
  { name: "Consuming LA", domain: "consumingla.com", tier: 3 },
];

export const CATEGORY_PRIORITY: Record<string, string[]> = {
  coffee: ["sprudge.com", "la.eater.com", "timeout.com"],
  "wine bar": ["punchdrink.com", "la.eater.com", "theinfatuation.com"],
  restaurant: ["latimes.com", "nytimes.com", "guide.michelin.com", "la.eater.com", "theinfatuation.com"],
  "street food": ["lataco.com", "la.eater.com", "latimes.com"],
  bar: ["punchdrink.com", "la.eater.com", "timeout.com"],
};

export const DEFAULT_PRIORITY = [
  "latimes.com",
  "la.eater.com",
  "theinfatuation.com",
  "timeout.com",
  "sprudge.com",
  "punchdrink.com",
];
