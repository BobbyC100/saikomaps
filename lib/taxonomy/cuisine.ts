// lib/taxonomy/cuisine.ts
export const CUISINE_PRIMARY = [
  "Sushi",
  "Japanese",
  "Ramen",
  "Pizza",
  "Italian",
  "Mexican",
  "Chinese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Indian",
  "French",
  "Mediterranean",
  "Middle Eastern",
  "American",
  "Burgers",
  "Seafood",
  "Steakhouse",
  "BBQ",
  "Bakery",
  "Coffee",
  "Wine Bar",
  "Cocktail Bar",
  "Brewery",
] as const;

export type CuisinePrimary = (typeof CUISINE_PRIMARY)[number];

export const CUISINE_SECONDARY = [
  // Sushi (deep)
  "Omakase",
  "Edomae",
  "Hand Roll Bar",
  "Chirashi",
  "Takeout Sushi",
  "Splurge",
  "Mid",
  "Value",

  // Brewery (locked)
  "Sours / Saison Focus",
  "IPA Focus",
  "Food Program",

  // Minimal "explicit-only" add-ons
  "Korean BBQ",
  "Sichuan",
  "Cantonese",
] as const;

export type CuisineSecondary = (typeof CUISINE_SECONDARY)[number];

// ---------- Token dictionaries (deterministic rules) ----------

export const TOKENS = {
  sushiPrimary: [
    "sushi",
    "omakase",
    "temaki",
    "hand roll",
    "handroll",
    "chirashi",
  ],
  japanesePrimary: [
    "izakaya",
    "yakitori",
    "udon",
    "donburi",
    "okonomiyaki",
  ],
  ramenPrimary: ["ramen"],

  pizzaPrimary: ["pizza", "pizzeria", "pizzette"],
  italianPrimary: ["osteria", "trattoria", "enoteca", "ristorante"],

  mexicanPrimary: [
    "taco",
    "taqueria",
    "tacos",
    "birria",
    "tortas",
    "pozole",
    "mole",
    "mariscos",
    "taquito",
    "burrito",
    "quesadilla",
  ],

  koreanPrimary: [
    "korean", 
    "galbi", 
    "kalbi", 
    "bulgogi", 
    "samgyupsal", 
    "soondubu",
    "kbbq",
    "korean bbq",
  ],
  kbbqSecondary: ["kbbq", "korean bbq", "bbq"],

  chineseSichuanSecondary: ["sichuan", "szechuan", "szechwan"],
  chineseCantoneseSecondary: ["cantonese", "dim sum", "wonton", "hong kong", "hk"],

  thaiPrimary: [
    "thai", 
    "isan", 
    "som tum",
    "pad thai",
    "khao soi",
    "larb",
  ],
  vietnamesePrimary: ["pho", "banh mi", "banhmi", "bun bo hue"],
  indianPrimary: ["tandoor", "biryani", "masala", "chaat"],

  // American subcategories
  burgersPrimary: [
    "burger",
    "burgers",
    "hamburger",
    "cheeseburger",
    "smash burger",
    "smashburger",
  ],
  bbqPrimary: [
    "barbecue",
    "barbeque",
    "smokehouse",
    "smoke house",
    "pit bbq",
    "ribs",
    "brisket",
  ],

  // Drinks formats
  breweryPrimary: ["brewery", "brewing", "alehouse", "brewhouse", "brewpub"],
} as const;

export const BREWERY_SECONDARY_TOKENS = {
  "Sours / Saison Focus": [
    "saison",
    "farmhouse",
    "wild",
    "sour",
    "mixed fermentation",
    "mixed-fermentation",
    "foeder",
    "foed",
  ],
  "IPA Focus": [
    " ipa",
    "ipa ",
    "hazy",
    "west coast ipa",
    "double ipa",
    "dipa",
  ],
  "Food Program": [
    "kitchen",
    "food menu",
    "chef",
    "restaurant",
    "dining",
    "tapas",
    "small plates",
  ],
} as const;

// Legacy cuisine_type values that we consider "meaningful" (everything else is junk)
export const LEGACY_ALLOWED = new Set([
  "Italian",
  "Japanese",
  "Sushi",
  "Mexican",
  "Thai",
  "French",
  "American",
  "Chinese",
  "Korean",
  "Vietnamese",
  "Indian",
  "Barbecue",
  "BBQ",
]);

export const LEGACY_JUNK = new Set([
  null as any,
  "",
  "Bar",
  "bar",
  "Cafe",
  "Café",
  "Restaurant",
]);
