/**
 * Types for SaikoAI place extraction (V2.1).
 * Output schema matches Merchant Bento fields and evidence-backed claims.
 */

export type ExtractionTrustLevel = 'official' | 'editorial' | 'ugc';
export type ExtractionConfidence = 'strong' | 'medium' | 'weak' | 'empty';
export type ExtractionMethod = 'search' | 'official' | 'manual' | 'import_only';

export interface ExtractionSourceInput {
  source_id: string;
  publication: string;
  title: string;
  url: string;
  published_at?: string | null;
  content: string;
  trust_level: ExtractionTrustLevel;
}

export interface ExtractionSourceUsed {
  source_id: string;
  publication: string;
  title: string;
  url: string;
  published_at?: string | null;
  trust_level: ExtractionTrustLevel;
}

export interface ExtractionEvidence {
  source_id: string;
  quote: string;
}

export interface ExtractionClaim {
  field_key: string;
  proposed_value: string | null;
  raw_value: string | null;
  confidence: ExtractionConfidence;
  confidence_reason: string;
  evidence: ExtractionEvidence[];
  method: ExtractionMethod;
  notes_for_editor: string | null;
}

export interface ExtractionOutput {
  place: {
    name: string;
    city: string;
    category: string;
  };
  sources_used?: ExtractionSourceUsed[];
  claims: ExtractionClaim[];
}

export interface ExtractionInput {
  place: {
    name: string;
    city: string;
    category: string;
  };
  raw_values?: Record<string, unknown> | null;
  sources: ExtractionSourceInput[];
}
