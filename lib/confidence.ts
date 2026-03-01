/**
 * Confidence System v1 — field-level, deterministic, explainable.
 * Persisted on places; computed at sync time (not at query time).
 */

import {
  CONFIDENCE_CONFIG,
  OVERALL_CONFIDENCE_WEIGHTS,
  CONFIDENCE_V1_FIELDS,
  RAW_SOURCE_TO_CANONICAL,
  type ConfidenceV1Field,
} from './confidence-config';

/** Normalize raw source_name (e.g. from raw_record) to canonical sources.id for trust-tier lookup. */
export function normalizeSourceId(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const key = raw.trim().toLowerCase();
  return RAW_SOURCE_TO_CANONICAL[key] ?? key;
}

// --- Normalization (agreement = identical normalized value; conflict = distinct normalized values) ---

/** name: lowercase, trim, remove punctuation */
export function normalizeName(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ');
}

const ADDRESS_ABBREVS: [RegExp, string][] = [
  [/\bstreet\b/gi, 'st'],
  [/\bavenue\b/gi, 'ave'],
  [/\bboulevard\b/gi, 'blvd'],
  [/\broad\b/gi, 'rd'],
  [/\bdrive\b/gi, 'dr'],
  [/\blane\b/gi, 'ln'],
  [/\bplace\b/gi, 'pl'],
  [/\bcourt\b/gi, 'ct'],
  [/\bsuite\b/gi, 'ste'],
];

/** address: normalize abbreviations (St/Street etc), lowercase, trim */
export function normalizeAddress(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return '';
  let s = value.toLowerCase().trim();
  for (const [re, repl] of ADDRESS_ABBREVS) {
    s = s.replace(re, repl);
  }
  return s.replace(/\s+/g, ' ').trim();
}

/** phone: digits only (or E.164-ish: leading + allowed) */
export function normalizePhone(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return '';
  const digits = value.replace(/\D/g, '');
  const plus = value.trimStart().startsWith('+') ? '+' : '';
  return plus + digits;
}

/** website: extract registrable domain (hostname, strip www) for comparison */
export function normalizeWebsite(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return '';
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    let host = url.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    return host;
  } catch {
    return value.toLowerCase().trim();
  }
}

