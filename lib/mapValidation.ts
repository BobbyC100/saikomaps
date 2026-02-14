// ============================================================
// Saiko Maps: Map Creation Flow — Validation
// ============================================================
// Hard validation rules. A map either conforms or it doesn't.
// These drive both client-side inline errors and server-side
// publish gates.
// ============================================================

// ── Character Limits ────────────────────────────────────────
// Only max limits are enforced. No required fields except title + 1 place for publish.

export const MAP_FIELD_LIMITS = {
  title: { min: 1, max: 60 },
  subtitle: { max: 120 },
  scopeGeography: { max: 100 },
  scopePlaceTypes: { maxItems: 20 },
} as const;

// ── Function Presets (legacy) ─────────────────────────────────

export const FUNCTION_TYPE_OPTIONS = [
  'Find great spots in a neighborhood',
  'Plan a day out',
  'Explore a specific category',
  'Follow a route or trail',
  'Discover a city as a visitor',
  'Share personal favorites',
] as const;
export type FunctionTypeValue = (typeof FUNCTION_TYPE_OPTIONS)[number];

// Minimum locations to publish (title + 1 place is enough)
export const MIN_PLACES_TO_PUBLISH = 1;

// ── Place-level Validation ──────────────────────────────────

export const PLACE_FIELD_LIMITS = {
  name: { min: 1, max: 80 },
  descriptor: { max: 120 }, // Optional; max length only
} as const;

// ── Scope Place Type Options ────────────────────────────────
// Maps to the 11 Saiko categories — used for the multi-select

export const SCOPE_PLACE_TYPE_OPTIONS = [
  'Eat',
  'Coffee',
  'Bakery',
  'Drinks',
  'Wine',
  'Purveyors',
  'Nature',
  'Shop',
  'Stay',
  'Culture',
  'Activity',
] as const;

// ── Scope Exclusion Presets ─────────────────────────────────

export const SCOPE_EXCLUSION_PRESETS = [
  'No chains',
  'No reservations required',
  'Nothing $$$$',
  'No tourist spots',
  'Nothing new/hyped',
] as const;

// ── Types ───────────────────────────────────────────────────

export type ScopePlaceType = (typeof SCOPE_PLACE_TYPE_OPTIONS)[number];

export interface MapFormData {
  // Step 1: Title
  title: string;
  subtitle?: string;
  // Step 2: Scope
  scopeGeography: string;
  scopePlaceTypes: ScopePlaceType[];
  scopeExclusions: string[];
  // Step 3: Places (validated separately)
}

// ── Validation Functions ────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

/** Validate a single step. Only enforces character max limits; no required checks. */
export function validateStep(step: number, data: Partial<MapFormData>): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (step) {
    case 1: // Title
      if (data.title && data.title.length > MAP_FIELD_LIMITS.title.max) {
        errors.push({ field: 'title', message: `Title must be under ${MAP_FIELD_LIMITS.title.max} characters` });
      }
      if (data.subtitle && data.subtitle && data.subtitle.length > MAP_FIELD_LIMITS.subtitle.max) {
        errors.push({ field: 'subtitle', message: `Subtitle must be under ${MAP_FIELD_LIMITS.subtitle.max} characters` });
      }
      break;

    case 2: // Function — no required checks
      break;

    case 3: // Scope
      if (data.scopeGeography && data.scopeGeography.length > MAP_FIELD_LIMITS.scopeGeography.max) {
        errors.push({ field: 'scopeGeography', message: `Geography must be under ${MAP_FIELD_LIMITS.scopeGeography.max} characters` });
      }
      break;

    // Step 4 (Places) — no validation
  }

  return errors;
}

/** Full publish-readiness check. Only 1 place required; title can be auto-generated at publish. */
export function validateForPublish(
  data: Partial<MapFormData>,
  placeCount: number,
  _places?: Array<{ descriptor?: string | null }>
): { canPublish: boolean; errors: ValidationError[] } {
  const allErrors: ValidationError[] = [];

  // Title: if provided, must be under max
  if (data.title && data.title.length > MAP_FIELD_LIMITS.title.max) {
    allErrors.push({ field: 'title', message: `Title must be under ${MAP_FIELD_LIMITS.title.max} characters` });
  }

  // Place count: at least 1 (only blocker)
  if (placeCount < MIN_PLACES_TO_PUBLISH) {
    allErrors.push({
      field: 'places',
      message: 'Add at least one place to publish',
    });
  }

  return {
    canPublish: allErrors.length === 0,
    errors: allErrors,
  };
}

