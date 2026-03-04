/**
 * Pre-Ingest Validator for ERA CSV
 *
 * Prevents "unlinkable" rows: rows that ingest fine but can't resolve because
 * they lack any identity anchor (GPID, parsable Google Maps URL, or geocodable address).
 *
 * Validator rules:
 * - Required: Name (non-empty)
 * - Required: At least 1 of 3 identity anchors:
 *   1. GooglePlaceID
 *   2. GoogleMapsURL (parsable to GPID via extractPlaceId)
 *   3. Address (non-empty) — only valid if geocoding is implemented
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { parse } from 'papaparse';
import { extractPlaceId } from './utils/googleMapsParser';

// Geocoding is not implemented in ingest-editorial-csv; Address alone is insufficient
const GEOCODING_AVAILABLE = false;

/** Reject reason codes — consistent across batches */
export const REJECT_REASONS = {
  MISSING_NAME: 'MISSING_NAME',
  NO_GOOGLE_PLACE_ID: 'NO_GOOGLE_PLACE_ID',
  NO_PARSABLE_GOOGLE_MAPS_URL: 'NO_PARSABLE_GOOGLE_MAPS_URL',
  ADDRESS_ONLY_NO_GEOCODING: 'ADDRESS_ONLY_NO_GEOCODING',
} as const;

export type RejectReason = (typeof REJECT_REASONS)[keyof typeof REJECT_REASONS];

export interface ValidationResult {
  rowIndex: number;
  pass: boolean;
  reason?: RejectReason;
  name?: string;
  /** Human-readable explanation */
  message?: string;
}

export interface ValidationSummary {
  total: number;
  pass: number;
  fail: number;
  byReason: Record<RejectReason, number>;
}

/** Flexible column lookup: tries multiple possible header names (case-insensitive) */
function getColumn<T extends Record<string, unknown>>(
  row: T,
  ...candidates: string[]
): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    const key = keys.find((k) => k.toLowerCase() === lower);
    if (key) {
      const val = row[key];
      if (val != null && String(val).trim() !== '') {
        return String(val).trim();
      }
      return undefined;
    }
  }
  return undefined;
}

/** Extract values from a row using flexible column names (ERA + editorial formats) */
export function extractRowValues(row: Record<string, unknown>): {
  name: string | undefined;
  googlePlaceId: string | undefined;
  googleMapsUrl: string | undefined;
  address: string | undefined;
} {
  const name = getColumn(
    row,
    'name',
    'Name',
    'name',
    'title',
    'Title'
  );
  const googlePlaceId = getColumn(
    row,
    'google_place_id',
    'GooglePlaceID',
    'Google Place ID',
    'place_id'
  );
  const googleMapsUrl = getColumn(
    row,
    'google_maps_url',
    'GoogleMapsURL',
    'Google Maps URL',
    'url',
    'URL'
  );
  const address = getColumn(
    row,
    'street_address',
    'street address',
    'Address',
    'address'
  );

  return { name, googlePlaceId, googleMapsUrl, address };
}

/**
 * Validate a single row. Returns pass/fail and reason.
 */