/** hours: v1 compare raw strings (no complex parser) */
export function normalizeHours(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

/** description: normalize for conflict detection (lowercase, trim, collapse whitespace) */
export function normalizeDescription(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return '';
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

const NORMALIZERS: Record<ConfidenceV1Field, (v: unknown) => string> = {
  name: (v) => normalizeName(v as string),
  address: (v) => normalizeAddress(v as string),
  phone: (v) => normalizePhone(v as string),
  website: (v) => normalizeWebsite(v as string),
  hours: normalizeHours,
  description: (v) => normalizeDescription(v as string),
};

export function normalizeFieldValue(field: ConfidenceV1Field, value: unknown): string {
  return NORMALIZERS[field](value);
}

// --- Types ---

export type ConfidenceCandidate = { value: unknown; source_id: string };

export type FieldConfidenceEntry = {
  value: string;
  score: number;
  sources: Array<{ source_id: string; value: string }>;
  winner: string;
  conflicts: string[];
};

export type ConfidenceMap = Partial<Record<ConfidenceV1Field, FieldConfidenceEntry>>;

export type CalculateFieldConfidenceConfig = {
  agreement_boost: number;
  conflict_penalty: number;
  geocode_boost: number;
};

// --- Field confidence ---

/**
 * Calculate field-level confidence.
 * Base = max trust_tier among sources supporting chosen value.
 * + agreement_boost if 2+ sources agree; - conflict_penalty if 2+ disagree.
 * + geocode_boost for address when hasLatLng.
 * Clamp to [0, 1].
 */
export function calculateFieldConfidence(
  fieldName: ConfidenceV1Field,
  candidates: ConfidenceCandidate[],
  trustTiersBySource: Record<string, number>,
  config: CalculateFieldConfidenceConfig = CONFIDENCE_CONFIG,
  options?: { chosenValue: unknown; hasLatLng?: boolean }
): { score: number; winner: string; supportingSourceIds: string[]; conflictSourceIds: string[] } {
  const normalize = NORMALIZERS[fieldName];
  const chosenNorm = options?.chosenValue != null ? normalize(options.chosenValue) : '';
  if (!chosenNorm && candidates.length === 0) {
    return { score: 0, winner: '', supportingSourceIds: [], conflictSourceIds: [] };
  }

  // Group by normalized value -> source_ids
  const byNorm = new Map<string, { raw: unknown; sourceIds: string[] }>();
  for (const c of candidates) {
    const n = normalize(c.value);
    if (n === '') continue;
    const existing = byNorm.get(n);
    if (existing) {
      if (!existing.sourceIds.includes(c.source_id)) existing.sourceIds.push(c.source_id);
    } else {
      byNorm.set(n, { raw: c.value, sourceIds: [c.source_id] });
    }
  }

  // If no chosen value, pick the normalized value with highest max trust
  let winnerNorm = chosenNorm;
  let supportingSourceIds: string[] = [];
  if (winnerNorm) {
    const entry = byNorm.get(winnerNorm);
    supportingSourceIds = entry?.sourceIds ?? [];
  }
  if (supportingSourceIds.length === 0 && byNorm.size > 0) {
    let bestTrust = -1;
    for (const [norm, entry] of byNorm) {
      const maxT = Math.max(...entry.sourceIds.map((id) => trustTiersBySource[id] ?? 0));
      if (maxT > bestTrust) {
        bestTrust = maxT;
        winnerNorm = norm;
        supportingSourceIds = entry.sourceIds;
      }
    }
  } else if (!winnerNorm && byNorm.size > 0) {
    const first = byNorm.entries().next().value as [string, { sourceIds: string[] }];
    winnerNorm = first[0];
    supportingSourceIds = first[1].sourceIds;
  }

  const conflictSourceIds = Array.from(byNorm.entries())
    .filter(([n]) => n !== winnerNorm)
    .flatMap(([, e]) => e.sourceIds);

  const base = supportingSourceIds.length
    ? Math.max(...supportingSourceIds.map((id) => trustTiersBySource[id] ?? 0))
    : 0;
  let score = base;
  if (supportingSourceIds.length >= 2) score += config.agreement_boost;
  if (conflictSourceIds.length >= 1) score -= config.conflict_penalty;
  if (fieldName === 'address' && options?.hasLatLng) score += config.geocode_boost;
  score = Math.max(0, Math.min(1, score));

  const winnerSourceId = supportingSourceIds.length
    ? supportingSourceIds.reduce((a, b) =>
        (trustTiersBySource[a] ?? 0) >= (trustTiersBySource[b] ?? 0) ? a : b
      )
    : '';

  return {
    score,
    winner: winnerSourceId,
    supportingSourceIds,
    conflictSourceIds,
  };
}

/** Build full field entry for confidence JSONB (value, score, sources, winner, conflicts).
 * Returns null unless: winner non-empty, sources.length >= 1, score from at least one known trust tier.
 */
export function buildFieldConfidenceEntry(
  fieldName: ConfidenceV1Field,
  candidates: ConfidenceCandidate[],
  trustTiersBySource: Record<string, number>,
  config: CalculateFieldConfidenceConfig,
  options?: { chosenValue: unknown; hasLatLng?: boolean }
): FieldConfidenceEntry | null {
  const chosenRaw = options?.chosenValue;
  const { score, winner, supportingSourceIds, conflictSourceIds } = calculateFieldConfidence(
    fieldName,
    candidates,
    trustTiersBySource,
    config,
    options
  );

  if (winner === '' || supportingSourceIds.length === 0) return null;
  const maxTrust = Math.max(...supportingSourceIds.map((id) => trustTiersBySource[id] ?? 0));
  if (maxTrust <= 0) return null;

  const displayValue =
    chosenRaw != null && chosenRaw !== ''
      ? String(chosenRaw)
      : candidates.find((c) => supportingSourceIds.includes(c.source_id))?.value;
  const valueStr = displayValue != null ? String(displayValue) : '';
  if (!valueStr) return null;

  const sources = candidates
    .filter((c) => supportingSourceIds.includes(c.source_id) || conflictSourceIds.includes(c.source_id))
    .map((c) => ({ source_id: c.source_id, value: String(c.value) }));
  if (sources.length === 0) return null;

  return {
    value: valueStr,
    score,
    sources,
    winner,
    conflicts: [...new Set(conflictSourceIds)],
  };
}

// --- Overall confidence ---

/**
 * Weighted average of available field scores. Missing fields excluded from denominator.
 */
export function calculateOverallConfidence(confidence: ConfidenceMap | null | undefined): number {
  if (!confidence || typeof confidence !== 'object') return 0.5;
  let sum = 0;
  let weightSum = 0;
  for (const field of CONFIDENCE_V1_FIELDS) {
    const w = OVERALL_CONFIDENCE_WEIGHTS[field];
    const entry = confidence[field];
    if (entry != null && typeof entry.score === 'number') {
      sum += entry.score * w;
      weightSum += w;
    }
  }
  if (weightSum === 0) return 0.5;
  const v = sum / weightSum;
  return Math.max(0, Math.min(1, v));
}

// --- Pipeline: build confidence from golden + raw records ---

const RAW_JSON_KEYS: Record<ConfidenceV1Field, string> = {
  name: 'name',
  address: 'address_street', // raw uses address_street; fallback 'address' below
  phone: 'phone',
  website: 'website',
  hours: 'hours',
  description: 'description',
};

function getRawValue(rawJson: unknown, field: ConfidenceV1Field): unknown {
  if (rawJson == null || typeof rawJson !== 'object') return undefined;
  const o = rawJson as Record<string, unknown>;
  const key = RAW_JSON_KEYS[field];
  let v = o[key];
  if (v === undefined && field === 'address') v = o['address'];
  return v;
}

export type RawRecordForConfidence = { raw_json: unknown; source_name: string };

export type GoldenSnapshotForConfidence = {
  name: string | null;
  address_street: string | null;
  phone: string | null;
  website: string | null;
  hours_json: unknown;
  description: string | null;
  lat: unknown;
  lng: unknown;
};

/**
 * Build full confidence map and overall score for a place from golden + linked raw records.
 * Raw source_name is normalized to canonical sources.id before trust-tier lookup.
 * Only field entries with non-empty winner, sources.length >= 1, and score from a known tier are written.
 * If zero valid entries: confidence = {}, overall_confidence = 0.5.
 *
 * When entity_links is empty (no raw records): treat the golden record as the sole source with
 * source_id = "manual_bobby" so we still write valid confidence (deterministic, explainable).
 * When entity_links is populated later, the pipeline naturally upgrades to multi-source confidence.
 */
export function computePlaceConfidence(
  golden: GoldenSnapshotForConfidence,
  rawRecords: RawRecordForConfidence[],
  trustTiersBySource: Record<string, number>,
  config: CalculateFieldConfidenceConfig = CONFIDENCE_CONFIG
): { confidence: ConfidenceMap; overall_confidence: number } {
  const hasLatLng =
    golden.lat != null &&
    golden.lng != null &&
    Number(golden.lat) !== 0 &&
    Number(golden.lng) !== 0;

  const chosenByField: Record<ConfidenceV1Field, unknown> = {
    name: golden.name,
    address: golden.address_street,
    phone: golden.phone,
    website: golden.website,
    hours: golden.hours_json,
    description: golden.description,
  };

  const confidence: ConfidenceMap = {};
  const noLinkedRaw = rawRecords.length === 0;

  for (const field of CONFIDENCE_V1_FIELDS) {
    let candidates: ConfidenceCandidate[];
    if (noLinkedRaw) {
      const val = chosenByField[field];
      if (val == null || val === '') continue;
      candidates = [{ value: val, source_id: 'manual_bobby' }];
    } else {
      candidates = rawRecords
        .map((r) => ({
          value: getRawValue(r.raw_json, field),
          source_id: normalizeSourceId(r.source_name),
        }))
        .filter((c) => c.value != null && c.value !== '' && c.source_id !== '');
    }

    const entry = buildFieldConfidenceEntry(
      field,
      candidates,
      trustTiersBySource,
      config,
      {
        chosenValue: chosenByField[field],
        hasLatLng: field === 'address' ? hasLatLng : undefined,
      }
    );
    if (entry) confidence[field] = entry;
  }

  const overall_confidence = calculateOverallConfidence(confidence);
  return { confidence, overall_confidence };
}
