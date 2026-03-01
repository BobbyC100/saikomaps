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

/** Reservation provider domains */
export const RESERVATION_DOMAINS: Record<string, string> = {
  "resy.com": "Resy",
  "opentable.com": "OpenTable",
  "exploretock.com": "Tock",
  "tock.to": "Tock",
  "sevenrooms.com": "SevenRooms",
  "yelp.com": "Yelp",
};

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
