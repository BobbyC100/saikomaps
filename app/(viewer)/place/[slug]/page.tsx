'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { GalleryLightbox } from '@/components/merchant/GalleryLightbox';
import { parseHours } from './lib/parseHours';
import { getOpenStateLabelV2 } from '@/lib/utils/get-open-state-label';
import { renderLocation } from '@/lib/voice/saiko';
import { getIdentitySublineV2 } from '@/lib/contracts/entity-page.identity';
import './place.css';

interface EditorialSource {
  source_id?: string;
  publication?: string;
  title?: string;
  url: string;
  published_at?: string;
  trust_level?: string;
  content?: string;
  name?: string;
  excerpt?: string;
}

interface LocationData {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  description: string | null;
  descriptionSource?: string | null;
  category: string | null;
  neighborhood: string | null;
  cuisineType?: string | null;
  priceLevel: number | null;
  businessStatus?: string | null;
  photoUrl: string | null;
  photoUrls?: string[];
  hours: unknown;
  googlePlaceId: string | null;
  curatorNote?: string | null;
  curatorCreatorName?: string | null;
  sources?: EditorialSource[];
  prl?: number;
  scenesense?: {
    atmosphere: string[];
    energy: string[];
    scene: string[];
  } | null;
  tips?: string[] | null;
  tagline?: string | null;
  timefold?: { class: string; phrase: string; approvedBy: string | null } | null;
  transitAccessible?: boolean | null;
  thematicTags?: string[] | null;
  amenities?: string[] | null;
  parkFacilities?: { id: string; name: string; slug: string; category: string | null }[] | null;
  parentPark?: { id: string; name: string; slug: string } | null;
  contextualConnection?: string | null;
  curatorAttribution?: string | null;
  pullQuote?: string | null;
  pullQuoteSource?: string | null;
  pullQuoteAuthor?: string | null;
  pullQuoteUrl?: string | null;
  pullQuoteType?: string | null;
  reservationUrl?: string | null;
  reservationProvider?: string | null;
  reservationProviderLabel?: string | null;
  menuUrl?: string | null;
  winelistUrl?: string | null;
  offeringSignals?: {
    servesBeer: boolean | null;
    servesWine: boolean | null;
    servesVegetarianFood: boolean | null;
    servesLunch: boolean | null;
    servesDinner: boolean | null;
    servesCocktails: boolean | null;
    cuisinePosture: string | null;
    serviceModel: string | null;
    priceTier: string | null;
    wineProgramIntent: string | null;
  } | null;
  slug?: string;
  primaryVertical?: string | null;
  placePersonality?: string | null;
  signatureDishes?: string[];
  keyProducers?: string[];
  originStoryType?: string | null;
  offeringPrograms?: {
    food_program: { maturity: string; signals: string[] };
    wine_program: { maturity: string; signals: string[] };
    beer_program: { maturity: string; signals: string[] };
    cocktail_program: { maturity: string; signals: string[] };
    non_alcoholic_program: { maturity: string; signals: string[] };
    coffee_tea_program: { maturity: string; signals: string[] };
    service_program: { maturity: string; signals: string[] };
    private_dining_program: { maturity: string; signals: string[] };
    group_dining_program: { maturity: string; signals: string[] };
    catering_program: { maturity: string; signals: string[] };
    dumpling_program: { maturity: string; signals: string[] };
    sushi_raw_fish_program: { maturity: string; signals: string[] };
    ramen_noodle_program: { maturity: string; signals: string[] };
    taco_program: { maturity: string; signals: string[] };
    pizza_program: { maturity: string; signals: string[] };
  } | null;
  primaryOperator?: { actorId: string; name: string; slug: string; website?: string } | null;
  placeType?: 'venue' | 'activity' | 'public';
  categorySlug?: string | null;
  marketSchedule?: unknown;
  coverageSources?: { sourceName: string; url: string; excerpt?: string | null; publishedAt?: string | null }[];
  coverageHighlights?: {
    sourceCount: number;
    tier1Count: number;
    tier2Count: number;
    people: Array<{ name: string; role: string }>;
    accolades: Array<{ name: string; year: number | null; type: string }>;
    dishes: string[];
    originStory: {
      foundingYear: number | null;
      founderNames: string[];
      geographicOrigin: string | null;
    } | null;
  } | null;
  recognitions?: { name: string; source?: string; year?: string }[] | null;
  appearancesAsSubject?: {
    id: string;
    hostPlaceId: string | null;
    hostPlace: { id: string; name: string; slug: string } | null;
    latitude: number | null;
    longitude: number | null;
    addressText: string | null;
    scheduleText: string;
    status: string;
  }[];
  appearancesAsHost?: {
    id: string;
    subjectPlaceId: string;
    subjectPlace: { id: string; name: string; slug: string } | null;
    scheduleText: string;
    status: string;
  }[];
}

interface AppearsOnItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  creatorName: string;
  description?: string | null;
  placeCount?: number;
  authorType?: 'saiko' | 'user';
}

interface PlacePageData {
  location: LocationData;
  guide: { id: string; title: string; slug: string; creatorName: string } | null;
  appearsOn: AppearsOnItem[];
  isOwner: boolean;
}

const RECOGNITIONS_CAP = 5;

