// lib/source-registry.ts
//
// Approved source registry for Saiko editorial coverage.
// Bobby maintains this list. A source enters only if it clearly improves
// cultural interpretation or factual coverage per SOURCE-INTEGRATION-V1.
//
// Used by: backfill scripts, editorial discovery pipeline, confidence scoring,
// coverage-apply-description, source name derivation.

// ---------------------------------------------------------------------------
// Quality scores (legacy API — preserved for existing callers)
// ---------------------------------------------------------------------------

export const SOURCE_QUALITY = {
  editorial_eater: 0.95,
  editorial_infatuation: 0.95,
  editorial_latimes: 0.95,
  editorial_michelin: 0.95,
  editorial_timeout: 0.90,
  editorial_bonappetit: 0.90,
  editorial_lataco: 0.85,
  editorial_laweekly: 0.85,
  editorial_lamag: 0.85,
  editorial_nytimes: 0.90,
  editorial_gq: 0.85,
  editorial_laist: 0.85,
  editorial_dandyeats: 0.85,
  editorial_foodjournalmag: 0.85,
  editorial_foodlifemag: 0.85,
  editorial_resy: 0.90,
  editorial_kcrw: 0.90,
  editorial_consumingla: 0.85,
  editorial_spillthebeans: 0.85,
  editorial_foodgps: 0.85,
  editorial_ediblela: 0.85,
  editorial_gastronomyblog: 0.85,
  primary_website: 0.90,
  google_places: 0.85,
  foursquare: 0.70,
  user_submitted: 0.50,
} as const;

export type SourceKey = keyof typeof SOURCE_QUALITY;

export function getSourceQuality(source: string): number {
  const score = SOURCE_QUALITY[source as SourceKey];
  return score ?? 0; // IMPORTANT: unknown sources lose by default
}

export function isKnownSource(source: string): boolean {
  return (source as SourceKey) in SOURCE_QUALITY;
}

// ---------------------------------------------------------------------------
// Approved editorial source registry (v2)
// ---------------------------------------------------------------------------

export interface ApprovedSource {
  /** Machine key matching source_registry.id convention */
  id: string;
  /** Human-readable publication name for display */
  displayName: string;
  /** Primary domain(s) — used for URL matching and site-scoped search */
  domains: string[];
  /** Quality score 0–1 for confidence weighting */
  qualityScore: number;
  /** Trust tier 1–5 (1 = highest) matching source_registry.trust_tier */
  trustTier: 1 | 2 | 3;
  /** What kind of coverage this source typically provides */
  coverageProfile: string;
  /** Whether to include in automated editorial discovery searches */
  discoveryEnabled: boolean;
}

/**
 * Curated list of approved editorial sources.
 * Order: roughly by editorial signal density for LA restaurants.
 */