/** Check which steps have content (for progress indicator). Order: 1=Places, 2=Title, 3=Details. */
export function getStepCompletion(
  data: Partial<MapFormData>,
  placeCount: number,
  _places?: Array<{ descriptor?: string | null }>
): Record<number, boolean> {
  const detailsHasContent =
    !!data.scopeGeography?.trim() ||
    (data.scopePlaceTypes?.length ?? 0) > 0 ||
    (data.scopeExclusions?.length ?? 0) > 0;
  return {
    1: placeCount >= 1,
    2: !!data.title?.trim(),
    3: detailsHasContent,
  };
}

/** Convert validation errors to Record<field, message> for inline display. */
export function errorsToRecord(errors: ValidationError[]): Record<string, string> {
  return Object.fromEntries(errors.map((e) => [e.field, e.message]));
}

/** Map Place.category to SCOPE_PLACE_TYPE_OPTIONS for auto-population. */
const CATEGORY_TO_SCOPE: Record<string, ScopePlaceType> = {
  Food: 'Eat',
  Eat: 'Eat',
  Coffee: 'Coffee',
  Bakery: 'Bakery',
  Drinks: 'Drinks',
  Wine: 'Wine',
  Purveyors: 'Purveyors',
  Nature: 'Nature',
  Shop: 'Shop',
  Shopping: 'Shop',
  Stay: 'Stay',
  Culture: 'Culture',
  Sights: 'Culture',
  Activity: 'Activity',
  Wellness: 'Activity',
};

/** Convert place category to scope place type if valid. */
export function placeCategoryToScopeType(category: string | null | undefined): ScopePlaceType | null {
  if (!category?.trim()) return null;
  const mapped = CATEGORY_TO_SCOPE[category.trim()];
  if (mapped) return mapped;
  return SCOPE_PLACE_TYPE_OPTIONS.includes(category as ScopePlaceType) ? (category as ScopePlaceType) : null;
}

/** Auto-generate title placeholder from places. Same category+neighborhood → "[Category] in [Neighborhood]", etc. */
export function generateTitleFromPlaces(
  places: Array<{ place?: { category?: string | null; neighborhood?: string | null } } | { places?: { category?: string | null; neighborhood?: string | null } }>
): string {
  if (places.length < 2) return '';
  const categories = [...new Set(places.map((p) => ('place' in p ? p.place?.category : p.places?.category)).filter(Boolean))] as string[];
  const neighborhoods = [...new Set(places.map((p) => ('place' in p ? p.place?.neighborhood : p.places?.neighborhood)).filter(Boolean))] as string[];
  const sameCategory = categories.length === 1 && categories[0];
  const sameNeighborhood = neighborhoods.length === 1 && neighborhoods[0];
  const primaryCategory = sameCategory ? (CATEGORY_TO_SCOPE[sameCategory] ?? sameCategory) : null;

  if (sameCategory && sameNeighborhood) {
    return `${primaryCategory} in ${sameNeighborhood}`;
  }
  if (sameCategory && neighborhoods.length > 1) {
    return `${primaryCategory} in [City]`;
  }
  if (!sameCategory && sameNeighborhood) {
    return `${sameNeighborhood} Guide`;
  }
  if (!sameCategory && neighborhoods.length > 1) {
    return '[City] Guide';
  }
  return '';
}

/** Auto-select scope place types from place categories. */
export function getAutoPlaceTypes(
  places: Array<{ place?: { category?: string | null } }>
): ScopePlaceType[] {
  const types = new Set<ScopePlaceType>();
  for (const p of places) {
    const t = placeCategoryToScopeType(p.place?.category);
    if (t) types.add(t);
  }
  return [...types];
}

/** Auto-fill "Where" from unique neighborhoods. */
export function getAutoGeography(
  places: Array<{ place?: { neighborhood?: string | null } }>
): string {
  const neighborhoods = [...new Set(places.map((p) => p.place?.neighborhood).filter(Boolean))] as string[];
  return neighborhoods.join(', ');
}

/** Convert map/list entity to MapFormData for validation. */
export function mapToFormData(map: {
  title?: string | null;
  subtitle?: string | null;
  scopeGeography?: string | null;
  scopePlaceTypes?: string[] | null;
  scopeExclusions?: string[] | null;
}): MapFormData {
  return {
    title: map.title ?? '',
    subtitle: map.subtitle ?? undefined,
    scopeGeography: map.scopeGeography ?? '',
    scopePlaceTypes: (map.scopePlaceTypes ?? []) as ScopePlaceType[],
    scopeExclusions: map.scopeExclusions ?? [],
  };
}
