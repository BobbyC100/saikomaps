/**
 * Coverage Evidence Normalizer — Phase 5 Wiring
 *
 * Single normalization layer between raw coverage_source_extractions and
 * the five downstream interpretation pipelines.
 *
 * Architecture: SAIKO FIELDS layer (not Data Layer, not Traces)
 *
 * Spec: docs/architecture/coverage-evidence-normalization-v1.md
 *
 * Key invariants:
 *   - All downstream pipelines consume this function, never raw extractions
 *   - Facts and interpretations are separated at this boundary
 *   - Origin story is split into factual anchors and editorial framing
 *   - People data carries staleness bands
 *   - Conflict resolution: best-source-first for facts, union-with-confidence for interpretations
 *   - Idempotent: same extractions → same output
 *   - No AI calls — pure deterministic logic
 */

import { db } from '@/lib/db';
import type {
  PersonExtraction,
  FoodEvidence,
  BeverageEvidence,
  ServiceEvidence,
  AtmosphereSignals,
  OriginStory,
  AccoladeEntry,
  PullQuoteEntry,
} from './extract-source-prompt';

// ---------------------------------------------------------------------------
// Output contract — the canonical shape all downstream pipelines consume
// ---------------------------------------------------------------------------

export interface CoverageEvidence {
  entityId: string;
  sourceCount: number;
  materializedAt: Date;

  facts: CoverageFacts;
  interpretations: CoverageInterpretations;
  provenance: CoverageProvenance;
}

// --- Facts ---

export interface CoverageFacts {
  /** Named people affiliated with this entity */
  people: NormalizedPerson[];

  /** Specific dishes, items, or menu elements mentioned */
  dishes: NormalizedMention[];

  /** Specific producers, purveyors, or sourcing mentioned */
  producers: NormalizedMention[];

  /** Accolades, awards, list inclusions */
  accolades: NormalizedAccolade[];

  /** Pull quotes (verbatim editorial language) */
  pullQuotes: NormalizedPullQuote[];

  /** Origin story — factual anchors (founding year, founder names, lineage) */
  originStoryFacts: NormalizedOriginStoryFacts | null;

  /** Origin story — editorial framing (tone, mythos, narrative archetype) */
  originStoryInterpretation: NormalizedOriginStoryInterpretation | null;

  /** Event/service facts explicitly stated */
  eventCapabilities: {
    privateDining: { mentioned: boolean; evidence: string[] };
    groupDining: { mentioned: boolean; evidence: string[] };
    catering: { mentioned: boolean; evidence: string[] };
  };
}

export interface NormalizedPerson {
  name: string;
  role: string;
  isPrimary: boolean;
  sourceCount: number;
  mostRecentSource: string;
  mostRecentDate: Date | null;
  stalenessBand: 'current' | 'aging' | 'stale';
}

export interface NormalizedMention {
  text: string;
  sourceCount: number;
  sources: string[];
}

export interface NormalizedAccolade {
  name: string;
  type: 'list' | 'award' | 'star' | 'nomination' | 'recognition';
  source: string | null;
  year: number | null;
  sourceCount: number;
}

export interface NormalizedPullQuote {
  text: string;
  publication: string;
  articleTitle: string | null;
  publishedAt: Date | null;
  relevanceScore: number;
}

export interface NormalizedOriginStoryFacts {
  foundingYear: string | null;
  founderNames: string[];
  geographicOrigin: string | null;
  lineage: string | null;
  sourceCount: number;
}

export interface NormalizedOriginStoryInterpretation {
  archetype: string | null;
  tone: string | null;
  narrative: string | null;
  labels: string[];
  sourceCount: number;
  consensus: 'unanimous' | 'majority' | 'conflicting';
}

// --- Interpretations ---

export interface CoverageInterpretations {
  food: {
    cuisinePosture: string | null;
    cuisinePostureAgreement: number;
    cookingApproaches: string[];
    menuFormats: string[];
    specialtySignals: {
      sushi: boolean;
      ramen: boolean;
      taco: boolean;
      pizza: boolean;
      dumpling: boolean;
    };
  };

  beverage: {
    wine: { mentioned: boolean; naturalFocus: boolean; listDepth: string | null; sommelierMentioned: boolean };
    cocktail: { mentioned: boolean; programExists: boolean };
    beer: { mentioned: boolean; craftSelection: boolean };
    nonAlcoholic: { mentioned: boolean; zeroproof: boolean };
    coffeeTea: { mentioned: boolean; specialtyProgram: boolean };
  };