export const APPROVED_EDITORIAL_SOURCES: ApprovedSource[] = [
  {
    id: 'eater_la',
    displayName: 'Eater LA',
    domains: ['la.eater.com'],
    qualityScore: 0.95,
    trustTier: 1,
    coverageProfile: 'Opening coverage, reviews, lists (Eater 38), closures',
    discoveryEnabled: true,
  },
  {
    id: 'infatuation',
    displayName: 'The Infatuation',
    domains: ['theinfatuation.com'],
    qualityScore: 0.95,
    trustTier: 1,
    coverageProfile: 'Reviews, neighborhood guides, curated picks',
    discoveryEnabled: true,
  },
  {
    id: 'latimes_food',
    displayName: 'Los Angeles Times',
    domains: ['latimes.com'],
    qualityScore: 0.95,
    trustTier: 1,
    coverageProfile: 'Reviews, criticism, features, 101 Best list',
    discoveryEnabled: true,
  },
  {
    id: 'michelin_guide',
    displayName: 'Michelin Guide',
    domains: ['guide.michelin.com'],
    qualityScore: 0.95,
    trustTier: 1,
    coverageProfile: 'Stars, Bib Gourmand, recommendations',
    discoveryEnabled: true,
  },
  {
    id: 'timeout_la',
    displayName: 'TimeOut',
    domains: ['timeout.com'],
    qualityScore: 0.90,
    trustTier: 2,
    coverageProfile: 'Reviews, lists, neighborhood guides',
    discoveryEnabled: true,
  },
  {
    id: 'bonappetit',
    displayName: 'Bon Appétit',
    domains: ['bonappetit.com'],
    qualityScore: 0.90,
    trustTier: 2,
    coverageProfile: 'Features, Hot 10, national lists',
    discoveryEnabled: true,
  },
  {
    id: 'la_taco',
    displayName: 'LA Taco',
    domains: ['lataco.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Street food, neighborhood coverage, openings',
    discoveryEnabled: true,
  },
  {
    id: 'la_weekly',
    displayName: 'LA Weekly',
    domains: ['laweekly.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Reviews, features, neighborhood guides',
    discoveryEnabled: true,
  },
  {
    id: 'la_magazine',
    displayName: 'Los Angeles Magazine',
    domains: ['lamag.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Features, lists, city culture',
    discoveryEnabled: true,
  },
  {
    id: 'nytimes',
    displayName: 'New York Times',
    domains: ['nytimes.com'],
    qualityScore: 0.90,
    trustTier: 1,
    coverageProfile: 'National reviews, features, lists',
    discoveryEnabled: true,
  },
  {
    id: 'gq',
    displayName: 'GQ',
    domains: ['gq.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Features, shopping guides, culture',
    discoveryEnabled: true,
  },
  {
    id: 'sf_gate',
    displayName: 'SFGate',
    domains: ['sfgate.com'],
    qualityScore: 0.80,
    trustTier: 3,
    coverageProfile: 'Regional food coverage, features',
    discoveryEnabled: false,
  },
  {
    id: 'insidehook',
    displayName: 'InsideHook',
    domains: ['insidehook.com'],
    qualityScore: 0.80,
    trustTier: 3,
    coverageProfile: 'Features, city guides',
    discoveryEnabled: false,
  },
  {
    id: 'hyperallergic',
    displayName: 'Hyperallergic',
    domains: ['hyperallergic.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Art, culture, gallery coverage',
    discoveryEnabled: true,
  },
  {
    id: 'ocula',
    displayName: 'Ocula',
    domains: ['ocula.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Art gallery profiles, exhibitions',
    discoveryEnabled: true,
  },
  {
    id: 'thrasher_magazine',
    displayName: 'Thrasher Magazine',
    domains: ['thrashermagazine.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Skate culture, skatepark features',
    discoveryEnabled: true,
  },
  {
    id: 'modern_luxury',
    displayName: 'Modern Luxury',
    domains: ['modernluxury.com'],
    qualityScore: 0.80,
    trustTier: 3,
    coverageProfile: 'Lifestyle, dining, city culture',
    discoveryEnabled: false,
  },
  {
    id: 'laist',
    displayName: 'LAist',
    domains: ['laist.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Local food news, openings, neighborhood coverage',
    discoveryEnabled: true,
  },
  {
    id: 'resy_editorial',
    displayName: 'Resy Editorial',
    domains: ['blog.resy.com'],
    qualityScore: 0.90,
    trustTier: 1,
    coverageProfile: 'Curated picks, city guides, editorial features',
    discoveryEnabled: true,
  },
  {
    id: 'kcrw_good_food',
    displayName: 'KCRW Good Food',
    domains: ['kcrw.com'],
    qualityScore: 0.90,
    trustTier: 1,
    coverageProfile: 'Broadcast food journalism, restaurant features, interviews',
    discoveryEnabled: true,
  },
  {
    id: 'consuming_la',
    displayName: 'Consuming LA',
    domains: ['consumingla.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'LA restaurant coverage, neighborhood guides',
    discoveryEnabled: true,
  },
  {
    id: 'spill_the_beans',
    displayName: 'Spill the Beans',
    domains: ['pleasespillthebeans.substack.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'LA food newsletter, openings, reviews',
    discoveryEnabled: true,
  },
  {
    id: 'food_gps',
    displayName: 'Food GPS',
    domains: ['foodgps.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'LA restaurant coverage, openings, features',
    discoveryEnabled: true,
  },
  {
    id: 'edible_la',
    displayName: 'Edible LA',
    domains: ['ediblela.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Local food culture, farm-to-table, sustainability',
    discoveryEnabled: true,
  },
  {
    id: 'gastronomy_blog',
    displayName: 'Gastronomy Blog',
    domains: ['gastronomyblog.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'LA restaurant reviews, food culture',
    discoveryEnabled: true,
  },
  {
    id: 'dandy_eats',
    displayName: 'Dandy Eats',
    domains: ['dandyeats.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'LA restaurant coverage, reviews, features',
    discoveryEnabled: true,
  },
  {
    id: 'food_journal_magazine',
    displayName: 'Food Journal Magazine',
    domains: ['foodjournalmagazine.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Food culture, restaurant features',
    discoveryEnabled: true,
  },
  {
    id: 'food_life_mag',
    displayName: 'Food Life Magazine',
    domains: ['foodlifemag.com'],
    qualityScore: 0.85,
    trustTier: 2,
    coverageProfile: 'Food culture, dining features',
    discoveryEnabled: true,
  },
];

// ---------------------------------------------------------------------------
// Lookup utilities
// ---------------------------------------------------------------------------

/** Set of all approved editorial domains for fast matching */
const _approvedDomainSet = new Set<string>(
  APPROVED_EDITORIAL_SOURCES.flatMap((s) => s.domains)
);

/** Map from domain → ApprovedSource for derivation */
const _domainToSource = new Map<string, ApprovedSource>();
for (const source of APPROVED_EDITORIAL_SOURCES) {
  for (const domain of source.domains) {
    _domainToSource.set(domain, source);
  }
}

/**
 * Check if a URL belongs to an approved editorial source.
 */
export function isApprovedEditorialUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // Check exact hostname
    if (_approvedDomainSet.has(hostname)) return true;
    // Check base domain (e.g., la.eater.com → eater.com not in set, but la.eater.com is)
    // Also check if the hostname ends with any approved domain
    for (const domain of _approvedDomainSet) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Find the approved source record for a URL. Returns undefined if not approved.
 */
export function findApprovedSource(url: string): ApprovedSource | undefined {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // Exact match
    if (_domainToSource.has(hostname)) return _domainToSource.get(hostname);
    // Subdomain match (e.g., blog.resy.com → check resy.com)
    for (const [domain, source] of _domainToSource) {
      if (hostname.endsWith('.' + domain)) return source;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Derive a publication name from a URL.
 * If the URL matches an approved source, returns its displayName.
 * Otherwise returns a cleaned-up hostname as fallback.
 */
export function derivePublicationName(url: string): string {
  const approved = findApprovedSource(url);
  if (approved) return approved.displayName;

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    const name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Unknown';
  }
}

/**
 * Get all approved sources that have discovery enabled.
 */
export function getDiscoverySources(): ApprovedSource[] {
  return APPROVED_EDITORIAL_SOURCES.filter((s) => s.discoveryEnabled);
}