/** Google Maps "Map ↗": placeId preferred; fallback lat/lng; no Directions CTA. */
function buildMapRefUrl(
  googlePlaceId: string | null,
  latitude: number | null,
  longitude: number | null,
  address: string | null
): string | null {
  if (googlePlaceId) return `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`;
  if (latitude != null && longitude != null) return `https://www.google.com/maps?q=${latitude},${longitude}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

/* ── Appendix: TRACES provenance references ── */

type AppendixRefGroup = {
  section: string;
  label: string;
  anchorId: string;
  entries: { source: string }[];
};

const DESCRIPTION_SOURCE_LABELS: Record<string, string> = {
  website: 'Restaurant website',
  editorial: 'Saiko editorial',
  google_editorial: 'Google Places editorial',
  synthesis: 'AI synthesis',
  'verbatim-v1': 'Restaurant website (verbatim)',
  'about-synth-v1': 'Synthesized from merchant website',
  'about-compose-v1': 'Composed from identity signals',
};

/** Build appendix reference groups keyed to page sections. */
function buildAppendixReferences(location: LocationData): AppendixRefGroup[] {
  const groups: AppendixRefGroup[] = [];

  // ── ABOUT ──
  const aboutEntries: { source: string }[] = [];
  if (location.description) {
    const label = DESCRIPTION_SOURCE_LABELS[location.descriptionSource ?? ''] ?? 'Saiko editorial';
    aboutEntries.push({ source: label });
  }
  if (location.curatorNote) {
    aboutEntries.push({ source: location.curatorCreatorName || 'Curator note' });
  }
  if (location.pullQuote) {
    const src = [location.pullQuoteSource, location.pullQuoteAuthor].filter(Boolean).join(' — ') || 'Editorial';
    aboutEntries.push({ source: src });
  }
  if (location.tips && location.tips.length > 0) {
    aboutEntries.push({ source: 'Saiko tips' });
  }
  if (aboutEntries.length > 0) {
    groups.push({ section: 'about', label: 'About Sources', anchorId: 'ledger-about', entries: aboutEntries });
  }

  // ── OFFERING ──
  const offeringEntries: { source: string }[] = [];
  if (location.offeringPrograms) {
    offeringEntries.push({ source: 'Enrichment pipeline' });
  }
  if (location.offeringSignals) {
    offeringEntries.push({ source: 'Google Places' });
  }
  if (location.signatureDishes && location.signatureDishes.length > 0) {
    offeringEntries.push({ source: 'Enrichment pipeline — signature dishes' });
  }
  if (location.keyProducers && location.keyProducers.length > 0) {
    offeringEntries.push({ source: 'Enrichment pipeline — key producers' });
  }
  if (location.cuisineType && !location.offeringPrograms) {
    offeringEntries.push({ source: 'Google Places — cuisine type' });
  }
  if (offeringEntries.length > 0) {
    groups.push({ section: 'offering', label: 'Offering Sources', anchorId: 'ledger-offering', entries: offeringEntries });
  }

  // ── SCENE ──
  const sceneEntries: { source: string }[] = [];
  if (location.placePersonality?.trim()) {
    sceneEntries.push({ source: 'Identity Signals AI' });
  }
  if (location.scenesense?.scene && location.scenesense.scene.length > 0) {
    sceneEntries.push({ source: 'SceneSense engine' });
  }
  if (sceneEntries.length > 0) {
    groups.push({ section: 'scene', label: 'Scene Sources', anchorId: 'ledger-scene', entries: sceneEntries });
  }

  // ── ATMOSPHERE ──
  if (location.scenesense?.atmosphere && location.scenesense.atmosphere.length > 0) {
    groups.push({
      section: 'atmosphere',
      label: 'Atmosphere Sources',
      anchorId: 'ledger-atmosphere',
      entries: [{ source: 'SceneSense engine' }],
    });
  }

  // ── ENERGY ──
  if (location.scenesense?.energy && location.scenesense.energy.length > 0) {
    groups.push({
      section: 'energy',
      label: 'Energy Sources',
      anchorId: 'ledger-energy',
      entries: [{ source: 'SceneSense engine' }],
    });
  }

  return groups;
}

const OFFERING_CAP = 8;

// ---------------------------------------------------------------------------
// Signal vocabulary — human-readable phrases for each structural signal
// These compose into richer offering sentences.
// ---------------------------------------------------------------------------

/** Food program signal → descriptive fragment */
const FOOD_SIGNAL_PHRASES: Record<string, string> = {
  shared_plate_structure: 'shared plates',
  large_format_mains: 'large-format mains',
  vegetable_heavy: 'vegetable-forward cooking',
  seafood_heavy: 'seafood-driven',
  meat_forward: 'meat-forward',
  fermentation_focus: 'fermentation as a focus',
  pizza_program: 'a dedicated pizza program',
  raw_bar: 'a raw bar',
  bakery_program: 'house-baked bread and pastry',
  pastry_program: 'a pastry program',
  sandwich_program: 'a sandwich program',
  rotisserie_program: 'rotisserie',
  tasting_menu_present: 'tasting menu format',
  prix_fixe_present: 'prix fixe option',
  taco_program: 'a taco program',
  street_food_program: 'street food',
  tortilla_program: 'house-made tortillas',
};

/** Wine program signal → descriptive fragment (Locked v1: beverage-program-vocab-v1) */
const WINE_SIGNAL_PHRASES: Record<string, string> = {
  extensive_wine_list: 'broad by-the-glass and bottle depth',
  natural_wine_presence: 'natural wine focus',
  aperitif_focus: 'aperitif-driven',
  'coverage:wine_mentioned': 'wine integrated across the menu',
  'coverage:natural_wine_focus': 'natural-wine leaning producers',
  'coverage:sommelier_noted': 'an identified wine lead',
};

/** Beer program signal → descriptive fragment (Locked v1) */
const BEER_SIGNAL_PHRASES: Record<string, string> = {
  beer_program: 'tap and bottle depth',
  'coverage:beer_mentioned': 'a rotating beer list',
  'coverage:craft_beer_selection': 'a craft-leaning selection',
  // Future v2 signals (vocabulary locked, detection pending):
  // craft_beer_presence: 'craft beer focus',
  // draft_beer_focus: 'a draft selection',
  // brewery_affiliation: 'brewery-affiliated',
};

/** Cocktail program signal → descriptive fragment (Locked v1) */
const COCKTAIL_SIGNAL_PHRASES: Record<string, string> = {
  cocktail_program: 'a cocktail program',
  // Future v2 signals (vocabulary locked, detection pending):
  // classic_cocktail_focus: 'classic cocktails',
  // house_cocktail_focus: 'house cocktails',
  // tiki_program: 'a tiki program',
  // martini_focus: 'a martini focus',
};

/** Non-alcoholic program signal → descriptive fragment (Locked v1: 10 signals) */
const NA_SIGNAL_PHRASES: Record<string, string> = {
  basic_na_beverages: 'standard non-alcoholic options',
  agua_fresca_program: 'aguas frescas',
  horchata_presence: 'horchata',
  house_soda_program: 'house-made sodas',
  zero_proof_cocktails: 'zero-proof cocktails',
  na_spirits_presence: 'NA spirits',
  na_beer_wine_presence: 'NA beer and wine',
  functional_beverage_presence: 'functional beverages',
  fermented_beverage_presence: 'kombucha and fermented drinks',
  cultural_soda_presence: 'Mexican Coke, Jarritos, and similar',
};

/** Coffee & tea program signal → descriptive fragment (Locked v1: 11 signals) */
const COFFEE_TEA_SIGNAL_PHRASES: Record<string, string> = {
  coffee_program: 'coffee',
  espresso_program: 'espresso drinks',
  specialty_coffee_presence: 'specialty coffee',
  tea_program: 'tea',
  specialty_tea_presence: 'a curated tea list',
  breakfast_service: 'a breakfast service window',
  brunch_service: 'a brunch service window',
  morning_service: 'a morning service window',
  matcha_program: 'matcha',
  bubble_tea_program: 'boba',
  bubble_tea_chain: 'boba',
  tea_house_structure: 'tea house format',
  afternoon_tea_service: 'afternoon tea service',
  arabic_coffee_program: 'Arabic coffee',
};

/** Taco program signals surfaced in food specialty language */
const TACO_SPECIALTY_SIGNAL_PHRASES: Record<string, string> = {
  handmade_tortilla: 'house-made tortillas',
  nixtamal_presence: 'nixtamal-forward masa',
  heirloom_corn_presence: 'heirloom-corn tortillas',
  al_pastor_presence: 'al pastor',
  birria_presence: 'birria',
  carnitas_presence: 'carnitas',
  carne_asada_presence: 'carne asada',
  seafood_taco_presence: 'seafood tacos',
  salsa_program: 'a developed salsa program',
};

/** Cuisine posture → lead phrase for the food sentence */
const CUISINE_POSTURE_LEADS: Record<string, string> = {
  'produce-driven': 'Seasonal, produce-driven kitchen',
  'protein-centric': 'Protein-focused menu',
  'carb-forward': 'Carb-forward comfort cooking',
  'seafood-focused': 'Seafood-centered menu',
  'balanced': 'Broadly composed menu',
};

/** Wine program intent → lead phrase for the wine sentence */
const WINE_INTENT_LEADS: Record<string, string> = {
  serious: 'Serious wine program',
  dedicated: 'Dedicated wine program',
  integrated: 'Wine integrated into the dining experience',
  mediterranean_focused: 'Mediterranean-focused wine program',
  california_leaning: 'California-leaning wine list',
  classical: 'Classical wine program with regional depth',
  natural_leaning: 'Producer-driven natural wine list',
  eclectic: 'Eclectic, wide-ranging wine list',
  light: 'Compact wine selection',
};

/** Service model → full sentence */
const SERVICE_MODEL_PHRASES: Record<string, string> = {
  'tasting-menu': 'Tasting menu format — the kitchen sets the pace',
  'a-la-carte': 'À la carte service with kitchen-paced coursing across the meal',
  'small-plates': 'Small plates built for sharing across the table',
  'family-style': 'Family-style, served to the center of the table',
  'counter': 'Counter service',
};

/** Price tier → full sentence */
const PRICE_PHRASES: Record<string, string> = {
  '$': 'Budget-friendly',
  '$$': 'Moderate price range',
  '$$$': 'Higher-end pricing',
  '$$$$': 'Fine-dining price point',
};

// ---------------------------------------------------------------------------
// Sentence composition helpers
// ---------------------------------------------------------------------------

/**
 * Compose a natural sentence from a lead phrase + signal fragments.
 * "Seasonal, produce-driven kitchen" + ["shared plates", "a raw bar"]
 * → "Seasonal, produce-driven kitchen built around shared plates and a raw bar"
 */
function composeSentence(lead: string, fragments: string[], connector = 'with'): string {
  if (fragments.length === 0) return lead;
  if (fragments.length === 1) return `${lead} ${connector} ${fragments[0]}`;
  const last = fragments[fragments.length - 1];
  const rest = fragments.slice(0, -1).join(', ');
  return `${lead} ${connector} ${rest} and ${last}`;
}

function appendClause(base: string, clause: string): string {
  const trimmed = clause.trim();
  if (!trimmed) return base;
  return `${base} with ${trimmed}`;
}

function appendClauses(base: string, clauses: string[]): string {
  const cleaned = clauses.map((c) => c.trim()).filter(Boolean);
  if (cleaned.length === 0) return base;
  if (cleaned.length === 1) return appendClause(base, cleaned[0]!);
  return appendClause(base, `${cleaned.slice(0, -1).join(', ')} and ${cleaned[cleaned.length - 1]}`);
}

function dedupeFragments(fragments: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const fragment of fragments) {
    const key = normalizeTextToken(fragment);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(fragment);
  }
  return out;
}

function getWineProducerNames(names: string[] | null | undefined, cap = 4): string[] {
  return (names ?? [])
    .filter((name) => {
      const lower = name.toLowerCase();
      return /\b(vineyard|vineyards|winery|wineries|domaine|cellars|cellar|estate|vigneron|wine)\b/.test(lower);
    })
    .slice(0, cap);
}

/**
 * Pick up to N signal phrases from a program's signals array.
 * Returns human-readable fragments in the order they appear.
 */
function resolveSignalPhrases(
  signals: string[],
  vocabulary: Record<string, string>,
  cap = 3,
): string[] {
  return signals
    .map(s => vocabulary[s])
    .filter((phrase): phrase is string => !!phrase)
    .slice(0, cap);
}

function toTokenSet(values: string[]): Set<string> {
  return new Set(values.map((v) => v.toLowerCase()));
}

function hasAnyToken(text: string, tokens: Set<string>): boolean {
  for (const token of tokens) {
    if (text.includes(token)) return true;
  }
  return false;
}

const BREAKFAST_TOKENS = [
  'breakfast', 'brunch', 'morning',
  'egg', 'eggs', 'toast', 'pastry', 'quiche', 'coffee',
];

function toSentenceList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  return `${head}, and ${items[items.length - 1]}`;
}

function normalizeTextToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dedupeTaglineNeighborhood(tagline: string | null | undefined, neighborhood: string | null | undefined): string | null {
  if (!tagline) return null;
  if (!neighborhood) return tagline;
  const trimmed = tagline.trim();
  if (!trimmed) return null;

  const canonicalNeighborhood = normalizeTextToken(neighborhood);
  if (!canonicalNeighborhood) return trimmed;

  const trailingLocationPattern = new RegExp(
    `(?:[\\s,;:\\-–—]+)?(?:in\\s+)?${escapeRegExp(neighborhood)}(?:,\\s*ca(?:lifornia)?)?[.!?\\s]*$`,
    'i'
  );
  const stripped = trimmed.replace(trailingLocationPattern, '').replace(/[\s,;:\-–—]+$/, '').trim();

  if (!stripped) return trimmed;
  if (normalizeTextToken(stripped) === canonicalNeighborhood) return trimmed;
  return stripped;
}

function joinPhrases(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function enhanceIdentitySubline(base: string | null, location: LocationData): string | null {
  if (!base) return null;
  if (location.primaryVertical !== 'EAT') return base;

  const wineIntent = location.offeringSignals?.wineProgramIntent ?? null;
  const wineMaturity = location.offeringPrograms?.wine_program?.maturity ?? null;
  const supportsWineBar =
    ['serious', 'dedicated', 'natural_leaning', 'integrated'].includes(wineIntent ?? '') ||
    ['considered', 'dedicated'].includes(wineMaturity ?? '');
  const desc = `${location.description ?? ''} ${location.tagline ?? ''}`.toLowerCase();
  const supportsWineShop = /\b(bottle shop|wine shop)\b/.test(desc);

  if (!supportsWineBar && !supportsWineShop) return base;

  const inIdx = base.toLowerCase().indexOf(' in ');
  const formatPart = inIdx >= 0 ? base.slice(0, inIdx) : base;
  const locationPart = inIdx >= 0 ? base.slice(inIdx) : '';
  const phrases: string[] = [formatPart];

  if (supportsWineBar && !/\bwine bar\b/i.test(formatPart)) {
    phrases.push('wine bar');
  }
  if (supportsWineShop && !/\bwine shop\b/i.test(formatPart)) {
    phrases.push('wine shop');
  }
  if (phrases.length === 1) return base;

  return `${joinPhrases(phrases)}${locationPart}`;
}

// ---------------------------------------------------------------------------
// Offering line builder — composes richer sentences from signals
// ---------------------------------------------------------------------------

function buildOfferingLines(location: LocationData): { label: string; sentence: string }[] {
  const lines: { label: string; sentence: string }[] = [];
  const os = location.offeringSignals;
  const op = location.offeringPrograms;
  const ch = location.coverageHighlights ?? null;

  const hasActiveProgram = (program: { maturity: string; signals: string[] } | undefined): boolean => {
    if (!program) return false;
    return ['incidental', 'considered', 'dedicated'].includes(program.maturity) || (program.signals?.length ?? 0) > 0;
  };

  const buildTacoSpecialtyPhrase = (program: { signals: string[] } | undefined): string => {
    const phrases = resolveSignalPhrases(program?.signals ?? [], TACO_SPECIALTY_SIGNAL_PHRASES, 2);
    if (phrases.length > 0) {
      return `tacos with ${toSentenceList(phrases)}`;
    }
    return 'tacos';
  };

  const specialtyPrograms: Array<{ key: string; phrase: string; program: { maturity: string; signals: string[] } | undefined }> = [
    { key: 'taco_program', phrase: buildTacoSpecialtyPhrase(op?.taco_program), program: op?.taco_program },
    { key: 'pizza_program', phrase: 'pizza', program: op?.pizza_program },
    { key: 'dumpling_program', phrase: 'dumplings', program: op?.dumpling_program },
    { key: 'sushi_raw_fish_program', phrase: 'sushi and raw fish', program: op?.sushi_raw_fish_program },
    { key: 'ramen_noodle_program', phrase: 'ramen and noodles', program: op?.ramen_noodle_program },
  ];
  const activeSpecialtyPhrases = specialtyPrograms
    .filter((p) => hasActiveProgram(p.program))
    .map((p) => p.phrase);

  // ── Food ─────────────────────────────────────────────────────────────
  const foodSignals = op?.food_program?.signals ?? [];
  const foodMaturity = op?.food_program?.maturity;
  const foodFragments = resolveSignalPhrases(foodSignals, FOOD_SIGNAL_PHRASES);
  const featuredFoodDishes = (location.signatureDishes ?? []).slice(0, 2);
  const foodDishClause = featuredFoodDishes.length > 0 ? `dishes like ${toSentenceList(featuredFoodDishes)}` : '';

  if (os?.cuisinePosture && CUISINE_POSTURE_LEADS[os.cuisinePosture]) {
    const lead = CUISINE_POSTURE_LEADS[os.cuisinePosture];
    const specialtyClause = activeSpecialtyPhrases.length > 0
      ? `specialties like ${toSentenceList(activeSpecialtyPhrases.slice(0, 3))}`
      : '';
    if (foodFragments.length === 0 && location.cuisineType) {
      lines.push({
        label: 'Food',
        sentence: appendClauses(`${lead} with ${location.cuisineType} influences`, [specialtyClause, foodDishClause]),
      });
    } else if (foodFragments.length === 0 && !location.cuisineType && !specialtyClause) {
      // Avoid rendering posture-only stubs like "Broadly composed menu".
      // If we have no concrete support signals, skip the line entirely.
    } else {
      lines.push({
        label: 'Food',
        sentence: appendClauses(composeSentence(lead, foodFragments, 'built around'), [specialtyClause, foodDishClause]),
      });
    }
  } else if (foodMaturity && foodMaturity !== 'none' && foodMaturity !== 'unknown') {
    if (foodFragments.length > 0) {
      // Signals without posture: let the signals speak
      const lead = foodMaturity === 'dedicated' ? 'Dedicated kitchen' : 'Menu';
      const specialtyClause = activeSpecialtyPhrases.length > 0
        ? `specialties like ${toSentenceList(activeSpecialtyPhrases.slice(0, 3))}`
        : '';
      lines.push({ label: 'Food', sentence: composeSentence(lead, foodFragments, 'featuring') });
      if (specialtyClause || foodDishClause) {
        lines[lines.length - 1].sentence = appendClauses(lines[lines.length - 1].sentence, [specialtyClause, foodDishClause]);
      }
    } else if (location.cuisineType) {
      const specialtyClause = activeSpecialtyPhrases.length > 0
        ? `specialties like ${toSentenceList(activeSpecialtyPhrases.slice(0, 3))}`
        : '';
      lines.push({
        label: 'Food',
        sentence: appendClauses(
          foodMaturity === 'dedicated'
            ? `${location.cuisineType} kitchen with a dedicated program`
            : `Broadly composed ${location.cuisineType} menu with seasonal plates`,
          [specialtyClause, foodDishClause],
        ),
      });
    }
  } else if (location.cuisineType) {
    const specialtyClause = activeSpecialtyPhrases.length > 0
      ? `specialties like ${toSentenceList(activeSpecialtyPhrases.slice(0, 3))}`
      : '';
    lines.push({ label: 'Food', sentence: appendClauses(`${location.cuisineType} kitchen`, [specialtyClause, foodDishClause]) });
  } else if (activeSpecialtyPhrases.length > 0) {
    lines.push({
      label: 'Food',
      sentence: `Focused on specialties like ${toSentenceList(activeSpecialtyPhrases.slice(0, 3))}`,
    });
  } else if (foodDishClause) {
    lines.push({
      label: 'Food',
      sentence: `Kitchen anchored by ${foodDishClause}`,
    });
  }

  // ── Wine ─────────────────────────────────────────────────────────────
  const wineSignals = op?.wine_program?.signals ?? [];
  const wineMaturity = op?.wine_program?.maturity;
  const wineFragments = resolveSignalPhrases(wineSignals, WINE_SIGNAL_PHRASES);
  const wineIntent = os?.wineProgramIntent;
  const hasNaturalWineSignal = wineSignals.includes('coverage:natural_wine_focus');
  const hasSommelierSignal = wineSignals.includes('coverage:sommelier_noted');
  const wineProducerList = getWineProducerNames(location.keyProducers, 3);
  const naturalWineIntent = wineIntent === 'natural_leaning' || wineIntent === 'natural';
  const curatedWineIntent = new Set([
    'serious',
    'dedicated',
    'integrated',
    'mediterranean_focused',
    'california_leaning',
    'classical',
    'natural_leaning',
    'eclectic',
  ]);
  const canUseWineProducerClause =
    wineProducerList.length > 0 &&
    (hasSommelierSignal ||
      hasNaturalWineSignal ||
      naturalWineIntent ||
      curatedWineIntent.has(wineIntent ?? ''));

  const prunedWineFragments = dedupeFragments(
    wineFragments.filter((fragment) => {
      if (hasSommelierSignal && fragment === 'an identified wine lead') return false;
      if (
        (hasNaturalWineSignal || naturalWineIntent) &&
        fragment === 'natural-wine leaning producers'
      ) {
        return false;
      }
      return true;
    }),
  );

  if (
    (wineIntent && wineIntent !== 'none' && WINE_INTENT_LEADS[wineIntent]) ||
    (wineMaturity && wineMaturity !== 'none' && wineMaturity !== 'unknown')
  ) {
    const lead =
      hasSommelierSignal
        ? 'Sommelier-shaped wine program'
        : (wineIntent && WINE_INTENT_LEADS[wineIntent])
          ? WINE_INTENT_LEADS[wineIntent]
          : wineMaturity === 'dedicated'
            ? 'Dedicated wine program'
            : wineMaturity === 'considered'
              ? 'Considered wine program'
              : 'Wine program';
    const baseSentence = composeSentence(lead, prunedWineFragments, 'featuring');
    const producerClause =
      canUseWineProducerClause ? `producers like ${toSentenceList(wineProducerList)}` : '';
    lines.push({ label: 'Wine', sentence: appendClause(baseSentence, producerClause) });
  } else if (os?.servesWine === true) {
    lines.push({ label: 'Wine', sentence: 'Wine list available' });
  }

  // ── Cocktails ────────────────────────────────────────────────────────
  const cocktailSignals = op?.cocktail_program?.signals ?? [];
  const cocktailMaturity = op?.cocktail_program?.maturity;
  const cocktailFragments = resolveSignalPhrases(cocktailSignals, COCKTAIL_SIGNAL_PHRASES);

  if (cocktailMaturity && cocktailMaturity !== 'none' && cocktailMaturity !== 'unknown') {
    const lead = cocktailMaturity === 'dedicated'
      ? 'Dedicated cocktail program'
      : cocktailMaturity === 'considered'
        ? 'Composed cocktail menu'
        : 'Cocktails';
    lines.push({
      label: 'Cocktails',
      sentence: composeSentence(lead, cocktailFragments, 'featuring'),
    });
  } else if (os?.servesCocktails === true) {
    lines.push({ label: 'Cocktails', sentence: 'Cocktails available' });
  }

  // ── Beer ─────────────────────────────────────────────────────────────
  const beerSignals = op?.beer_program?.signals ?? [];
  const beerMaturity = op?.beer_program?.maturity;
  const beerFragments = resolveSignalPhrases(beerSignals, BEER_SIGNAL_PHRASES);
  const hasCraftBeerSignal = beerSignals.includes('coverage:craft_beer_selection');
  const prunedBeerFragments = dedupeFragments(beerFragments);

  if (beerMaturity && beerMaturity !== 'none' && beerMaturity !== 'unknown') {
    if (prunedBeerFragments.length > 0) {
      const lead = hasCraftBeerSignal
        ? beerMaturity === 'dedicated'
          ? 'Dedicated craft beer program'
          : 'Considered craft beer selection'
        : beerMaturity === 'dedicated'
          ? 'Dedicated tap-and-bottle program'
          : beerMaturity === 'considered'
            ? 'Considered beer selection'
            : 'Beer selection';
      lines.push({
        label: 'Beer',
        sentence: composeSentence(lead, prunedBeerFragments, 'featuring'),
      });
    } else {
      lines.push({
        label: 'Beer',
        sentence: hasCraftBeerSignal
          ? 'Craft-leaning beer selection in rotation'
          : beerMaturity === 'dedicated'
            ? 'Dedicated tap-and-bottle beer program'
            : 'Beer list in rotation',
      });
    }
  } else if (os?.servesBeer === true) {
    lines.push({ label: 'Beer', sentence: 'Beer available' });
  }

  // ── Non-Alcoholic ────────────────────────────────────────────────────
  const naSignals = op?.non_alcoholic_program?.signals ?? [];
  const naMaturity = op?.non_alcoholic_program?.maturity;
  const naFragments = resolveSignalPhrases(naSignals, NA_SIGNAL_PHRASES);

  if (naFragments.length > 0) {
    // Signals are the story — lead with maturity context if available
    const lead = naMaturity === 'dedicated'
      ? 'Dedicated non-alcoholic program'
      : naMaturity === 'considered'
        ? 'Thoughtful non-alcoholic offerings'
        : 'Non-alcoholic options';
    lines.push({
      label: 'Non-Alc',
      sentence: composeSentence(lead, naFragments, 'including'),
    });
  } else if (naMaturity && naMaturity !== 'none' && naMaturity !== 'unknown') {
    const sentence = naMaturity === 'dedicated'
      ? 'Dedicated non-alcoholic program'
      : naMaturity === 'considered'
        ? 'Thoughtful non-alcoholic offerings'
        : 'Non-alcoholic options available';
    lines.push({ label: 'Non-Alc', sentence });
  }

  // ── Coffee & Tea ─────────────────────────────────────────────────────
  const ctSignals = op?.coffee_tea_program?.signals ?? [];
  const ctMaturity = op?.coffee_tea_program?.maturity;
  const ctFragments = resolveSignalPhrases(ctSignals, COFFEE_TEA_SIGNAL_PHRASES);
  const breakfastEvidenceValues = [
    ...(location.signatureDishes ?? []),
    ...(ch?.dishes ?? []),
    ...((ch?.accolades ?? []).map((a) => a.name)),
  ];
  const breakfastTokenSet = toTokenSet(BREAKFAST_TOKENS);
  const hasBreakfastEvidence = breakfastEvidenceValues.some((v) => {
    const lower = v.toLowerCase();
    return hasAnyToken(lower, breakfastTokenSet);
  });
  const breakfastDishes = (location.signatureDishes ?? [])
    .filter((dish) => {
      const lower = dish.toLowerCase();
      return hasAnyToken(lower, breakfastTokenSet);
    })
    .slice(0, 2);
  const hasCoffeeSignal = ctSignals.some((s) => s.includes('coffee') || s.includes('espresso'));
  const hasBreakfastSignal = ctSignals.some((s) => s.includes('breakfast') || s.includes('brunch') || s.includes('morning'));
  const preferBreakfastLabel = hasBreakfastEvidence || hasBreakfastSignal;

  if (ctFragments.length > 0) {
    // Signals drive the sentence — maturity shapes the lead
    const lead = preferBreakfastLabel
      ? ctMaturity === 'dedicated'
        ? 'Dedicated coffee and breakfast program'
        : ctMaturity === 'considered'
          ? 'Considered coffee and breakfast format'
          : 'Coffee and breakfast'
      : ctMaturity === 'dedicated'
        ? 'Dedicated coffee and tea program'
        : ctMaturity === 'considered'
          ? 'Considered coffee and tea selection'
          : 'Coffee and tea';
    const sentence = composeSentence(lead, ctFragments, 'featuring');
    const breakfastDishClause =
      breakfastDishes.length > 0 ? `breakfast dishes like ${toSentenceList(breakfastDishes)}` : '';
    lines.push({
      label: preferBreakfastLabel ? 'Coffee & Breakfast' : 'Coffee & Tea',
      sentence: appendClause(sentence, breakfastDishClause),
    });
  } else if (preferBreakfastLabel || hasCoffeeSignal) {
    const breakfastDishClause =
      breakfastDishes.length > 0 ? ` with dishes like ${toSentenceList(breakfastDishes)}` : '';
    lines.push({
      label: preferBreakfastLabel ? 'Coffee & Breakfast' : 'Coffee & Tea',
      sentence: preferBreakfastLabel
        ? `Breakfast and coffee are part of the format${breakfastDishClause}`
        : 'Coffee and tea available',
    });
  } else if (ctMaturity && ctMaturity !== 'none' && ctMaturity !== 'unknown') {
    const sentence = ctMaturity === 'dedicated'
      ? 'Dedicated coffee and tea program'
      : ctMaturity === 'considered'
        ? 'Considered coffee and tea selection'
        : 'Coffee and tea available';
    lines.push({ label: 'Coffee & Tea', sentence });
  }

  // ── Service ──────────────────────────────────────────────────────────
  if (os?.serviceModel && SERVICE_MODEL_PHRASES[os.serviceModel]) {
    lines.push({ label: 'Service', sentence: SERVICE_MODEL_PHRASES[os.serviceModel] });
  }

  // ── Hospitality / Events ──────────────────────────────────────────────
  const hospitalityModes: string[] = [];
  if (hasActiveProgram(op?.private_dining_program)) hospitalityModes.push('private dining');
  if (hasActiveProgram(op?.group_dining_program)) hospitalityModes.push('group dining');
  if (hasActiveProgram(op?.catering_program)) hospitalityModes.push('catering');
  if (hospitalityModes.length > 0) {
    lines.push({
      label: 'Hospitality',
      sentence: `Supports ${toSentenceList(hospitalityModes)}`,
    });
  }

  // ── Price ────────────────────────────────────────────────────────────
  if (os?.priceTier && PRICE_PHRASES[os.priceTier]) {
    lines.push({ label: 'Price', sentence: PRICE_PHRASES[os.priceTier] });
  } else if (location.priceLevel != null && location.priceLevel >= 1 && location.priceLevel <= 4) {
    const tier = '$'.repeat(location.priceLevel);
    if (PRICE_PHRASES[tier]) {
      lines.push({ label: 'Price', sentence: PRICE_PHRASES[tier] });
    }
  }

  return lines.slice(0, OFFERING_CAP);
}

export default function PlacePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<PlacePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not-found' | 'server-error' | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());

  const handlePhotoError = useCallback((url: string) => {
    setFailedPhotos((prev) => new Set(prev).add(url));
  }, []);

  const openGallery = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/places/${slug}`, {
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
      headers: process.env.NODE_ENV === 'development' ? { 'Cache-Control': 'no-cache' } : undefined,
    })
      .then(async (res) => {
        if (res.status === 404) {
          setError('not-found');
          return null;
        }
        if (!res.ok) {
          setError('server-error');
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success && json.data) setData(json.data);
        else if (json === null) {}
        else setError('not-found');
      })
      .catch((err) => {
        console.error('Failed to load place:', err);
        setError('server-error');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.location.name || 'Saiko Maps',
          text: data?.location.tagline || `Check out ${data?.location.name}`,
          url: window.location.href,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#C3B091] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p style={{ color: '#36454F', opacity: 0.7 }}>Loading place details...</p>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  if (error === 'not-found') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <h1 className="text-[#36454F] text-2xl font-semibold mb-3">Place Not Found</h1>
            <p className="text-[#36454F] opacity-70 mb-6">
              We couldn&apos;t find a place with the slug &quot;{slug}&quot;. It may have been removed or the link might be incorrect.
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-[#C3B091] text-white rounded-lg hover:bg-[#B39F7F] transition-colors">
              Browse Maps
            </Link>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  if (error === 'server-error') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <h1 className="text-[#36454F] text-2xl font-semibold mb-3">Something Went Wrong</h1>
            <p className="text-[#36454F] opacity-70 mb-6">We encountered an error loading this place. Please try again.</p>
            <button onClick={() => window.location.reload()} className="inline-block px-6 py-3 bg-[#C3B091] text-white rounded-lg hover:bg-[#B39F7F] transition-colors">
              Try Again
            </button>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" onShare={handleShare} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#36454F] text-lg mb-2">Place not found</p>
            <Link href="/" className="text-[#C3B091] hover:underline">Return to homepage</Link>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  const { location, guide, appearsOn } = data;
  const rawPhotoUrls = location.photoUrls ?? (location.photoUrl ? [location.photoUrl] : []);
  const validPhotos = rawPhotoUrls.filter((url) => url && !failedPhotos.has(url));

  const parsedHours = parseHours(location.hours);
  const { label: openStateLabel } = getOpenStateLabelV2(parsedHours, new Date(), { showTime: true });

  // Identity Line — canonical structural sentence
  const identitySubline =
    getIdentitySublineV2({
      neighborhood: location.neighborhood ?? null,
      primaryVertical: location.primaryVertical ?? null,
      cuisineType: location.cuisineType ?? null,
      offeringSignals: location.offeringSignals ?? null,
    }) ?? renderLocation({ neighborhood: location.neighborhood, category: location.category });
  const displayIdentitySubline = enhanceIdentitySubline(identitySubline, location);

  const energyPhrase = location.scenesense?.atmosphere?.[0] ?? null;
  const displayTagline = dedupeTaglineNeighborhood(location.tagline, location.neighborhood);
  const hasSignalsSentence = !!(openStateLabel || energyPhrase);
  const mapRefUrl = buildMapRefUrl(location.googlePlaceId, location.latitude, location.longitude, location.address);
  const recognitions = (location.recognitions ?? []).slice(0, RECOGNITIONS_CAP);
  const appendixGroups = buildAppendixReferences(location);
  // Guard against sentinel values like "NONE" stored in DB instead of null
  const rawPhone = location.phone && location.phone.toUpperCase() !== 'NONE' ? location.phone : null;
  const phoneUrl = rawPhone ? `tel:${rawPhone.replace(/\D/g, '')}` : null;

  // Sidebar: Hours
  const fullWeekHours = parsedHours.fullWeek;
  const hasHours = fullWeekHours.length > 0;
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // All outbound links (Menu, Wine list, Call) are folded into the primary action bar.
  // No separate sidebar Links section.

  // Sidebar: Scene / Atmosphere / Ambiance
  // placePersonality is an internal classification token (e.g. "concept-driven") —
  // never render it directly. SceneSense already derives display copy from it.
  const sceneTags = location.scenesense?.scene ?? [];
  const atmosphereTags = location.scenesense?.atmosphere ?? [];
  const energyTags = location.scenesense?.energy ?? [];
  const hasScene = sceneTags.length > 0;
  const hasAtmosphere = atmosphereTags.length > 0;
  const hasEnergy = energyTags.length > 0;

  // Primary CTAs — all outbound links live here (including Menu, Wine list, Call)
  const hasPrimaryCtas = !!(location.reservationUrl || location.website || location.instagram || location.tiktok || mapRefUrl || location.menuUrl || location.winelistUrl || phoneUrl);

  // More Maps
  const moreMapsCards = appearsOn.slice(0, 3);

  // Offering (Price row is surfaced in Scene instead)
  const offeringRows = buildOfferingLines(location);
  const hasOfferingSection = offeringRows.some(r => r.label !== 'Price');

  // B-lite fallback: treat low-density entities as "thin" and collapse to single column.
  const hasAboutSignal = !!location.description?.trim();
  const hasSceneSenseSignal = Boolean(
    (location.scenesense?.atmosphere?.length ?? 0) > 0 ||
    (location.scenesense?.energy?.length ?? 0) > 0 ||
    (location.scenesense?.scene?.length ?? 0) > 0
  );
  const hasCoverageSignal = Boolean(
    location.pullQuote ||
    (location.coverageSources?.length ?? 0) > 0
  );
  const hasTaglineSignal = !!location.tagline?.trim();
  const contentDensityScore = [
    hasAboutSignal,
    hasOfferingSection,
    hasSceneSenseSignal,
    hasCoverageSignal,
    hasTaglineSignal,
  ].filter(Boolean).length;
  const isThinEntity = contentDensityScore < 2;
  const shouldShowSidebar = !isThinEntity;
  const todayHours = fullWeekHours.find((row) => row.day === todayDayName) ?? null;
  const cappedCoverageSources = (location.coverageSources ?? [])
    .slice()
    .sort((a, b) => {
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .slice(0, 5);

  return (
    <div style={{ background: '#F5F0E1', minHeight: '100vh' }}>
      <GlobalHeader variant="immersive" onShare={handleShare} />

      <main id="place-page">
        <div id="document-frame">
          <div id="page-canvas">
            {/* ═══ TWO-COLUMN BODY ═══ */}
            <div id="two-column-body" className={isThinEntity ? 'thin-layout' : undefined}>

              {/* ─── LEFT: MAIN COLUMN ─── */}
              <div id="main-column">
                {location.businessStatus && location.businessStatus !== 'OPERATIONAL' && (
                  <div id="business-status-banner" className={`business-status-${location.businessStatus.toLowerCase().replace(/_/g, '-')}`}>
                    {location.businessStatus === 'CLOSED_PERMANENTLY' && 'Permanently closed'}
                    {location.businessStatus === 'CLOSED_TEMPORARILY' && 'Temporarily closed'}
                  </div>
                )}
                <h1 id="place-title" className="sk-display">{location.name}</h1>
                {displayIdentitySubline && (
                  <p id="identity-subline" className="sk-identity">{displayIdentitySubline}</p>
                )}
                {displayTagline && (
                  <p id="identity-tagline">{displayTagline}</p>
                )}
                {location.timefold?.approvedBy && (
                  <p id="timefold-signal" className="sk-meta">{location.timefold.phrase}</p>
                )}
                {hasSignalsSentence && (
                  <p id="identity-signals" className="sk-identity">
                    {openStateLabel && <em>{openStateLabel}</em>}
                    {openStateLabel && energyPhrase && ' — '}
                    {energyPhrase}
                  </p>
                )}

                {hasPrimaryCtas && (
                  <div id="primary-ctas">
                    {location.reservationUrl && (
                      <a href={location.reservationUrl} target="_blank" rel="noopener noreferrer">
                        {location.reservationProviderLabel ?? 'Reserve'}{' '}
                        <span className="action-arrow">↗</span>
                      </a>
                    )}
                    {location.website && (
                      <a href={location.website} target="_blank" rel="noopener noreferrer">Website <span className="action-arrow">↗</span></a>
                    )}
                    {location.instagram && (
                      <a href={`https://instagram.com/${location.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">Instagram <span className="action-arrow">↗</span></a>
                    )}
                    {location.tiktok && (
                      <a href={`https://tiktok.com/@${location.tiktok.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">TikTok <span className="action-arrow">↗</span></a>
                    )}
                    {mapRefUrl && (
                      <a href={mapRefUrl} target="_blank" rel="noopener noreferrer">Directions <span className="action-arrow">↗</span></a>
                    )}
                    {location.menuUrl && (
                      <a href={location.menuUrl} target="_blank" rel="noopener noreferrer">Menu <span className="action-arrow">↗</span></a>
                    )}
                    {location.winelistUrl && (
                      <a href={location.winelistUrl} target="_blank" rel="noopener noreferrer">Wine list <span className="action-arrow">↗</span></a>
                    )}
                    {phoneUrl && (
                      <a href={phoneUrl}>Call <span className="action-arrow">↗</span></a>
                    )}
                  </div>
                )}

                {isThinEntity && (hasHours || location.address || phoneUrl) && (
                  <>
                    <div className="sk-section-header"><span>Details</span></div>
                    <div id="thin-details-block">
                      {hasHours && (
                        <p>
                          <strong>Hours:</strong>{' '}
                          {todayHours ? `${todayHours.day}: ${todayHours.hours}` : 'See current weekly schedule below.'}
                        </p>
                      )}
                      {location.address && (
                        <p>
                          <strong>Address:</strong> {location.address}
                          {mapRefUrl && (
                            <>
                              {' '}
                              <a href={mapRefUrl} target="_blank" rel="noopener noreferrer">
                                Map <span className="action-arrow">↗</span>
                              </a>
                            </>
                          )}
                        </p>
                      )}
                      {phoneUrl && rawPhone && (
                        <p>
                          <a href={phoneUrl}>Call {rawPhone} <span className="action-arrow">↗</span></a>
                        </p>
                      )}
                    </div>
                  </>
                )}

                {location.description && (
                  <>
                    <div className="sk-section-header"><span>About</span></div>
                    <div id="identity-description">
                      <p>{location.description}</p>
                    </div>
                  </>
                )}

                {hasOfferingSection && (
                  <>
                    <div className="sk-section-header"><span>Offering</span></div>
                    <div id="offering-signals-rows">
                      {offeringRows.filter(r => r.label !== 'Price').map((row) => (
                        <div key={row.label} className="offering-row">
                          <span className="offering-label">{row.label}</span>
                          <p className="offering-sentence">{row.sentence}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {validPhotos.length > 0 && (
                  <>
                    <div className="sk-section-header"><span>Photos</span></div>
                    <div id="photos-grid">
                      {validPhotos.slice(0, 6).map((url, i) => (
                        <div key={url} className={`photo-tile photo-tile-${i + 1}`} role="button" tabIndex={0} onClick={() => openGallery(i)} onKeyDown={(e) => e.key === 'Enter' && openGallery(i)}>
                          <img src={url} alt="" onError={() => handlePhotoError(url)} />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {location.pullQuote && (
                  <>
                    <div className="sk-section-header"><span>Coverage</span></div>
                    <blockquote id="pull-quote">
                      <p>&ldquo;{location.pullQuote}&rdquo;</p>
                      <cite>
                        {location.pullQuoteUrl ? (
                          <>
                            <a href={location.pullQuoteUrl} target="_blank" rel="noopener noreferrer" className="pull-quote-link">
                              {location.pullQuoteSource || 'Source'}
                            </a>
                            {location.pullQuoteAuthor && ` — ${location.pullQuoteAuthor}`}
                          </>
                        ) : (
                          [location.pullQuoteSource, location.pullQuoteAuthor].filter(Boolean).join(' — ')
                        )}
                      </cite>
                    </blockquote>
                  </>
                )}

                {location.curatorNote && (
                  <>
                    <div className="sk-section-header"><span>Curator Note</span></div>
                    <article id="curator-note">
                      <p>{location.curatorNote}</p>
                      {location.curatorCreatorName && <p className="curator-byline">{location.curatorCreatorName}</p>}
                    </article>
                  </>
                )}

                {location.tips && location.tips.length > 0 && (
                  <>
                    <div className="sk-section-header"><span>Tips</span></div>
                    <ul id="tips-list">
                      {location.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Parks: Amenities */}
                {location.amenities && location.amenities.length > 0 && (
                  <>
                    <div className="sk-section-header"><span>Amenities</span></div>
                    <div className="amenity-chips">
                      {location.amenities.map((amenity, i) => (
                        <span key={i} className="amenity-chip">{amenity}</span>
                      ))}
                    </div>
                  </>
                )}

                {/* Parks: Facilities within this park */}
                {location.parkFacilities && location.parkFacilities.length > 0 && (
                  <>
                    <div className="sk-section-header"><span>Facilities</span></div>
                    <ul className="park-facilities-list">
                      {location.parkFacilities.map((fac) => (
                        <li key={fac.id}>
                          <Link href={`/place/${fac.slug}`}>
                            {fac.name}
                            {fac.category && <span className="facility-category"> · {fac.category}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Parks: Parent park link */}
                {location.parentPark && (
                  <>
                    <div className="sk-section-header"><span>Part of</span></div>
                    <p className="parent-park-link">
                      <Link href={`/place/${location.parentPark.slug}`}>
                        {location.parentPark.name}
                      </Link>
                    </p>
                  </>
                )}
              </div>

              {/* ─── RIGHT: SIDEBAR COLUMN ─── */}
              {shouldShowSidebar && (
                <aside id="sidebar-column">
                  <div className="sidebar-spacer" aria-hidden="true" />

                {hasHours && (
                  <>
                    <div className="sk-section-header"><span>Hours</span></div>
                    <div id="hours-block">
                      <div className="hours-table">
                        {fullWeekHours.map((row) => (
                          <div key={row.day} className={`hours-row sk-utility sk-utility-tabular${row.day === todayDayName ? ' hours-row-today' : ''}`}>
                            <span className="hours-day">{row.short}</span>
                            <span className="hours-time">{row.hours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {location.address && (
                  <>
                    <div className="sk-section-header"><span>Address</span></div>
                    <div id="address-block">
                      <p className="address-text">{location.address}</p>
                      {mapRefUrl && (
                        <a href={mapRefUrl} target="_blank" rel="noopener noreferrer" className="map-link">
                          Map <span className="action-arrow">↗</span>
                        </a>
                      )}
                    </div>
                  </>
                )}

                {(location.signatureDishes?.length || location.keyProducers?.length) ? (
                  <>
                    <div className="sk-section-header"><span>Known For</span></div>
                    {location.signatureDishes && location.signatureDishes.length > 0 && (
                      <p className="known-for-line">
                        Signature dishes include {toSentenceList(location.signatureDishes.slice(0, 4))}.
                      </p>
                    )}
                    {getWineProducerNames(location.keyProducers, 4).length > 0 && (
                      <p id="key-producers" className="known-for-line">
                        {(location.offeringSignals?.wineProgramIntent === 'natural_leaning' || location.offeringSignals?.wineProgramIntent === 'natural')
                          ? `Natural wine focus includes producers like ${toSentenceList(getWineProducerNames(location.keyProducers, 4))}.`
                          : `Wine focus includes producers like ${toSentenceList(getWineProducerNames(location.keyProducers, 4))}.`}
                      </p>
                    )}
                  </>
                ) : null}

                {hasAtmosphere && (
                  <>
                    <div className="sk-section-header"><span>Atmosphere</span></div>
                    <div className="sidebar-tag-block">
                      {atmosphereTags.map((tag, i) => (
                        <p key={i}>{tag}</p>
                      ))}
                    </div>
                  </>
                )}

                {hasEnergy && (
                  <>
                    <div className="sk-section-header"><span>Energy</span></div>
                    <div className="sidebar-tag-block">
                      {energyTags.map((tag, i) => (
                        <p key={i}>{tag}</p>
                      ))}
                    </div>
                  </>
                )}

                {hasScene && (
                  <>
                    <div className="sk-section-header"><span>Scene</span></div>
                    <div className="sidebar-tag-block">
                      {sceneTags.length > 0 && (
                        <p className="tag-line">{sceneTags.join(' · ')}</p>
                      )}
                    </div>
                  </>
                )}

                {cappedCoverageSources.length > 0 && (
                  <div id="appendix-coverage">
                    <div className="sk-section-header"><span>Coverage</span></div>
                    <ul className="coverage-entries">
                      {cappedCoverageSources.map((cs) => (
                        <li key={cs.url} className="coverage-entry">
                          <span className="coverage-source-name">{cs.sourceName}</span>
                          {cs.excerpt && <p className="coverage-excerpt">{cs.excerpt}</p>}
                          {cs.publishedAt && (
                            <span className="coverage-date">
                              {new Date(cs.publishedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          <a href={cs.url} target="_blank" rel="noopener noreferrer" className="coverage-read-link">
                            Read article <span className="action-arrow">↗</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {appendixGroups.length > 0 && (
                  <nav id="appendix-index" aria-label="Appendix navigation">
                    <div className="sk-section-header"><span>Index</span></div>
                    <ul>
                      {appendixGroups.map((group) => (
                        <li key={group.anchorId}>
                          <a href={`#${group.anchorId}`}>{group.label}</a>
                        </li>
                      ))}
                      <li><a href="#appendix-methodology">Methodology</a></li>
                    </ul>
                    <div className="reference-legend">
                      <svg className="legend-globe" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                      <span>Section references<br/>Links to source entry in References</span>
                    </div>
                  </nav>
                )}
                </aside>
              )}
            </div>

            {/* ═══ FULL-WIDTH SECTIONS ═══ */}

            {moreMapsCards.length > 0 && <hr className="heavy-rule" />}

            {moreMapsCards.length > 0 && (
              <section id="more-maps">
                <h2>More Maps</h2>
                <div id="more-maps-grid">
                  {moreMapsCards.map((map) => (
                    <Link key={map.id} href={`/map/${map.slug}`} className="map-card">
                      {map.coverImageUrl && (
                        <div className="map-card-image" style={{ backgroundImage: `url(${map.coverImageUrl})` }} />
                      )}
                      <div className="map-card-body">
                        <span className="map-card-type">
                          MAP · {map.placeCount ?? 0} {(map.placeCount ?? 0) === 1 ? 'PLACE' : 'PLACES'}
                        </span>
                        <span className="map-card-title">{map.title}</span>
                        <span className="map-card-creator">
                          {map.authorType === 'saiko' ? 'Curator Pick' : `By ${map.creatorName}`}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {recognitions.length > 0 && (
              <section id="recognitions-section">
                <h2>Recognitions</h2>
                <ul id="recognitions-list">
                  {recognitions.map((rec, i) => (
                    <li key={i}>{rec.name}{rec.source ? ` — ${rec.source}` : ''}{rec.year ? ` (${rec.year})` : ''}</li>
                  ))}
                </ul>
              </section>
            )}

            <hr className="heavy-rule" />

            <footer id="place-appendix">
              {/* REFERENCES column */}
              <div id="appendix-references">
                <h2>References</h2>
                {appendixGroups.map((group) => (
                  <div key={group.anchorId} className="appendix-ref-group" id={group.anchorId}>
                    <h3>{group.label}</h3>
                    <ul className="appendix-ref-entries">
                      {group.entries.map((entry, i) => (
                        <li key={i}>{entry.source}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div id="appendix-methodology" className="appendix-ref-group">
                  <h3>Methodology</h3>
                  <p><Link href="/sources">How Saiko assembles place pages</Link></p>
                </div>
              </div>

              {/* PLATE MARK */}
              <p id="plate-mark">Saiko Fields: Los Angeles</p>
            </footer>
          </div>
        </div>
      </main>

      {lightboxOpen && validPhotos.length > 0 && (
        <GalleryLightbox photos={validPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}

      <GlobalFooter variant="minimal" />
    </div>
  );
}
