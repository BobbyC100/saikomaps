/**
 * VALADATA v0.1 — canonical service facts extraction and resolution.
 * Deterministic extraction from google/scrape attrs + conflict-aware canonicalization.
 */

// ============================================================================
// A) v0.1 contract (types)
// ============================================================================

export const SERVICE_FIELD_KEYS = [
  'takeout',
  'delivery',
  'dine_in',
  'reservable',
  'curbside_pickup',
] as const;

export type ServiceFieldKey = (typeof SERVICE_FIELD_KEYS)[number];

export type ServiceFacts = Partial<Record<ServiceFieldKey, boolean | null>>;

export interface ResolveInput {
  google?: ServiceFacts;
  scrape?: ServiceFacts;
  manual?: ServiceFacts;
}

export interface ConflictRecord {
  sources: string[];
  values: Record<string, boolean>;
}

export type ServiceConflicts = Partial<Record<ServiceFieldKey, ConflictRecord>>;

export interface ResolveOutput {
  canonical: ServiceFacts;
  conflicts: ServiceConflicts;
}

/** Fixed priority order for resolution and conflict reporting */
const SOURCE_PRIORITY = ['manual', 'scrape', 'google'] as const;

// ============================================================================
// B) Extraction — VALADATA_SERVICE_FIELD_MAP
// ============================================================================

type Extractor = (attrs: Record<string, unknown>) => boolean | null | undefined;

/** Maps ServiceFieldKey → extractors for each source. */
const VALADATA_SERVICE_FIELD_MAP_V1: Record<
  ServiceFieldKey,
  { google: Extractor; scrape: Extractor }
> = {
  takeout: {
    google: (o) => toServiceValue(o.takeout),
    scrape: (o) => toServiceValue(o.takeout ?? o.take_out),
  },
  delivery: {
    google: (o) => toServiceValue(o.delivery),
    scrape: (o) => toServiceValue(o.delivery),
  },
  dine_in: {
    google: (o) => toServiceValue(o.dine_in ?? o.dineIn),
    scrape: (o) => toServiceValue(o.dine_in ?? o.dineIn),
  },
  reservable: {
    google: (o) => toServiceValue(o.reservable),
    scrape: (o) => toServiceValue(o.reservable),
  },
  curbside_pickup: {
    google: (o) => toServiceValue(o.curbside_pickup ?? o.curbsidePickup),
    scrape: (o) => toServiceValue(o.curbside_pickup ?? o.curbsidePickup),
  },
};

/** Coerce unknown to boolean | null | undefined per contract. */
function toServiceValue(v: unknown): boolean | null | undefined {
  if (v === true || v === false) return v;
  if (v === null || (typeof v === 'string' && v.toLowerCase() === 'unknown')) return null;
  return undefined;
}

/**
 * Extract service fields from attrs.
 * For Google attrs, uses Google Places key names. For scrape, supports both snake_case and camelCase.
 * Only emits keys when value is boolean | null (explicit unknown).
 */
export function extractServiceFields(
  attrs: Record<string, unknown> | undefined,
  source: 'google' | 'scrape' = 'google'
): ServiceFacts {
  if (!attrs || typeof attrs !== 'object') return {};

  const result: ServiceFacts = {};
  for (const key of SERVICE_FIELD_KEYS) {
    const extractor = VALADATA_SERVICE_FIELD_MAP_V1[key][source];
    const value = extractor(attrs);
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ============================================================================
// C) Canonicalization — resolve with conflict reporting
// ============================================================================

/**
 * Resolve canonical service facts from multiple sources.
 * Priority: manual > scrape > google.
 * Records conflicts when 2+ sources provide different boolean values.
 */
export function resolveCanonicalServiceFacts(input: ResolveInput): ResolveOutput {
  const canonical: ServiceFacts = {};
  const conflicts: ServiceConflicts = {};

  const sources: { name: string; facts: ServiceFacts }[] = [];
  if (input.manual && Object.keys(input.manual).length > 0) {
    sources.push({ name: 'manual', facts: input.manual });
  }
  if (input.scrape && Object.keys(input.scrape).length > 0) {
    sources.push({ name: 'scrape', facts: input.scrape });
  }
  if (input.google && Object.keys(input.google).length > 0) {
    sources.push({ name: 'google', facts: input.google });
  }

  const allKeys = new Set<ServiceFieldKey>();
  for (const { facts } of sources) {
    for (const k of Object.keys(facts) as ServiceFieldKey[]) {
      if (SERVICE_FIELD_KEYS.includes(k)) allKeys.add(k);
    }
  }

  for (const field of allKeys) {
    const bySource: Array<{ source: string; value: boolean | null }> = [];
    for (const { name, facts } of sources) {
      const v = facts[field];
      if (v !== undefined) bySource.push({ source: name, value: v });
    }

    // Ignore undefined; only consider boolean | null
    const definiteValues = bySource.filter((x) => x.value === true || x.value === false);
    const hasConflict =
      definiteValues.length >= 2 &&
      new Set(definiteValues.map((x) => x.value)).size > 1;

    if (hasConflict) {
      const valuesRecord: Record<string, boolean> = {};
      for (const { source, value } of definiteValues) {
        if (value === true || value === false) valuesRecord[source] = value;
      }
      const conflictSources = Object.keys(valuesRecord).sort((a, b) => {
        const ia = SOURCE_PRIORITY.indexOf(a as (typeof SOURCE_PRIORITY)[number]);
        const ib = SOURCE_PRIORITY.indexOf(b as (typeof SOURCE_PRIORITY)[number]);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
      conflicts[field] = {
        sources: conflictSources,
        values: valuesRecord,
      };
    }

    // Pick highest-priority available value (manual > scrape > google)
    // Prefer definite boolean over null; null = unknown, skip to next source
    let chosen: boolean | null | undefined;
    for (const src of SOURCE_PRIORITY) {
      const entry = bySource.find((x) => x.source === src);
      if (entry && (entry.value === true || entry.value === false)) {
        chosen = entry.value;
        break;
      }
    }
    if (chosen === undefined && bySource.some((x) => x.value === null)) {
      chosen = null;
    }
    if (chosen !== undefined) canonical[field] = chosen;
  }

  return { canonical, conflicts };
}