  service: {
    serviceModel: string | null;
    reservationPosture: string | null;
    diningFormats: string[];
  };

  atmosphere: {
    descriptors: string[];
    energyLevel: string | null;
    formality: string | null;
  };

  sentiment: {
    dominant: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
    distribution: Record<string, number>;
  };
}

// --- Provenance ---

export interface CoverageProvenance {
  sources: {
    publicationName: string;
    url: string;
    articleType: string;
    publishedAt: Date | null;
    relevanceScore: number;
    trustTier: 1 | 2 | 3;
  }[];

  totalSources: number;
  tier1Sources: number;
  tier2Sources: number;
  tier3Sources: number;
  oldestSource: Date | null;
  newestSource: Date | null;
  medianRelevance: number;
}

// ---------------------------------------------------------------------------
// Internal types — the raw DB row shape after Prisma query
// ---------------------------------------------------------------------------

interface RawExtractionRow {
  id: string;
  coverageSourceId: string;
  entityId: string;
  extractionVersion: string;
  extractedAt: Date;
  isCurrent: boolean;
  people: unknown;
  foodEvidence: unknown;
  beverageEvidence: unknown;
  serviceEvidence: unknown;
  atmosphereSignals: unknown;
  originStory: unknown;
  accolades: unknown;
  pullQuotes: unknown;
  sentiment: string | null;
  articleType: string | null;
  relevanceScore: number | null;
  coverageSource: {
    id: string;
    url: string;
    publicationName: string;
    articleTitle: string | null;
    publishedAt: Date | null;
    sourceType: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Staleness thresholds for people data (in months) */
const STALENESS_CURRENT_MONTHS = 12;
const STALENESS_AGING_MONTHS = 24;

/** Minimum relevance score to include a source in normalization */
const MIN_RELEVANCE_SCORE = 0.2;

/**
 * Tier 1 publications — highest editorial trust.
 * TODO: Move to a config/registry once the approved source list is formalized.
 */
const TIER_1_PUBLICATIONS = new Set([
  'los angeles times',
  'la times',
  'new york times',
  'eater',
  'eater la',
  'eater los angeles',
  'bon appétit',
  'bon appetit',
  'food & wine',
  'food and wine',
  'michelin guide',
  'james beard foundation',
  'infatuation',
  'the infatuation',
]);

const TIER_2_PUBLICATIONS = new Set([
  'timeout',
  'time out',
  'thrillist',
  'condé nast traveler',
  'conde nast traveler',
  'departures',
  'esquire',
  'gq',
  'saveur',
  'wine enthusiast',
  'wine spectator',
  'la weekly',
  'los angeles magazine',
  'la magazine',
  'sfgate',
  'sf chronicle',
  'san francisco chronicle',
]);

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Materializes normalized coverage evidence for a single entity.
 *
 * This is the ONLY function downstream pipelines should call to get
 * coverage data. It queries current extractions, merges across sources,
 * resolves conflicts, and returns the canonical CoverageEvidence contract.
 *
 * Returns null if the entity has no current extractions.
 */
export async function materializeCoverageEvidence(
  entityId: string,
): Promise<CoverageEvidence | null> {
  // Query all current extractions with their parent coverage_source metadata
  const rows = await db.coverage_source_extractions.findMany({
    where: {
      entityId,
      isCurrent: true,
    },
    include: {
      coverageSource: {
        select: {
          id: true,
          url: true,
          publicationName: true,
          articleTitle: true,
          publishedAt: true,
          sourceType: true,
        },
      },
    },
    orderBy: {
      extractedAt: 'desc',
    },
  }) as unknown as RawExtractionRow[];

  if (rows.length === 0) return null;

  // Filter out low-relevance extractions
  const relevant = rows.filter(
    (r) => r.relevanceScore === null || r.relevanceScore >= MIN_RELEVANCE_SCORE,
  );

  if (relevant.length === 0) return null;

  const now = new Date();

  return {
    entityId,
    sourceCount: relevant.length,
    materializedAt: now,
    facts: materializeFacts(relevant, now),
    interpretations: materializeInterpretations(relevant),
    provenance: materializeProvenance(relevant),
  };
}

// ---------------------------------------------------------------------------
// Facts materialization
// ---------------------------------------------------------------------------

function materializeFacts(rows: RawExtractionRow[], now: Date): CoverageFacts {
  return {
    people: normalizePeople(rows, now),
    dishes: normalizeDishes(rows),
    producers: [], // Producers are not yet extracted — placeholder for future
    accolades: normalizeAccolades(rows),
    pullQuotes: normalizePullQuotes(rows),
    originStoryFacts: normalizeOriginStoryFacts(rows),
    originStoryInterpretation: normalizeOriginStoryInterpretation(rows),
    eventCapabilities: normalizeEventCapabilities(rows),
  };
}

// --- People ---

function normalizePeople(rows: RawExtractionRow[], now: Date): NormalizedPerson[] {
  // Collect all person mentions across sources with source metadata
  const mentions: {
    person: PersonExtraction;
    publication: string;
    publishedAt: Date | null;
  }[] = [];

  for (const row of rows) {
    const people = row.people as PersonExtraction[] | null;
    if (!Array.isArray(people)) continue;
    for (const p of people) {
      if (!p.name || !p.role) continue;
      mentions.push({
        person: p,
        publication: row.coverageSource.publicationName,
        publishedAt: row.coverageSource.publishedAt,
      });
    }
  }

  if (mentions.length === 0) return [];

  // Group by normalized key: lowercase name + role
  const groups = new Map<string, typeof mentions>();
  for (const m of mentions) {
    const key = `${m.person.name.toLowerCase().trim()}::${m.person.role.toLowerCase().trim()}`;
    const group = groups.get(key) ?? [];
    group.push(m);
    groups.set(key, group);
  }

  // Build normalized person from each group
  const result: NormalizedPerson[] = [];
  for (const group of groups.values()) {
    // Best-source-first: most recent source wins for canonical representation
    const sorted = [...group].sort((a, b) => {
      const aDate = a.publishedAt?.getTime() ?? 0;
      const bDate = b.publishedAt?.getTime() ?? 0;
      return bDate - aDate; // most recent first
    });

    const best = sorted[0];
    const mostRecentDate = best.publishedAt;
    const stalenessBand = computeStalenessBand(mostRecentDate, now);

    result.push({
      name: best.person.name.trim(),
      role: best.person.role.toLowerCase().trim(),
      isPrimary: group.some((m) => m.person.isPrimary === true),
      sourceCount: group.length,
      mostRecentSource: best.publication,
      mostRecentDate,
      stalenessBand,
    });
  }

  // Sort: primary first, then by source count descending, then current before aging before stale
  const bandOrder = { current: 0, aging: 1, stale: 2 };
  result.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (a.stalenessBand !== b.stalenessBand) return bandOrder[a.stalenessBand] - bandOrder[b.stalenessBand];
    return b.sourceCount - a.sourceCount;
  });

