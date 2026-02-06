/**
 * Saiko Maps Category Mapping
 * Maps Google Places types + name keywords to 11 Saiko categories.
 * Used for marker icons and filtering.
 */

export type SaikoCategory =
  | 'eat'
  | 'coffee'
  | 'bakery'
  | 'drinks'
  | 'wine'
  | 'purveyors'
  | 'nature'
  | 'shop'
  | 'stay'
  | 'culture'
  | 'activity';

export const ALL_CATEGORIES: SaikoCategory[] = [
  'eat',
  'coffee',
  'bakery',
  'drinks',
  'wine',
  'purveyors',
  'nature',
  'shop',
  'stay',
  'culture',
  'activity',
];

export const CATEGORY_LABELS: Record<SaikoCategory, string> = {
  eat: 'Eat',
  coffee: 'Coffee',
  bakery: 'Bakery',
  drinks: 'Drinks',
  wine: 'Wine',
  purveyors: 'Purveyors',
  nature: 'Nature',
  shop: 'Shop',
  stay: 'Stay',
  culture: 'Culture',
  activity: 'Activity',
};

/** Name-based keyword detection (catches wine bars, cheese shops, etc. that Google types miss) */
const NAME_KEYWORDS: Array<{ pattern: RegExp; category: SaikoCategory }> = [
  { pattern: /\bwine\s*(bar|shop|store|cellar|tasting)\b/i, category: 'wine' },
  { pattern: /\bwinebar\b/i, category: 'wine' },
  { pattern: /\bvineyard\b/i, category: 'wine' },
  { pattern: /\bwinery\b/i, category: 'wine' },
  { pattern: /\bcheese\s*(shop|store|monger)\b/i, category: 'purveyors' },
  { pattern: /\bfromagerie\b/i, category: 'purveyors' },
  { pattern: /\bcharcuterie\b/i, category: 'purveyors' },
  { pattern: /\bbutcher\b/i, category: 'purveyors' },
  { pattern: /\bfish\s*(market|monger)\b/i, category: 'purveyors' },
  { pattern: /\bprovisions?\b/i, category: 'purveyors' },
  { pattern: /\bgrocery\b/i, category: 'purveyors' },
  { pattern: /\bmarket\b/i, category: 'purveyors' },
  { pattern: /\bcoffee\b/i, category: 'coffee' },
  { pattern: /\bcaf[eé]\b/i, category: 'coffee' },
  { pattern: /\bespresso\b/i, category: 'coffee' },
  { pattern: /\bbakery\b/i, category: 'bakery' },
  { pattern: /\bboulangerie\b/i, category: 'bakery' },
  { pattern: /\bpatisserie\b/i, category: 'bakery' },
  { pattern: /\bbar\b/i, category: 'drinks' },
  { pattern: /\bpub\b/i, category: 'drinks' },
  { pattern: /\btavern\b/i, category: 'drinks' },
  { pattern: /\bcocktail\b/i, category: 'drinks' },
  { pattern: /\bhotel\b/i, category: 'stay' },
  { pattern: /\binn\b/i, category: 'stay' },
  { pattern: /\bb&b\b/i, category: 'stay' },
  { pattern: /\bbed\s*&\s*breakfast\b/i, category: 'stay' },
  { pattern: /\blodge\b/i, category: 'stay' },
  { pattern: /\bmuseum\b/i, category: 'culture' },
  { pattern: /\bgallery\b/i, category: 'culture' },
  { pattern: /\btheater\b/i, category: 'culture' },
  { pattern: /\btheatre\b/i, category: 'culture' },
  { pattern: /\blibrary\b/i, category: 'culture' },
  { pattern: /\bpark\b/i, category: 'nature' },
  { pattern: /\bgarden\b/i, category: 'nature' },
  { pattern: /\btrail\b/i, category: 'nature' },
  { pattern: /\bhike\b/i, category: 'nature' },
  { pattern: /\boutdoor\b/i, category: 'nature' },
  { pattern: /\bgym\b/i, category: 'activity' },
  { pattern: /\bspa\b/i, category: 'activity' },
  { pattern: /\byoga\b/i, category: 'activity' },
  { pattern: /\bsurf\b/i, category: 'activity' },
  { pattern: /\bclimb/i, category: 'activity' },
  { pattern: /\bshop\b/i, category: 'shop' },
  { pattern: /\bstore\b/i, category: 'shop' },
  { pattern: /\bboutique\b/i, category: 'shop' },
  { pattern: /\brestaurant\b/i, category: 'eat' },
  { pattern: /\bbistro\b/i, category: 'eat' },
  { pattern: /\bgrill\b/i, category: 'eat' },
  { pattern: /\bkitchen\b/i, category: 'eat' },
];

