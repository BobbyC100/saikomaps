/**
 * Shared helpers for compute-energy and compute-tag-scores scripts.
 * Extracted from backfill-energy-tag-engine.ts.
 */

export type GoldenRow = {
  canonical_id: string;
  slug: string;
  description: string | null;
  about_copy: string | null;
  google_places_attributes: unknown;
  category: string | null;
};

export function parseAttrs(attrs: unknown): { liveMusic?: boolean; goodForGroups?: boolean } {
  if (!attrs || typeof attrs !== 'object') return {};
  const o = attrs as Record<string, unknown>;
  return {
    liveMusic: o.liveMusic === true || o.live_music === true,
    goodForGroups: o.goodForGroups === true || o.good_for_groups === true,
  };
}

export function isBarForward(gr: { category?: string | null; google_places_attributes?: unknown }): boolean {
  const cat = (gr.category ?? '').toLowerCase();
  if (/bar|wine bar|cocktail|pub/.test(cat)) return true;
  const attrs = gr.google_places_attributes as Record<string, unknown> | null;
  if (attrs && typeof attrs === 'object') {
    const types = attrs.types as string[] | undefined;
    if (types?.some((t) => /bar|cafe|night_club/.test(t))) return true;
  }
  return false;
}

export function buildCoverageAboutText(gr: { description?: string | null; about_copy?: string | null }): string {
  const parts = [gr.description, gr.about_copy].filter(Boolean) as string[];
  return parts.join('\n\n');
}