  return result;
}

function computeStalenessBand(
  publishedAt: Date | null,
  now: Date,
): 'current' | 'aging' | 'stale' {
  if (!publishedAt) return 'stale'; // No date = treat as stale (weak confidence)
  const monthsAgo = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (monthsAgo < STALENESS_CURRENT_MONTHS) return 'current';
  if (monthsAgo < STALENESS_AGING_MONTHS) return 'aging';
  return 'stale';
}

// --- Dishes ---

function normalizeDishes(rows: RawExtractionRow[]): NormalizedMention[] {
  const mentions = new Map<string, { text: string; sources: Set<string> }>();

  for (const row of rows) {
    const food = row.foodEvidence as FoodEvidence | null;
    if (!food?.dishes) continue;
    for (const dish of food.dishes) {
      const key = dish.toLowerCase().trim();
      if (!key) continue;
      const existing = mentions.get(key) ?? { text: dish.trim(), sources: new Set() };
      existing.sources.add(row.coverageSource.publicationName);
      mentions.set(key, existing);
    }
  }

  return Array.from(mentions.values())
    .map((m) => ({
      text: m.text,
      sourceCount: m.sources.size,
      sources: Array.from(m.sources),
    }))
    .sort((a, b) => b.sourceCount - a.sourceCount);
}

// --- Accolades ---

