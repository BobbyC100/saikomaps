// lib/survivorship-v2.ts
import { getSourceQuality, isKnownSource } from "@/lib/source-registry";

export type Candidate<T> = {
  source: string;
  value: T | null | undefined;
  observed_at?: Date | string; // ingestion timestamp if you have it
};

export type Winner<T> = {
  value: T;
  source: string;
  confidence: number;
  observed_at?: string; // ISO
  known_source: boolean;
};

export function pickBestValue<T>(
  field: string,
  candidates: Array<Candidate<T>>,
): Winner<T> | null {
  const scored = candidates
    .filter((c) => c.value != null && c.value !== "")
    .map((c) => {
      const confidence = getSourceQuality(c.source);
      const known_source = isKnownSource(c.source);
      const observed_at =
        c.observed_at ? new Date(c.observed_at).toISOString() : undefined;

      // Unknown source warning
      if (!known_source) {
        console.warn(`[provenance] unknown source "${c.source}" for field "${field}"`);
      }

      return { ...c, confidence, known_source, observed_at };
    })
    // primary sort: confidence
    .sort((a, b) => b.confidence - a.confidence || compareObservedAt(b, a));

  const top = scored[0];
  if (!top) return null;

  // If top is unknown source (confidence 0), treat as no winner
  if (top.confidence <= 0) return null;

  return {
    value: top.value as T,
    source: top.source,
    confidence: top.confidence,
    observed_at: top.observed_at,
    known_source: top.known_source,
  };
}

function compareObservedAt(a: { observed_at?: string }, b: { observed_at?: string }) {
  // Tie-breaker: prefer newer observed_at when confidence ties
  if (!a.observed_at && !b.observed_at) return 0;
  if (a.observed_at && !b.observed_at) return -1;
  if (!a.observed_at && b.observed_at) return 1;
  return a.observed_at! > b.observed_at! ? -1 : a.observed_at! < b.observed_at! ? 1 : 0;
}
