import type { CoverageAtmosphereInput } from './types';

export interface CoverageAtmosphereExtractionRow {
  isCurrent: boolean;
  atmosphereSignals: unknown;
}

interface AtmosphereSignalsLike {
  descriptors?: unknown;
  energyLevel?: unknown;
  formality?: unknown;
}

function normalizeCoverageKey(value: string): string {
  return value.trim().toLowerCase();
}

function countOccurrences(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function topByFrequency(values: string[]): string | null {
  const counts = countOccurrences(values);
  if (counts.size === 0) return null;

  const sorted = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  return sorted[0]?.[0] ?? null;
}

/**
 * Builds SceneSense-local coverage atmosphere input from extraction rows.
 * Always enforces `isCurrent` row filtering to keep callers consistent.
 */
export function buildCoverageAtmosphereInput(
  rows: CoverageAtmosphereExtractionRow[] | null | undefined
): CoverageAtmosphereInput | null {
  if (!rows?.length) return null;

  const currentRows = rows.filter((row) => row.isCurrent === true);
  if (currentRows.length === 0) return null;

  const descriptors = new Set<string>();
  const energyLevels: string[] = [];
  const formalityLevels: string[] = [];
  let sourceCount = 0;

  for (const row of currentRows) {
    const atmosphere = row.atmosphereSignals as AtmosphereSignalsLike | null;
    if (!atmosphere || typeof atmosphere !== 'object') continue;
    sourceCount++;

    if (Array.isArray(atmosphere.descriptors)) {
      for (const descriptor of atmosphere.descriptors) {
        if (typeof descriptor !== 'string') continue;
        const normalized = normalizeCoverageKey(descriptor);
        if (normalized) descriptors.add(normalized);
      }
    }

    if (typeof atmosphere.energyLevel === 'string') {
      const normalized = normalizeCoverageKey(atmosphere.energyLevel);
      if (normalized) energyLevels.push(normalized);
    }

    if (typeof atmosphere.formality === 'string') {
      const normalized = normalizeCoverageKey(atmosphere.formality);
      if (normalized) formalityLevels.push(normalized);
    }
  }

  if (sourceCount === 0) return null;

  return {
    descriptors: Array.from(descriptors).sort((a, b) => a.localeCompare(b)),
    energyLevel: topByFrequency(energyLevels),
    formality: topByFrequency(formalityLevels),
    sourceCount,
  };
}