function normalizeAccolades(rows: RawExtractionRow[]): NormalizedAccolade[] {
  const groups = new Map<string, { best: AccoladeEntry; sourceCount: number }>();

  for (const row of rows) {
    const accolades = row.accolades as AccoladeEntry[] | null;
    if (!Array.isArray(accolades)) continue;
    for (const a of accolades) {
      if (!a.name) continue;
      // Key on name + year to distinguish "Best New Restaurant 2023" from "Best New Restaurant 2024"
      const key = `${a.name.toLowerCase().trim()}::${a.year ?? 'noyear'}`;
      const existing = groups.get(key);
      if (existing) {
        existing.sourceCount++;
        // Keep the entry with more detail (has source, has year)
        if (!existing.best.source && a.source) existing.best = a;
      } else {
        groups.set(key, { best: a, sourceCount: 1 });
      }
    }
  }

  return Array.from(groups.values())
    .map((g) => ({
      name: g.best.name.trim(),
      type: normalizeAccoladeType(g.best.type),
      source: g.best.source ?? null,
      year: g.best.year ?? null,
      sourceCount: g.sourceCount,
    }))
    .sort((a, b) => {
      // Most recent year first, then by source count
      if (a.year !== b.year) return (b.year ?? 0) - (a.year ?? 0);
      return b.sourceCount - a.sourceCount;
    });
}

function normalizeAccoladeType(raw: string): NormalizedAccolade['type'] {
  const t = raw.toLowerCase().trim();
  if (t === 'list' || t === 'award' || t === 'star' || t === 'nomination' || t === 'recognition') {
    return t;
  }
  return 'recognition'; // fallback
}

// --- Pull Quotes ---

function normalizePullQuotes(rows: RawExtractionRow[]): NormalizedPullQuote[] {
  const seen = new Set<string>();
  const result: NormalizedPullQuote[] = [];

  // Sort rows by relevance score descending so best quotes come first
  const sorted = [...rows].sort(
    (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0),
  );

  for (const row of sorted) {
    const quotes = row.pullQuotes as PullQuoteEntry[] | null;
    if (!Array.isArray(quotes)) continue;
    for (const q of quotes) {
      if (!q.text) continue;
      // Deduplicate by normalized text (first 60 chars lowercase)
      const dedupeKey = q.text.toLowerCase().trim().slice(0, 60);
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      result.push({
        text: q.text.trim(),
        publication: row.coverageSource.publicationName,
        articleTitle: row.coverageSource.articleTitle,
        publishedAt: row.coverageSource.publishedAt,
        relevanceScore: row.relevanceScore ?? 0,
      });
    }
  }

  return result;
}

// --- Origin Story (Facts) ---

function normalizeOriginStoryFacts(rows: RawExtractionRow[]): NormalizedOriginStoryFacts | null {
  let foundingYear: string | null = null;
  const founderNames = new Set<string>();
  let geographicOrigin: string | null = null;
  let lineage: string | null = null;
  let sourceCount = 0;

  // Best-source-first: sort by trust tier then recency
  const sorted = sortByTrustAndRecency(rows);

  for (const row of sorted) {
    const origin = row.originStory as OriginStory | null;
    if (!origin) continue;
    sourceCount++;

    // Founding year: first explicitly stated value wins (best-source-first)
    if (!foundingYear && origin.foundingDate) {
      foundingYear = origin.foundingDate;
    }

    // Founder names: extract from people if role is founder/owner, or from backstory
    // We accumulate (union) since multiple sources may name different founders
    const people = row.people as PersonExtraction[] | null;
    if (Array.isArray(people)) {
      for (const p of people) {
        const role = p.role?.toLowerCase().trim();
        if (role === 'founder' || role === 'owner' || role === 'partner') {
          founderNames.add(p.name.trim());
        }
      }
    }

    // Geographic origin and lineage: best-source-first
    if (!geographicOrigin && origin.backstory) {
      // Look for geographic markers in backstory — simple heuristic
      // The extraction prompt doesn't have a dedicated field for this,
      // so we leave it null until extraction schema is updated
    }

    if (!lineage && origin.type) {
      // "family-legacy" or "immigrant-story" implies lineage
      const t = origin.type.toLowerCase();
      if (t.includes('family') || t.includes('immigrant') || t.includes('legacy')) {
        lineage = origin.narrative ?? null;
      }
    }
  }

  if (sourceCount === 0) return null;

  return {
    foundingYear,
    founderNames: Array.from(founderNames),
    geographicOrigin,
    lineage,
    sourceCount,
  };
}

// --- Origin Story (Interpretation) ---