/** Google Places type -> Saiko category */
const GOOGLE_TYPE_MAP: Record<string, SaikoCategory> = {
  restaurant: 'eat',
  food: 'eat',
  meal_delivery: 'eat',
  meal_takeaway: 'eat',
  cafe: 'coffee',
  coffee_shop: 'coffee',
  bakery: 'bakery',
  bar: 'drinks',
  night_club: 'drinks',
  liquor_store: 'drinks',
  wine_bar: 'wine',
  grocery_or_supermarket: 'purveyors',
  supermarket: 'purveyors',
  grocery_store: 'purveyors',
  convenience_store: 'purveyors',
  farmer_market: 'purveyors',
  park: 'nature',
  natural_feature: 'nature',
  campground: 'nature',
  zoo: 'nature',
  aquarium: 'nature',
  store: 'shop',
  shopping_mall: 'shop',
  clothing_store: 'shop',
  book_store: 'shop',
  home_goods_store: 'shop',
  furniture_store: 'shop',
  jewelry_store: 'shop',
  lodging: 'stay',
  hotel: 'stay',
  motel: 'stay',
  museum: 'culture',
  art_gallery: 'culture',
  library: 'culture',
  movie_theater: 'culture',
  stadium: 'activity',
  gym: 'activity',
  spa: 'activity',
  bowling_alley: 'activity',
  amusement_park: 'activity',
  tourist_attraction: 'culture',
};

/**
 * Get Saiko category for a place.
 * Checks name keywords first, then Google Places types, defaults to 'eat'.
 */
export function getSaikoCategory(
  name: string,
  googleTypes: string[] = []
): SaikoCategory {
  const n = (name || '').trim();

  // 1. Name-based keyword detection
  for (const { pattern, category } of NAME_KEYWORDS) {
    if (pattern.test(n)) return category;
  }

  // 2. Google Places type mapping
  for (const t of googleTypes || []) {
    const cat = GOOGLE_TYPE_MAP[t];
    if (cat) return cat;
  }

  return 'eat';
}

/**
 * Parse cuisine type from Google Places types array.
 * Returns display label or null if no match.
 */
export function parseCuisineType(types: string[] | null | undefined): string | null {
  if (!types?.length) return null;

  const cuisineMap: Record<string, string> = {
    italian_restaurant: 'Italian',
    japanese_restaurant: 'Japanese',
    mexican_restaurant: 'Mexican',
    chinese_restaurant: 'Chinese',
    thai_restaurant: 'Thai',
    indian_restaurant: 'Indian',
    french_restaurant: 'French',
    korean_restaurant: 'Korean',
    vietnamese_restaurant: 'Vietnamese',
    greek_restaurant: 'Greek',
    mediterranean_restaurant: 'Mediterranean',
    seafood_restaurant: 'Seafood',
    steak_house: 'Steakhouse',
    sushi_restaurant: 'Sushi',
    pizza_restaurant: 'Pizza',
    hamburger_restaurant: 'Burgers',
    barbecue_restaurant: 'BBQ',
    ramen_restaurant: 'Ramen',
    breakfast_restaurant: 'Breakfast',
    brunch_restaurant: 'Brunch',
    cafe: 'Café',
    coffee_shop: 'Coffee',
    bakery: 'Bakery',
    bar: 'Bar',
    wine_bar: 'Wine Bar',
    cocktail_bar: 'Cocktails',
    brewery: 'Brewery',
    ice_cream_shop: 'Ice Cream',
  };

  for (const type of types) {
    if (cuisineMap[type]) return cuisineMap[type];
  }
  return null;
}

/**
 * Get marker icon path for a category.
 * Returns /markers/{category}.svg
 */
export function getMarkerIcon(category: SaikoCategory | string | null | undefined): string {
  const c = (category || 'eat') as SaikoCategory;
  if (ALL_CATEGORIES.includes(c)) {
    return `/markers/${c}.svg`;
  }
  return '/markers/eat.svg';
}
