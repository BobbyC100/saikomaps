/**
 * SAIKO Website Enrichment Spec v1.1 — payload and signal types
 */

export interface EnrichmentSignals {
  inferred_category: string | null;
  inferred_cuisine: string[] | null;
  reservation_provider: string | null;
  reservation_url: string | null;
  ordering_provider: string | null;
  ordering_url: string | null;
  menu_url: string | null;
  social_links: Record<string, string> | null;
}

export interface EnrichmentRaw {
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  lang: string | null;
  homepage_text_sample?: string;
  about_text_sample?: string;
}

export interface EnrichmentPayload {
  place_id: string;
  source_url: string;
  final_url: string | null;
  http_status: number | null;
  schema_types: string[];
  signals: EnrichmentSignals;
  confidence: number;
  notes: string[];
  raw: EnrichmentRaw;
}

export interface FetchResult {
  url: string;
  finalUrl: string | null;
  status: number;
  html: string;
  contentType: string | null;
}