function normalizeOriginStoryInterpretation(
  rows: RawExtractionRow[],
): NormalizedOriginStoryInterpretation | null {
  const archetypes: string[] = [];
  const narratives: string[] = [];
  let sourceCount = 0;

  const sorted = sortByTrustAndRecency(rows);

  for (const row of sorted) {
    const origin = row.originStory as OriginStory | null;
    if (!origin) continue;
    sourceCount++;

    if (origin.type) archetypes.push(origin.type.toLowerCase().trim());
    if (origin.narrative) narratives.push(origin.narrative.trim());
  }

  if (sourceCount === 0) return null;

  // Consensus on archetype
  const archetypeCounts = countOccurrences(archetypes);
  const topArchetype = archetypeCounts[0] ?? null;

  let consensus: NormalizedOriginStoryInterpretation['consensus'];
  if (archetypeCounts.length <= 1) {
    consensus = 'unanimous';
  } else if (topArchetype && topArchetype.count > archetypes.length / 2) {
    consensus = 'majority';
  } else {
    consensus = 'conflicting';
  }

  // Labels: derive from archetype
  const labels: string[] = [];
  if (topArchetype) {
    const labelMap: Record<string, string> = {
      'chef-journey': 'chef-driven',
      'family-legacy': 'legacy institution',
      'immigrant-story': 'immigrant roots',
      'neighborhood-anchor': 'humble neighborhood spot',
      'concept-driven': 'concept-driven',
    };
    const label = labelMap[topArchetype.value];
    if (label) labels.push(label);
  }

  return {
    archetype: topArchetype?.value ?? null,
    tone: null, // Not currently extracted — placeholder for future extraction schema update
    narrative: narratives[0] ?? null, // Best-source-first narrative
    labels,
    sourceCount,
    consensus,
  };
}

// --- Event Capabilities ---

function normalizeEventCapabilities(rows: RawExtractionRow[]): CoverageFacts['eventCapabilities'] {
  const result = {
    privateDining: { mentioned: false, evidence: [] as string[] },
    groupDining: { mentioned: false, evidence: [] as string[] },
    catering: { mentioned: false, evidence: [] as string[] },
  };

  for (const row of rows) {
    const service = row.serviceEvidence as ServiceEvidence | null;
    if (!service) continue;

    if (service.privateDining?.mentioned) {
      result.privateDining.mentioned = true;
      if (service.privateDining.signals) {
        result.privateDining.evidence.push(...service.privateDining.signals);
      }
    }

    if (service.groupDining?.mentioned) {
      result.groupDining.mentioned = true;
      if (service.groupDining.signals) {
        result.groupDining.evidence.push(...service.groupDining.signals);
      }
    }

    if (service.catering?.mentioned) {
      result.catering.mentioned = true;
      if (service.catering.signals) {
        result.catering.evidence.push(...service.catering.signals);
      }
    }
  }

  // Deduplicate evidence arrays
  result.privateDining.evidence = dedupeStrings(result.privateDining.evidence);
  result.groupDining.evidence = dedupeStrings(result.groupDining.evidence);
  result.catering.evidence = dedupeStrings(result.catering.evidence);

  return result;
}

// ---------------------------------------------------------------------------
// Interpretations materialization
// ---------------------------------------------------------------------------

function materializeInterpretations(rows: RawExtractionRow[]): CoverageInterpretations {
  return {
    food: normalizeFood(rows),
    beverage: normalizeBeverage(rows),
    service: normalizeService(rows),
    atmosphere: normalizeAtmosphere(rows),
    sentiment: normalizeSentiment(rows),
  };
}

// --- Food ---

