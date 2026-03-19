/**
 * SAIKO Website Enrichment Spec v1.1 — hard limits
 */

export const MAX_REQUESTS_PER_PLACE = 2;
export const MAX_HTML_BYTES = 1.5 * 1024 * 1024; // 1.5MB
export const FETCH_TIMEOUT_MS = 5000;
export const MAX_REDIRECTS = 3;
export const VISIBLE_TEXT_CAP = 2000;
export const ABOUT_VISIBLE_TEXT_CAP = 2000;

/** Schema.org types we map to Saiko categories */
export const SCHEMA_TYPE_TO_SAIKO: Record<string, string> = {
  Restaurant: "Restaurant",
  CafeOrCoffeeShop: "Cafe",
  Bakery: "Bakery",
  BarOrPub: "Bar",
  Winery: "Wine Bar",
  Brewery: "Bar",
  FoodEstablishment: "FoodEstablishment", // keyword layer decides
  Hotel: "Hotel",
  LodgingBusiness: "Hotel",
  Resort: "Hotel",
  Motel: "Hotel",
};

/** About-page anchor text/href patterns (same-domain, single hop) */
export const ABOUT_PATTERNS = [
  "about",
  "about-us",
  "our story",
  "story",
  "who we are",
  "mission",
  "info",
  "team",
  "philosophy",
];

/** Menu link patterns */
export const MENU_PATTERNS = [
  "menu",
  "menus",
  "food",
  "drink",
  "wine",
  "cocktail",
  "brunch",
];

/** Reservation provider domains → canonical lowercase slug */
export const RESERVATION_DOMAINS: Record<string, string> = {
  "resy.com": "resy",
  "opentable.com": "opentable",
  "exploretock.com": "tock",
  "tock.to": "tock",
  "sevenrooms.com": "sevenrooms",
  "yelp.com": "yelp",
  "tables.toasttab.com": "toast",  // Toast reservation product (distinct from ordering)
};

/**
 * Provider tier policy.
 * Tier 1: first-class providers — UI shows "Reserve on [Provider]"
 * Tier 2: fallback providers — UI shows generic "Reserve"
 */
export const TIER_1_PROVIDERS = new Set(["resy", "opentable", "tock", "sevenrooms"]);

/** Full button labels for Tier 1 providers. Tier 2 always renders "Reserve". */
export const RESERVATION_BUTTON_LABELS: Record<string, string> = {
  resy: "Reserve on Resy",
  opentable: "Reserve on OpenTable",
  tock: "Reserve on Tock",
  sevenrooms: "Reserve on SevenRooms",
};

/** Canonical display names (for non-button contexts) */
export const RESERVATION_PROVIDER_LABELS: Record<string, string> = {
  resy: "Resy",
  opentable: "OpenTable",
  tock: "Tock",
  sevenrooms: "SevenRooms",
  yelp: "Yelp",
  toast: "Toast",
};

/**
 * URL canonicalization: query params to strip from reservation URLs.
 * Keep stable identifiers (restref, rid, slug). Strip session/tracking params.
 */
export const RESERVATION_URL_STRIP_PARAMS = new Set([
  "date", "seats", "covers", "time", "party_size",
  "source", "ot_source", "ot_campaign", "campaign",
  "correlationId", "lang", "utm_source", "utm_medium", "utm_campaign",
  "utm_content", "utm_term", "ref", "fbclid", "gclid",
]);

/** Ordering provider domains (optional v1) */
export const ORDERING_DOMAINS: Record<string, string> = {
  "toasttab.com": "Toast",
  "chownow.com": "ChowNow",
  "doordash.com": "DoorDash",
  "ubereats.com": "Uber Eats",
  "postmates.com": "Postmates",
};

/** Social domains -> key */
export const SOCIAL_DOMAINS: Record<string, string> = {
  "instagram.com": "instagram",
  "tiktok.com": "tiktok",
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "x.com": "x",
  "twitter.com": "x",
};

/** Keyword weights by source */
export const SOURCE_WEIGHTS: Record<string, number> = {
  title: 3,
  h1: 3,
  about: 2,
  metaDescription: 2,
  body: 1,
  anchor: 1,
};

/** Keyword buckets for category fallback */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Cafe: ["coffee", "café", "cafe", "espresso", "latte", "roastery"],
  Bakery: ["bakery", "pastry", "bread", "patisserie"],
  "Wine Bar": ["wine bar", "natural wine", "by the glass", "wine list"],
  Bar: ["cocktail", "spirits", "bar", "happy hour"],
  Restaurant: ["restaurant", "dining", "kitchen", "chef", "reservations"],
  Shop: ["shop", "store", "market", "provisions"],
  Hotel: [
    "hotel",
    "boutique hotel",
    "rooms",
    "suites",
    "check-in",
    "check in",
    "check-out",
    "check out",
    "book a room",
    "stay",
    "accommodations",
    "lodging",
    "guest room",
    "reservation",
    "palisociety",
    "marriott",
    "proper hotel",
  ],
};
