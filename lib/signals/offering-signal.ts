export type OfferingSignalCategory =
  | 'food'
  | 'wine'
  | 'cocktail'
  | 'beer'
  | 'na'
  | 'service';

export interface OfferingSignalSource {
  sourceType: string;
  sourceUrl?: string;
  extractedAt: string;
  extractor?: string;
}

export interface OfferingSignal {
  category: OfferingSignalCategory;
  type: string;
  value: string;
  confidence: number;
  sources: OfferingSignalSource[];
}