export function validateRow(
  row: Record<string, unknown>,
  rowIndex: number
): ValidationResult {
  const { name, googlePlaceId, googleMapsUrl, address } = extractRowValues(row);

  // Required: Name
  if (!name || name.trim() === '') {
    return {
      rowIndex,
      pass: false,
      reason: REJECT_REASONS.MISSING_NAME,
      name: String((row as Record<string, unknown>).name ?? (row as Record<string, unknown>).Name ?? ''),
      message: 'Name is empty or missing',
    };
  }

  // Anchor 1: GooglePlaceID
  if (googlePlaceId && googlePlaceId.length > 0) {
    return { rowIndex, pass: true, name };
  }

  // Anchor 2: GoogleMapsURL parsable to GPID
  if (googleMapsUrl) {
    const parsed = extractPlaceId(googleMapsUrl);
    if (parsed) {
      return { rowIndex, pass: true, name };
    }
    return {
      rowIndex,
      pass: false,
      reason: REJECT_REASONS.NO_PARSABLE_GOOGLE_MAPS_URL,
      name,
      message: 'Google Maps URL provided but could not extract place_id',
    };
  }

  // Anchor 3: Address (only if geocoding exists)
  if (address && address.trim().length > 0) {
    if (GEOCODING_AVAILABLE) {
      return { rowIndex, pass: true, name };
    }
    return {
      rowIndex,
      pass: false,
      reason: REJECT_REASONS.ADDRESS_ONLY_NO_GEOCODING,
      name,
      message: 'Address only — geocoding not implemented; add GooglePlaceID or GoogleMapsURL',
    };
  }

  return {
    rowIndex,
    pass: false,
    reason: REJECT_REASONS.NO_GOOGLE_PLACE_ID,
    name,
    message: 'No identity anchor: missing GooglePlaceID, GoogleMapsURL, and Address',
  };
}

/**
 * Validate all rows in a CSV file.
 */
export function validateCsv(csvPath: string): {
  results: ValidationResult[];
  summary: ValidationSummary;
  rows: Record<string, unknown>[];
} {
  const csvContent = readFileSync(csvPath, 'utf-8');
  const parsed = parse<Record<string, unknown>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse errors: ${JSON.stringify(parsed.errors)}`);
  }

  const rows = parsed.data;
  const results: ValidationResult[] = [];
  const byReason: Record<RejectReason, number> = {
    [REJECT_REASONS.MISSING_NAME]: 0,
    [REJECT_REASONS.NO_GOOGLE_PLACE_ID]: 0,
    [REJECT_REASONS.NO_PARSABLE_GOOGLE_MAPS_URL]: 0,
    [REJECT_REASONS.ADDRESS_ONLY_NO_GEOCODING]: 0,
  };

  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], i + 1); // 1-based for display
    results.push(result);
    if (!result.pass && result.reason) {
      byReason[result.reason]++;
    }
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;

  return {
    results,
    summary: {
      total: rows.length,
      pass,
      fail,
      byReason,
    },
    rows,
  };
}

/**
 * Validate CSV and write rejects file. Returns rejects path if any failures.
 */
export function validateAndWriteRejects(
  csvPath: string,
  batchId: string
): { summary: ValidationSummary; rejectsPath: string | null } {
  const { results, summary, rows } = validateCsv(csvPath);
  const rejectsPath =
    summary.fail > 0
      ? writeRejects(csvPath, batchId, results, rows)
      : null;
  return { summary, rejectsPath };
}

/**
 * Write rejected rows to data/intake/_rejects/<batch>_rejects.csv
 * Includes original row data plus reject_reason and reject_message columns.
 */
export function writeRejects(
  csvPath: string,
  batchId: string,
  results: ValidationResult[],
  originalRows: Record<string, unknown>[]
): string {
  const rejectsDir = join(dirname(csvPath), '_rejects');
  mkdirSync(rejectsDir, { recursive: true });

  const baseName = batchId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const rejectsPath = join(rejectsDir, `${baseName}_rejects.csv`);

  const failed = results.filter((r) => !r.pass);
  if (failed.length === 0) {
    return rejectsPath;
  }

  // Get headers from first original row
  const sampleRow = originalRows[0];
  const originalHeaders = sampleRow ? Object.keys(sampleRow) : [];
  const headers = [...originalHeaders, 'reject_reason', 'reject_message'];

  const lines: string[] = [headers.map(escapeCsv).join(',')];

  for (const r of failed) {
    const row = originalRows[r.rowIndex - 1] ?? {};
    const values = originalHeaders.map((h) => escapeCsv(String(row[h] ?? '')));
    values.push(escapeCsv(r.reason ?? ''));
    values.push(escapeCsv(r.message ?? ''));
    lines.push(values.join(','));
  }

  writeFileSync(rejectsPath, lines.join('\n'), 'utf-8');
  return rejectsPath;
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