function normalizeFood(rows: RawExtractionRow[]): CoverageInterpretations['food'] {
  const postures: string[] = [];
  const approaches = new Set<string>();
  const formats = new Set<string>();
  const specialties = {
    sushi: false,
    ramen: false,
    taco: false,
    pizza: false,
    dumpling: false,
  };

  for (const row of rows) {
    const food = row.foodEvidence as FoodEvidence | null;
    if (!food) continue;

    if (food.cuisinePosture) postures.push(food.cuisinePosture.trim());
    if (food.cookingApproach) food.cookingApproach.forEach((a) => approaches.add(a.trim()));
    if (food.menuFormat) food.menuFormat.forEach((f) => formats.add(f.trim()));

    if (food.specialtySignals) {
      for (const key of Object.keys(specialties) as (keyof typeof specialties)[]) {
        const signal = food.specialtySignals[key];
        if (signal && typeof signal === 'object' && 'mentioned' in signal && signal.mentioned) {
          specialties[key] = true;
        }
      }
    }
  }

  // Cuisine posture: majority vote
  const postureCounts = countOccurrences(postures);
  const topPosture = postureCounts[0] ?? null;
  const agreement = topPosture && postures.length > 0
    ? topPosture.count / postures.length
    : 0;

  return {
    cuisinePosture: topPosture?.value ?? null,
    cuisinePostureAgreement: Math.round(agreement * 100) / 100,
    cookingApproaches: Array.from(approaches),
    menuFormats: Array.from(formats),
    specialtySignals: specialties,
  };
}

// --- Beverage ---

function normalizeBeverage(rows: RawExtractionRow[]): CoverageInterpretations['beverage'] {
  const result = {
    wine: { mentioned: false, naturalFocus: false, listDepth: null as string | null, sommelierMentioned: false },
    cocktail: { mentioned: false, programExists: false },
    beer: { mentioned: false, craftSelection: false },
    nonAlcoholic: { mentioned: false, zeroproof: false },
    coffeeTea: { mentioned: false, specialtyProgram: false },
  };

  for (const row of rows) {
    const bev = row.beverageEvidence as BeverageEvidence | null;
    if (!bev) continue;

    // Wine — union across sources; any mention = mentioned
    if (bev.wine?.mentioned) {
      result.wine.mentioned = true;
      if (bev.wine.naturalFocus) result.wine.naturalFocus = true;
      if (bev.wine.sommelierMentioned) result.wine.sommelierMentioned = true;
      if (bev.wine.listDepth && !result.wine.listDepth) result.wine.listDepth = bev.wine.listDepth;
    }

    if (bev.cocktail?.mentioned) {
      result.cocktail.mentioned = true;
      if (bev.cocktail.programExists) result.cocktail.programExists = true;
    }

    if (bev.beer?.mentioned) {
      result.beer.mentioned = true;
      if (bev.beer.craftSelection) result.beer.craftSelection = true;
    }

    if (bev.nonAlcoholic?.mentioned) {
      result.nonAlcoholic.mentioned = true;
      if (bev.nonAlcoholic.zeroproof) result.nonAlcoholic.zeroproof = true;
    }

    if (bev.coffeeTea?.mentioned) {
      result.coffeeTea.mentioned = true;
      if (bev.coffeeTea.specialtyProgram) result.coffeeTea.specialtyProgram = true;
    }
  }

  return result;
}

// --- Service ---

function normalizeService(rows: RawExtractionRow[]): CoverageInterpretations['service'] {
  const models: string[] = [];
  const postures: string[] = [];
  const formats = new Set<string>();

  for (const row of rows) {
    const svc = row.serviceEvidence as ServiceEvidence | null;
    if (!svc) continue;

    if (svc.serviceModel) models.push(svc.serviceModel.trim());
    if (svc.reservationPosture) postures.push(svc.reservationPosture.trim());
    if (svc.diningFormats) svc.diningFormats.forEach((f) => formats.add(f.trim()));
  }

  // Majority vote for model and posture
  const topModel = countOccurrences(models)[0];
  const topPosture = countOccurrences(postures)[0];

  return {
    serviceModel: topModel?.value ?? null,
    reservationPosture: topPosture?.value ?? null,
    diningFormats: Array.from(formats),
  };
}

// --- Atmosphere ---

function normalizeAtmosphere(rows: RawExtractionRow[]): CoverageInterpretations['atmosphere'] {
  const allDescriptors = new Set<string>();
  const energyLevels: string[] = [];
  const formalityLevels: string[] = [];

  for (const row of rows) {
    const atm = row.atmosphereSignals as AtmosphereSignals | null;
    if (!atm) continue;

    if (atm.descriptors) atm.descriptors.forEach((d) => allDescriptors.add(d.toLowerCase().trim()));
    if (atm.energyLevel) energyLevels.push(atm.energyLevel.toLowerCase().trim());
    if (atm.formality) formalityLevels.push(atm.formality.toLowerCase().trim());
  }

  // Union for descriptors, majority vote for energy/formality
  const topEnergy = countOccurrences(energyLevels)[0];
  const topFormality = countOccurrences(formalityLevels)[0];

  return {
    descriptors: Array.from(allDescriptors),
    energyLevel: topEnergy?.value ?? null,
    formality: topFormality?.value ?? null,
  };
}

