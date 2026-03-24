/**
 * Entity payload assembly — macro boundary for product surfaces.
 * VALADATA: canonical facts + conflicts are computed here.
 */

import {
  resolveCanonicalServiceFacts,
  extractServiceFields,
  type ResolveInput,
} from '@/lib/valadata/resolve/canonical-facts';

export interface EntityFactsInput {
  googleAttrs?: Record<string, unknown> | null;
  scrapeAttrs?: Record<string, unknown> | null;
  manualOverrides?: Partial<Record<string, boolean>> | null;
}

export interface EntityFactsOutput {
  facts: { service: Partial<Record<string, boolean | null>> };
  conflicts: { service: Partial<Record<string, { sources: string[]; values: Record<string, boolean> }>> };
}

/**
 * Compute canonical service facts for entity payload.
 * Call at macro boundary when assembling API response.
 */
export function buildEntityServiceFacts(input: EntityFactsInput): EntityFactsOutput {
  const google = extractServiceFields(input.googleAttrs ?? undefined, 'google');
  const scrape = extractServiceFields(input.scrapeAttrs ?? undefined, 'scrape');
  const manual = input.manualOverrides ?? {};

  const resolveInput: ResolveInput = {
    google: Object.keys(google).length > 0 ? google : undefined,
    scrape: Object.keys(scrape).length > 0 ? scrape : undefined,
    manual: Object.keys(manual).length > 0 ? manual : undefined,
  };

  const { canonical, conflicts } = resolveCanonicalServiceFacts(resolveInput);

  return {
    facts: { service: canonical },
    conflicts: { service: conflicts },
  };
}
