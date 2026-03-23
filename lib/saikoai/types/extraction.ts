/**
 * Types for SaikoAI place extraction (V2.1).
 * Output schema matches Merchant Bento fields and evidence-backed claims.
 */

export type ExtractionTrustLevel = 'official' | 'editorial' | 'ugc';
export type ExtractionConfidence = 'strong' | 'medium' | 'weak' | 'empty';
export type ExtractionMethod = 'search' | 'official' | 'manual' | 'import_only';

export interface ExtractionSourceInput {
  sourceId: string;
  publication: string;
  title: string;
  url: string;
  publishedAt?: string | null;
  content: string;
  trustLevel: ExtractionTrustLevel;
}

export interface ExtractionSourceUsed {
  sourceId: string;
  publication: string;
  title: string;
  url: string;
  publishedAt?: string | null;
  trustLevel: ExtractionTrustLevel;
}

export interface ExtractionEvidence {
  sourceId: string;
  quote: string;
}

export interface ExtractionClaim {
  fieldKey: string;
  proposedValue: string | null;
  rawValue: string | null;
  confidence: ExtractionConfidence;
  confidenceReason: string;
  evidence: ExtractionEvidence[];
  method: ExtractionMethod;
  notesForEditor: string | null;
}

export interface ExtractionOutput {
  place: {
    name: string;
    city: string;
    category: string;
  };
  sourcesUsed?: ExtractionSourceUsed[];
  claims: ExtractionClaim[];
}

export interface ExtractionInput {
  place: {
    name: string;
    city: string;
    category: string;
  };
  rawValues?: Record<string, unknown> | null;
  sources: ExtractionSourceInput[];
}