// --- Sentiment ---

function normalizeSentiment(rows: RawExtractionRow[]): CoverageInterpretations['sentiment'] {
  const distribution: Record<string, number> = {
    POSITIVE: 0,
    NEGATIVE: 0,
    NEUTRAL: 0,
    MIXED: 0,
  };

  for (const row of rows) {
    const s = row.sentiment?.toUpperCase();
    if (s && s in distribution) {
      distribution[s]++;
    }
  }

  // Dominant = highest count
  let dominant: CoverageInterpretations['sentiment']['dominant'] = 'NEUTRAL';
  let maxCount = 0;
  for (const [key, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = key as typeof dominant;
    }
  }

  return { dominant, distribution };
}

// ---------------------------------------------------------------------------
// Provenance materialization
// ---------------------------------------------------------------------------

function materializeProvenance(rows: RawExtractionRow[]): CoverageProvenance {
  const sources = rows.map((row) => ({
    publicationName: row.coverageSource.publicationName,
    url: row.coverageSource.url,
    articleType: row.articleType ?? row.coverageSource.sourceType ?? 'unknown',
    publishedAt: row.coverageSource.publishedAt,
    relevanceScore: row.relevanceScore ?? 0,
    trustTier: computeTrustTier(row.coverageSource.publicationName),
  }));

  const dates = sources
    .map((s) => s.publishedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  const relevanceScores = sources
    .map((s) => s.relevanceScore)
    .sort((a, b) => a - b);

  return {
    sources,
    totalSources: sources.length,
    tier1Sources: sources.filter((s) => s.trustTier === 1).length,
    tier2Sources: sources.filter((s) => s.trustTier === 2).length,
    tier3Sources: sources.filter((s) => s.trustTier === 3).length,
    oldestSource: dates[0] ?? null,
    newestSource: dates[dates.length - 1] ?? null,
    medianRelevance: relevanceScores.length > 0
      ? relevanceScores[Math.floor(relevanceScores.length / 2)]
      : 0,
  };
}

function computeTrustTier(publicationName: string): 1 | 2 | 3 {
  const normalized = publicationName.toLowerCase().trim();
  if (TIER_1_PUBLICATIONS.has(normalized)) return 1;
  if (TIER_2_PUBLICATIONS.has(normalized)) return 2;
  return 3;
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Sort rows by trust tier (ascending = best first) then by publication date (most recent first) */
function sortByTrustAndRecency(rows: RawExtractionRow[]): RawExtractionRow[] {
  return [...rows].sort((a, b) => {
    const tierA = computeTrustTier(a.coverageSource.publicationName);
    const tierB = computeTrustTier(b.coverageSource.publicationName);
    if (tierA !== tierB) return tierA - tierB;
    const dateA = a.coverageSource.publishedAt?.getTime() ?? 0;
    const dateB = b.coverageSource.publishedAt?.getTime() ?? 0;
    return dateB - dateA; // most recent first
  });
}

/** Count occurrences of strings, return sorted by frequency descending */
function countOccurrences(values: string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v.toLowerCase().trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Test-visible exports — pure logic functions for unit testing
// ---------------------------------------------------------------------------

export { computeStalenessBand as _computeStalenessBand };
export { computeTrustTier as _computeTrustTier };
export { countOccurrences as _countOccurrences };
export { normalizePeople as _normalizePeople };
export { normalizeAccolades as _normalizeAccolades };
export { normalizePullQuotes as _normalizePullQuotes };
export { normalizeOriginStoryFacts as _normalizeOriginStoryFacts };
export { normalizeOriginStoryInterpretation as _normalizeOriginStoryInterpretation };
export { normalizeFood as _normalizeFood };
export { normalizeBeverage as _normalizeBeverage };
export { normalizeAtmosphere as _normalizeAtmosphere };
export { normalizeSentiment as _normalizeSentiment };
export { materializeProvenance as _materializeProvenance };
export type { RawExtractionRow as _RawExtractionRow };

/** Deduplicate strings case-insensitively, preserving first occurrence's casing */
function dedupeStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of arr) {
    const key = s.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(s.trim());
  }
  return result;
}
