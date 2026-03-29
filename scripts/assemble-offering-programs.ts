#!/usr/bin/env node
/**
 * WO-006 — Offering Program Schema v1
 *
 * Assembles the canonical offering_programs derived signal from existing
 * upstream signals. This is an assembly-only pass — no model calls, no new
 * interpretation, no inference beyond the mapping rules below.
 *
 * Source signals consumed (read-only):
 *   • menu_identity    v1                 (cuisine_posture, service_model, wine_program_intent)
 *   • menu_structure   v1                 (signals[], confidence, evidence[])
 *   • identity_signals extract-identity-v1 (supplemental; currently unused in v1 mapping)
 *
 * Output:
 *   derived_signals  signal_key = 'offering_programs'  signal_version = 'v1'
 *
 * Canonical programs:
 *   food_program · wine_program · beer_program · cocktail_program
 *   non_alcoholic_program · coffee_tea_program · service_program
 *
 * Canonical maturity vocabulary:
 *   none | incidental | considered | dedicated | unknown
 *
 * Usage:
 *   npx tsx scripts/assemble-offering-programs.ts [--limit=N] [--slug=<slug>] [--dry-run] [--reprocess] [--verbose]
 *
 * Notes:
 *   • Idempotent by default — skips entities that already have offering_programs v1
 *   • --reprocess forces reassembly even if a signal already exists
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  loadEnv({ path: '.env.local', override: true });
}

import { db }              from "../lib/db";
import { writeDerivedSignal } from "../lib/fields-v2/write-claim";
import { materializeCoverageEvidence, type CoverageEvidence } from "../lib/coverage/normalize-evidence";
import { ORCHESTRATION_REASON, type OrchestrationReason, FRESHNESS_WINDOWS_MS, ageMs } from "../lib/enrichment/orchestration-reasons";
import { getOfferingExpectationProfile } from "../lib/offering/expectation-profile";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SIGNAL_KEY     = "offering_programs";
const SIGNAL_VERSION = "v1";

const SRC_MENU_IDENTITY    = { key: "menu_identity",    version: "v1" };
const SRC_MENU_STRUCTURE   = { key: "menu_structure",   version: "v1" };
const SRC_IDENTITY_SIGNALS = { key: "identity_signals", version: "extract-identity-v1" };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProgramMaturity = "none" | "incidental" | "considered" | "dedicated" | "unknown";
type ProgramClass = "food" | "beverage" | "events" | "service";

interface ProgramEntry {
  programClass: ProgramClass;
  maturity:   ProgramMaturity;
  signals:    string[];
  confidence: number;
  evidence:   string[];
}

interface OfferingPrograms {
  foodProgram:              ProgramEntry;
  wineProgram:              ProgramEntry;
  beerProgram:              ProgramEntry;
  cocktailProgram:          ProgramEntry;
  nonAlcoholicProgram:     ProgramEntry;
  coffeeTeaProgram:        ProgramEntry;
  serviceProgram:           ProgramEntry;
  privateDiningProgram:    ProgramEntry;
  groupDiningProgram:      ProgramEntry;
  cateringProgram:          ProgramEntry;
  dumplingProgram:          ProgramEntry;
  sushiRawFishProgram:    ProgramEntry;
  ramenNoodleProgram:      ProgramEntry;
  tacoProgram:              ProgramEntry;
  pizzaProgram:             ProgramEntry;
  sourceCoverage: {
    menuIdentityPresent:         boolean;
    menuStructurePresent:        boolean;
    identitySignalsPresent:      boolean;
    merchantSurfaceScansPresent: boolean;
    coverageEvidencePresent:     boolean;
    coverageSourceCount:         number;
  };
  sourceTimestamps: {
    menuIdentity:    string | null;
    menuStructure:   string | null;
    identitySignals: string | null;
    coverageEvidence: string | null;
  };
  readiness: {
    isReadyForOfferingAssembly: boolean;
    gateReasons: OrchestrationReason[];
  };
}

interface MenuIdentityPayload {
  cuisinePosture:               string | null;
  cuisinePostureConfidence:    number;
  cuisinePostureEvidence:      string | null;
  serviceModel:                 string | null;
  serviceModelConfidence:      number;
  serviceModelEvidence:        string | null;
  wineProgramIntent:           string | null;
  wineProgramIntentConfidence: number;
  wineProgramIntentEvidence:  string | null;
}

// WO-008: signal-level evidence format
interface SignalEntry {
  signal:   string;
  evidence: string[];
}

// Supports both the WO-008 (object signals) and legacy (string signals) formats
interface MenuStructurePayloadV2 {
  signals:    SignalEntry[];
  confidence: number;
}

interface MenuStructurePayloadLegacy {
  signals:    string[];
  confidence: number;
  evidence:   string[];
}

type MenuStructurePayload = MenuStructurePayloadV2 | MenuStructurePayloadLegacy;

interface IdentitySignalsPayload {
  cuisinePosture:       string | null;
  serviceModel:         string | null;
  wineProgramIntent:   string | null;
  extractionConfidence: number;
}

interface MerchantSurfaceScanHints {
  privateDiningPresent: boolean;
  eventsSurfaceExists:  boolean;
}

interface SourceSignals {
  menuIdentity:    { payload: MenuIdentityPayload; computedAt: Date } | null;
  menuStructure:   { payload: MenuStructurePayload; computedAt: Date } | null;
  identitySignals: { payload: IdentitySignalsPayload; computedAt: Date } | null;
  surfaceScanHints: MerchantSurfaceScanHints | null;
  coverageEvidence: CoverageEvidence | null;
}

interface AssembleTarget {
  entityId:   string;
  entityName: string;
  slug:        string;
  primaryVertical: string | null;
  placeType: 'venue' | 'activity' | 'public' | null;
}

// ---------------------------------------------------------------------------
// Signal vocabulary sets
// ---------------------------------------------------------------------------

const FOOD_SIGNALS = new Set([
  "shared_plate_structure",
  "large_format_mains",
  "vegetable_heavy",
  "seafood_heavy",
  "meat_forward",
  "fermentation_focus",
  "pizza_program",
  "raw_bar",
  "bakery_program",
  "pastry_program",
  "sandwich_program",
  "rotisserie_program",
  "tasting_menu_present",
  "prix_fixe_present",
  // WO-008: street-food vocabulary
  "taco_program",
  "street_food_program",
  "tortilla_program",
]);

// Street-food signals that always imply dedicated food program
const STREET_FOOD_DEDICATED_SIGNALS = new Set([
  "taco_program",
  "street_food_program",
]);

const DUMPLING_SIGNALS = new Set([
  "dumpling_program",
  "dumpling_specialist",
  "dumpling_house_made",
  "xlb",              // xiao long bao
  "jiaozi",           // Chinese potstickers
  "mandu",            // Korean
  "gyoza",            // Japanese
  "momo",             // Himalayan
  "khinkali",         // Georgian
  "pierogi",          // Eastern European
  "wontons",
  "har_gow",          // shrimp dumpling (dim sum)
  "siu_mai",          // pork dumpling (dim sum)
]);

const WINE_SIGNALS = new Set([
  "extensive_wine_list",
  "natural_wine_presence",
  "aperitif_focus",  // WO-008: moved from cocktail → wine
]);

const COFFEE_TEA_SIGNALS = new Set([
  "coffee_program",
  "espresso_program",
  "specialty_coffee_presence",
  "tea_program",
  "specialty_tea_presence",
  "breakfast_service",
  "brunch_service",
  "morning_service",
]);

const EVENT_SIGNALS = new Set([
  "private_room_available",
  "full_buyout_available",
  "semi_private_available",
  "events_coordinator",
  "inquiry_form_present",
  "events_page_present",
  "catering_menu_present",
  "off_site_catering",
  "on_site_catering",
  "group_menu_available",
  "minimum_headcount",
  "prix_fixe_group_menu",
]);

const PRIVATE_DINING_SIGNALS = new Set([
  "private_room_available",
  "full_buyout_available",
  "semi_private_available",
  "events_coordinator",
  "inquiry_form_present",
  "events_page_present",
]);

const GROUP_DINING_SIGNALS = new Set([
  "group_menu_available",
  "minimum_headcount",
  "prix_fixe_group_menu",
]);

const CATERING_SIGNALS = new Set([
  "catering_menu_present",
  "off_site_catering",
  "on_site_catering",
]);

const SUSHI_RAW_FISH_SIGNALS = new Set([
  // Tier 1 — Identity (Program Trigger)
  "sushi_presence",
  "raw_fish_presence",
  "nigiri_presence",
  // Tier 2 — Distinctive (Depth + Specialization)
  "omakase_service",
  "sashimi_program",
  "hand_roll_program",
  "premium_fish_sourcing",
  "seasonal_fish_rotation",
  "rice_quality_signal",
  // Tier 3 — Detail (Refinement)
  "fish_origin_specificity",
  "knife_work_emphasis",
  "course_progression_structure",
  "minimalist_presentation",
]);

const RAMEN_NOODLE_SIGNALS = new Set([
  // Tier 1 — Identity (Program Trigger)
  "ramen_presence",
  "noodle_focus",
  "ramen_ya_identity",
  // Tier 2 — Broth System (Primary Axis)
  "broth_type_defined",
  "tonkotsu_presence",
  "shoyu_presence",
  "shio_presence",
  "miso_presence",
  // Tier 2b — Structural Execution (Depth + Specialization)
  "house_made_noodles",
  "tsukemen_presence",
  "broth_depth_signal",
  "tare_variation",
  "noodle_texture_control",
  "specialization_signal",
  // Tier 3 — Refinement (Regional + Expression)
  "regional_style_reference",
  "broth_blend_signal",
]);

const TACO_SIGNALS = new Set([
  // Tier 1 — Identity (Program Trigger)
  "taco_presence",
  "taco_focus",
  "taqueria_identity",
  // Tier 2 — Primary Differentiation (Subtype Signals)
  "al_pastor_presence",
  "birria_presence",
  "carnitas_presence",
  "carne_asada_presence",
  "seafood_taco_presence",
  "guisado_presence",
  "barbacoa_presence",
  "pollo_taco_presence",
  "vegetarian_taco_presence",
  // Tier 2b — Structural Execution (Tortilla + Cooking + Accompaniment)
  "handmade_tortilla",
  "corn_tortilla_presence",
  "flour_tortilla_presence",
  "nixtamal_presence",
  "heirloom_corn_presence",
  "trompo_presence",
  "mesquite_or_charcoal_grill",
  "braised_stewed_preparation",
  "fried_taco_presence",
  "salsa_program",
  // Tier 3 — Refinement & Expression
  "regional_style_reference",
  "hybrid_taco_signal",
  "chef_driven_taco_signal",
  "tortilla_supplier_notability",
]);

const PIZZA_SIGNALS = new Set([
  // Tier 1 — Identity (Program Trigger)
  "pizza_presence",
  "pizzeria_identity",
  "slice_shop_identity",
  // Tier 2 — Primary Differentiation (Style Signals)
  "neapolitan_style",
  "new_york_style",
  "detroit_style",
  "chicago_style",
  "roman_style",
  "sicilian_style",
  "new_haven_style",
  "california_style",
  "hybrid_pizza_style",
  // Tier 2b — Structural Execution (Dough + Oven)
  "long_fermentation",
  "sourdough_presence",
  "high_hydration_dough",
  "thin_crust",
  "thick_crust",
  "pan_dough",
  "wood_fired_oven",
  "deck_oven",
  "coal_fired_oven",
  "pan_baked",
  "foldable_slice",
  "crispy_edge_crust",
  "soft_center",
  "airy_structure",
  // Tier 3 — Refinement & Expression
  "ingredient_quality_signal",
  "topping_creativity",
  "seasonal_toppings",
  "slice_vs_whole_pie_format",
  "chef_driven_pizza_signal",
]);

// wine_program_intent values that represent a strong, directional wine identity
const STRONG_WINE_INTENTS = new Set([
  "serious",
  "dedicated",
  "integrated",
  "mediterranean_focused",
  "california_leaning",
  "classical",
  "natural_leaning",
  "eclectic",
]);

// ---------------------------------------------------------------------------
// Menu structure format normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes menu_structure payload to a canonical SignalEntry[] regardless
 * of whether the stored payload uses the WO-008 object format or the legacy
 * string-array format. Ensures the assembler is backward-compatible.
 */
function normalizeStructureSignals(payload: MenuStructurePayload): SignalEntry[] {
  if (!Array.isArray(payload.signals) || payload.signals.length === 0) return [];

  const first = payload.signals[0];

  if (typeof first === "string") {
    // Legacy format: signals is string[], evidence is a parallel array
    const legacy = payload as MenuStructurePayloadLegacy;
    return (legacy.signals as string[]).map((signal, i) => ({
      signal,
      evidence: legacy.evidence?.[i] ? [legacy.evidence[i]] : [],
    }));
  }

  // WO-008 format: signals is SignalEntry[]
  return payload.signals as SignalEntry[];
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeGateReasons(src: SourceSignals, target: AssembleTarget): OrchestrationReason[] {
  const reasons: OrchestrationReason[] = [];
  const profile = getOfferingExpectationProfile({
    primaryVertical: target.primaryVertical,
    placeType: target.placeType,
  });
  const requiresMenuSignals =
    profile.programs.food || profile.programs.wine || profile.programs.beer || profile.programs.coffee;
  const requiresCoverage = profile.richMode.minCoverageSources > 0;

  if (requiresMenuSignals) {
    if (!src.menuIdentity) {
      reasons.push(ORCHESTRATION_REASON.NO_MENU_IDENTITY_SIGNAL);
    } else {
      const menuIdentityAge = ageMs(src.menuIdentity.computedAt);
      if (menuIdentityAge !== null && menuIdentityAge > FRESHNESS_WINDOWS_MS.MENU_SIGNAL_MAX_AGE) {
        reasons.push(ORCHESTRATION_REASON.MENU_IDENTITY_STALE);
      }
    }

    if (!src.menuStructure) {
      reasons.push(ORCHESTRATION_REASON.NO_MENU_STRUCTURE_SIGNAL);
    } else {
      const menuStructureAge = ageMs(src.menuStructure.computedAt);
      if (menuStructureAge !== null && menuStructureAge > FRESHNESS_WINDOWS_MS.MENU_SIGNAL_MAX_AGE) {
        reasons.push(ORCHESTRATION_REASON.MENU_STRUCTURE_STALE);
      }
    }
  }

  if (requiresCoverage) {
    if (!src.coverageEvidence) {
      reasons.push(ORCHESTRATION_REASON.NO_COVERAGE_EVIDENCE);
    } else {
      const coverageAge = ageMs(src.coverageEvidence.materializedAt);
      if (coverageAge !== null && coverageAge > FRESHNESS_WINDOWS_MS.COVERAGE_MAX_AGE) {
        reasons.push(ORCHESTRATION_REASON.COVERAGE_STALE);
      }
    }
  }

  return reasons;
}

function assemblePrograms(src: SourceSignals): OfferingPrograms {
  const mi = src.menuIdentity?.payload ?? null;
  const ms = src.menuStructure?.payload ?? null;

  // Normalize to SignalEntry[] regardless of stored format (legacy or WO-008)
  const signalEntries: SignalEntry[] = ms ? normalizeStructureSignals(ms) : [];
  const msSignalNames = signalEntries.map((e) => e.signal);

  // Helper: collect evidence only from signals relevant to a given set
  function evidenceFor(signalSet: Set<string>): string[] {
    return signalEntries
      .filter((e) => signalSet.has(e.signal))
      .flatMap((e) => e.evidence)
      .filter((ev): ev is string => typeof ev === "string" && ev.length > 0);
  }

  // ── food_program ──────────────────────────────────────────────────────────

  const foodSignalNames = msSignalNames.filter((s) => FOOD_SIGNALS.has(s));
  const foodEvidence    = [
    mi?.cuisinePostureEvidence ?? null,
    ...evidenceFor(FOOD_SIGNALS),
  ].filter((e): e is string => typeof e === "string" && e.length > 0);

  const foodConfPool: number[] = [];
  if (mi && typeof mi.cuisinePostureConfidence === "number") foodConfPool.push(mi.cuisinePostureConfidence);
  if (ms && typeof ms.confidence === "number")                  foodConfPool.push(ms.confidence);
  const foodConfidence = foodConfPool.length > 0
    ? round2(foodConfPool.reduce((a, b) => a + b, 0) / foodConfPool.length)
    : 0;

  // WO-008: street-food signals → always dedicated regardless of count
  const hasStreetFood = foodSignalNames.some((s) => STREET_FOOD_DEDICATED_SIGNALS.has(s));

  let foodMaturity: ProgramMaturity = "unknown";
  if (hasStreetFood) {
    foodMaturity = "dedicated";
  } else if (mi && foodSignalNames.length >= 3 && foodConfidence >= 0.85) {
    foodMaturity = "dedicated";
  } else if (mi && foodSignalNames.length > 0) {
    foodMaturity = "considered";
  } else if (mi) {
    foodMaturity = "incidental";
  } else if (ms && foodSignalNames.length > 0) {
    foodMaturity = "considered";
  }

  // ── wine_program ──────────────────────────────────────────────────────────
  // WO-008: aperitif_focus is now a wine signal (removed from cocktail)

  const wineSignalNames = msSignalNames.filter((s) => WINE_SIGNALS.has(s));
  const wineIntent      = mi?.wineProgramIntent ?? null;
  const wineEvidence    = [
    mi?.wineProgramIntentEvidence ?? null,
    ...evidenceFor(WINE_SIGNALS),
  ].filter((e): e is string => typeof e === "string" && e.length > 0);

  const wineConf: number =
    typeof mi?.wineProgramIntentConfidence === "number"
      ? mi.wineProgramIntentConfidence
      : wineSignalNames.length > 0 && typeof ms?.confidence === "number"
        ? ms.confidence
        : 0;

  let wineMaturity: ProgramMaturity = "unknown";
  if (wineIntent === "none") {
    wineMaturity = "none";
  } else if (wineIntent === null && wineSignalNames.length === 0) {
    wineMaturity = "unknown";
  } else if (wineIntent === "light" && wineSignalNames.length === 0) {
    wineMaturity = "incidental";
  } else if (wineIntent !== null && STRONG_WINE_INTENTS.has(wineIntent) && wineSignalNames.length > 0) {
    wineMaturity = "dedicated";
  } else if (wineIntent !== null || wineSignalNames.length > 0) {
    wineMaturity = "considered";
  }

  // ── beer_program ──────────────────────────────────────────────────────────

  const beerSignalSet = new Set(["beer_program"]);
  const hasBeer       = msSignalNames.includes("beer_program");
  const beerProgram: ProgramEntry = hasBeer
    ? {
        programClass: "beverage",
        maturity:   "considered",
        signals:    ["beer_program"],
        confidence: ms ? round2(ms.confidence) : 0,
        evidence:   evidenceFor(beerSignalSet),
      }
    : { program_class: "beverage", maturity: "unknown", signals: [], confidence: 0, evidence: [] };

  // ── cocktail_program ──────────────────────────────────────────────────────
  // WO-008: aperitif_focus removed — cocktail_program only

  const cocktailSignalSet    = new Set(["cocktail_program"]);
  const cocktailSignalNames  = msSignalNames.filter((s) => cocktailSignalSet.has(s));
  const hasCocktail          = cocktailSignalNames.length > 0;
  const cocktailProgram: ProgramEntry = hasCocktail
    ? {
        programClass: "beverage",
        maturity:   "considered",
        signals:    cocktailSignalNames,
        confidence: ms ? round2(ms.confidence) : 0,
        evidence:   evidenceFor(cocktailSignalSet),
      }
    : { program_class: "beverage", maturity: "unknown", signals: [], confidence: 0, evidence: [] };

  // ── non_alcoholic_program (no inference in v1) ────────────────────────────

  const nonAlcoholicProgram: ProgramEntry = {
    program_class: "beverage", maturity: "unknown", signals: [], confidence: 0, evidence: [],
  };

  // ── coffee_tea_program ─────────────────────────────────────────────────────
  const coffeeTeaSignalNames = msSignalNames.filter((s) => COFFEE_TEA_SIGNALS.has(s));
  const coffeeTeaProgram: ProgramEntry = coffeeTeaSignalNames.length > 0
    ? {
        programClass: "beverage",
        maturity: coffeeTeaSignalNames.length >= 2 ? "considered" : "incidental",
        signals: coffeeTeaSignalNames,
        confidence: ms ? round2(ms.confidence) : 0,
        evidence: evidenceFor(COFFEE_TEA_SIGNALS),
      }
    : { program_class: "beverage", maturity: "unknown", signals: [], confidence: 0, evidence: [] };

  // ── service_program ───────────────────────────────────────────────────────

  const serviceModel    = mi?.serviceModel ?? null;
  const serviceEvidence = [mi?.serviceModelEvidence ?? null]
    .filter((e): e is string => typeof e === "string" && e.length > 0);
  const serviceConf     =
    typeof mi?.serviceModelConfidence === "number" ? round2(mi.serviceModelConfidence) : 0;
  const serviceSignals  = serviceModel ? [serviceModel] : [];
  const serviceMaturity: ProgramMaturity = serviceModel ? "considered" : "unknown";

  // ── private_dining_program ────────────────────────────────────────────────

  const pdSignalNames = msSignalNames.filter((s) => PRIVATE_DINING_SIGNALS.has(s));
  const scanHints     = src.surfaceScanHints;
  const hasPrivateDiningPresent = scanHints?.privateDiningPresent ?? false;
  const hasEventsSurface        = scanHints?.eventsSurfaceExists ?? false;

  let privateDiningMaturity: ProgramMaturity = "unknown";
  if (hasEventsSurface && pdSignalNames.length > 0) {
    // Dedicated events page + extracted signals → dedicated
    privateDiningMaturity = "dedicated";
  } else if (hasEventsSurface) {
    // Events page exists but no parsed signals yet → considered
    privateDiningMaturity = "considered";
  } else if (hasPrivateDiningPresent) {
    // merchant_surface_scans boolean flag only → incidental
    privateDiningMaturity = "incidental";
  } else if (pdSignalNames.length > 0) {
    // Signals from other surfaces (about page, etc.) → considered
    privateDiningMaturity = "considered";
  }

  const privateDiningProgram: ProgramEntry = {
    programClass: "events",
    maturity:   privateDiningMaturity,
    signals:    hasPrivateDiningPresent && pdSignalNames.length === 0
      ? ["private_room_available"] : pdSignalNames,
    confidence: privateDiningMaturity === "unknown" ? 0 : hasEventsSurface ? 0.8 : 0.5,
    evidence:   evidenceFor(PRIVATE_DINING_SIGNALS),
  };

  // ── group_dining_program ────────────────────────────────────────────────

  const gdSignalNames = msSignalNames.filter((s) => GROUP_DINING_SIGNALS.has(s));
  let groupDiningMaturity: ProgramMaturity = "unknown";
  if (gdSignalNames.length > 0 && hasEventsSurface) {
    groupDiningMaturity = "dedicated";
  } else if (gdSignalNames.length > 0) {
    groupDiningMaturity = "considered";
  }

  const groupDiningProgram: ProgramEntry = {
    programClass: "events",
    maturity:   groupDiningMaturity,
    signals:    gdSignalNames,
    confidence: groupDiningMaturity === "unknown" ? 0 : hasEventsSurface ? 0.8 : 0.5,
    evidence:   evidenceFor(GROUP_DINING_SIGNALS),
  };

  // ── catering_program ────────────────────────────────────────────────────

  const catSignalNames = msSignalNames.filter((s) => CATERING_SIGNALS.has(s));
  let cateringMaturity: ProgramMaturity = "unknown";
  if (catSignalNames.length > 0 && hasEventsSurface) {
    cateringMaturity = "dedicated";
  } else if (catSignalNames.length > 0) {
    cateringMaturity = "considered";
  }

  const cateringProgram: ProgramEntry = {
    programClass: "events",
    maturity:   cateringMaturity,
    signals:    catSignalNames,
    confidence: cateringMaturity === "unknown" ? 0 : hasEventsSurface ? 0.8 : 0.5,
    evidence:   evidenceFor(CATERING_SIGNALS),
  };

  // ── dumpling_program ──────────────────────────────────────────────────────

  const dumplingSignalNames = msSignalNames.filter((s) => DUMPLING_SIGNALS.has(s));
  const hasDumplingSpecialist = dumplingSignalNames.includes("dumpling_specialist");

  let dumplingMaturity: ProgramMaturity = "unknown";
  if (hasDumplingSpecialist || dumplingSignalNames.length >= 3) {
    // Specialist signal or multiple dumpling type signals → dedicated
    dumplingMaturity = "dedicated";
  } else if (dumplingSignalNames.length > 0) {
    // Some dumpling signals present → considered
    dumplingMaturity = "considered";
  }

  const dumplingProgram: ProgramEntry = {
    programClass: "food",
    maturity:   dumplingMaturity,
    signals:    dumplingSignalNames,
    confidence: dumplingMaturity === "unknown" ? 0 : ms ? round2(ms.confidence) : 0.5,
    evidence:   evidenceFor(DUMPLING_SIGNALS),
  };

  // ── sushi_raw_fish_program ────────────────────────────────────────────────

  const sushiSignalNames = msSignalNames.filter((s) => SUSHI_RAW_FISH_SIGNALS.has(s));
  const hasSushiIdentity = sushiSignalNames.some((s) => ['sushi_presence', 'raw_fish_presence', 'nigiri_presence'].includes(s));
  const tier2SushiSignals = sushiSignalNames.filter((s) => [
    'omakase_service', 'sashimi_program', 'hand_roll_program',
    'premium_fish_sourcing', 'seasonal_fish_rotation', 'rice_quality_signal'
  ].includes(s));

  let sushiMaturity: ProgramMaturity = "unknown";
  if (sushiSignalNames.includes("omakase_service") || tier2SushiSignals.length >= 3) {
    // Omakase or 3+ distinctive signals → dedicated
    sushiMaturity = "dedicated";
  } else if (hasSushiIdentity || tier2SushiSignals.length > 0) {
    // Identity signal or any distinctive signal → considered
    sushiMaturity = "considered";
  }

  const sushiRawFishProgram: ProgramEntry = {
    programClass: "food",
    maturity:   sushiMaturity,
    signals:    sushiSignalNames,
    confidence: sushiMaturity === "unknown" ? 0 : 0.7,
    evidence:   evidenceFor(SUSHI_RAW_FISH_SIGNALS),
  };

  // ── ramen_noodle_program ──────────────────────────────────────────────────

  const ramenSignalNames = msSignalNames.filter((s) => RAMEN_NOODLE_SIGNALS.has(s));
  const hasRamenIdentity = ramenSignalNames.some((s) => ['ramen_presence', 'noodle_focus', 'ramen_ya_identity'].includes(s));

  // Broth system signals (primary axis)
  const brothSignals = ramenSignalNames.filter((s) => [
    'broth_type_defined', 'tonkotsu_presence', 'shoyu_presence', 'shio_presence', 'miso_presence', 'broth_blend_signal'
  ].includes(s));

  // Execution signals (supporting structure: noodles, tare, depth)
  const ramenExecutionSignals = ramenSignalNames.filter((s) => [
    'house_made_noodles', 'tsukemen_presence', 'broth_depth_signal',
    'tare_variation', 'noodle_texture_control', 'specialization_signal'
  ].includes(s));

  let ramenMaturity: ProgramMaturity = "unknown";
  if (brothSignals.length > 0 && ramenExecutionSignals.length >= 2) {
    // Broth identity + 2+ execution signals → dedicated
    ramenMaturity = "dedicated";
  } else if (hasRamenIdentity || brothSignals.length > 0) {
    // Identity signal or broth identity signal → considered
    ramenMaturity = "considered";
  }

  const ramenNoodleProgram: ProgramEntry = {
    programClass: "food",
    maturity:   ramenMaturity,
    signals:    ramenSignalNames,
    confidence: ramenMaturity === "unknown" ? 0 : 0.7,
    evidence:   evidenceFor(RAMEN_NOODLE_SIGNALS),
  };

  // ── taco_program ──────────────────────────────────────────────────────────

  const tacoSignalNames = msSignalNames.filter((s) => TACO_SIGNALS.has(s));
  const hasTacoIdentity = tacoSignalNames.some((s) => ['taco_presence', 'taco_focus', 'taqueria_identity'].includes(s));

  // Tier 2 — Subtype signals (primary differentiator)
  const tacoSubtypeSignals = tacoSignalNames.filter((s) => [
    'al_pastor_presence', 'birria_presence', 'carnitas_presence', 'carne_asada_presence',
    'seafood_taco_presence', 'guisado_presence', 'barbacoa_presence', 'pollo_taco_presence',
    'vegetarian_taco_presence'
  ].includes(s));

  // Tier 2b — Structural execution signals (tortilla, cooking, accompaniment)
  const tacoStructureSignals = tacoSignalNames.filter((s) => [
    'handmade_tortilla', 'corn_tortilla_presence', 'flour_tortilla_presence',
    'nixtamal_presence', 'heirloom_corn_presence', 'trompo_presence',
    'mesquite_or_charcoal_grill', 'braised_stewed_preparation', 'fried_taco_presence',
    'salsa_program'
  ].includes(s));

  let tacoMaturity: ProgramMaturity = "unknown";
  if (tacoSignalNames.includes("taco_specialist") || (tacoSubtypeSignals.length >= 2 && tacoStructureSignals.length > 0)) {
    // Specialist signal OR 2+ subtypes with supporting structure → dedicated
    tacoMaturity = "dedicated";
  } else if (hasTacoIdentity) {
    // Any taco identity signal → considered
    tacoMaturity = "considered";
  }

  const tacoProgram: ProgramEntry = {
    programClass: "food",
    maturity:   tacoMaturity,
    signals:    tacoSignalNames,
    confidence: tacoMaturity === "unknown" ? 0 : 0.7,
    evidence:   evidenceFor(TACO_SIGNALS),
  };

  // ── pizza_program ─────────────────────────────────────────────────────────

  const pizzaSignalNames = msSignalNames.filter((s) => PIZZA_SIGNALS.has(s));
  const hasPizzaIdentity = pizzaSignalNames.some((s) => ['pizza_presence', 'pizzeria_identity', 'slice_shop_identity'].includes(s));

  // Tier 2 — Style signals (primary differentiator: dough + bake system)
  const pizzaStyleSignals = pizzaSignalNames.filter((s) => [
    'neapolitan_style', 'new_york_style', 'detroit_style', 'chicago_style',
    'roman_style', 'sicilian_style', 'new_haven_style', 'california_style',
    'hybrid_pizza_style'
  ].includes(s));

  // Tier 2b — Structural execution signals (dough + oven + structure)
  const pizzaStructureSignals = pizzaSignalNames.filter((s) => [
    'long_fermentation', 'sourdough_presence', 'high_hydration_dough',
    'thin_crust', 'thick_crust', 'pan_dough',
    'wood_fired_oven', 'deck_oven', 'coal_fired_oven', 'pan_baked',
    'foldable_slice', 'crispy_edge_crust', 'soft_center', 'airy_structure'
  ].includes(s));

  let pizzaMaturity: ProgramMaturity = "unknown";
  if (pizzaSignalNames.includes("pizza_specialist") || (pizzaStyleSignals.length >= 1 && pizzaStructureSignals.length > 0)) {
    // Specialist signal OR clear style with supporting structure → dedicated
    pizzaMaturity = "dedicated";
  } else if (hasPizzaIdentity) {
    // Any pizza identity signal → considered
    pizzaMaturity = "considered";
  }

  const pizzaProgram: ProgramEntry = {
    programClass: "food",
    maturity:   pizzaMaturity,
    signals:    pizzaSignalNames,
    confidence: pizzaMaturity === "unknown" ? 0 : 0.7,
    evidence:   evidenceFor(PIZZA_SIGNALS),
  };

  // ── Phase 5: Coverage evidence supplements ────────────────────────────────
  // Coverage evidence can upgrade "unknown" programs to "incidental" or
  // "considered" when menu/merchant data is absent. It supplements but
  // does not override existing menu-derived signals.

  const cov = src.coverageEvidence;
  if (cov) {
    const covConf = 0.5; // baseline confidence for coverage-derived programs

    // Specialty food programs: coverage specialtySignals
    if (dumplingMaturity === "unknown" && cov.interpretations.food.specialtySignals.dumpling) {
      dumplingProgram.maturity = "incidental";
      dumplingProgram.signals.push("coverage:dumpling_mentioned");
      dumplingProgram.confidence = covConf;
    }
    if (sushiMaturity === "unknown" && cov.interpretations.food.specialtySignals.sushi) {
      sushiRawFishProgram.maturity = "incidental";
      sushiRawFishProgram.signals.push("coverage:sushi_mentioned");
      sushiRawFishProgram.confidence = covConf;
    }
    if (ramenMaturity === "unknown" && cov.interpretations.food.specialtySignals.ramen) {
      ramenNoodleProgram.maturity = "incidental";
      ramenNoodleProgram.signals.push("coverage:ramen_mentioned");
      ramenNoodleProgram.confidence = covConf;
    }
    if (tacoMaturity === "unknown" && cov.interpretations.food.specialtySignals.taco) {
      tacoProgram.maturity = "incidental";
      tacoProgram.signals.push("coverage:taco_mentioned");
      tacoProgram.confidence = covConf;
    }
    if (pizzaMaturity === "unknown" && cov.interpretations.food.specialtySignals.pizza) {
      pizzaProgram.maturity = "incidental";
      pizzaProgram.signals.push("coverage:pizza_mentioned");
      pizzaProgram.confidence = covConf;
    }

    // Beverage programs: coverage beverage signals
    const covBev = cov.interpretations.beverage;

    if (wineMaturity === "unknown" && covBev.wine.mentioned) {
      wineMaturity = "incidental";
      wineSignalNames.push("coverage:wine_mentioned");
      if (covBev.wine.naturalFocus) wineSignalNames.push("coverage:natural_wine_focus");
      if (covBev.wine.sommelierMentioned) wineSignalNames.push("coverage:sommelier_noted");
      // Sommelier/beverage director presence is a confidence boost
      const hasBevPerson = cov.facts.people.some(
        (p) => ["sommelier", "beverage_director", "wine_director"].includes(p.role) && p.stalenessBand !== "stale",
      );
      const hasProgramDepth =
        covBev.wine.naturalFocus ||
        Boolean(covBev.wine.listDepth) ||
        hasBevPerson ||
        cov.sourceCount >= 3;
      if (hasProgramDepth) {
        wineMaturity = "considered";
      }
    }

    if (beerProgram.maturity === "unknown" && covBev.beer.mentioned) {
      beerProgram.maturity = "incidental";
      beerProgram.signals.push("coverage:beer_mentioned");
      beerProgram.confidence = covConf;
      if (covBev.beer.craftSelection) {
        beerProgram.maturity = "considered";
        beerProgram.signals.push("coverage:craft_beer_selection");
      }
    }

    if (cocktailProgram.maturity === "unknown" && covBev.cocktail.mentioned) {
      cocktailProgram.maturity = covBev.cocktail.programExists ? "considered" : "incidental";
      cocktailProgram.signals.push("coverage:cocktail_mentioned");
      cocktailProgram.confidence = covConf;
    }

    if (nonAlcoholicProgram.maturity === "unknown" && covBev.nonAlcoholic.mentioned) {
      nonAlcoholicProgram.maturity = covBev.nonAlcoholic.zeroproof ? "considered" : "incidental";
      nonAlcoholicProgram.signals.push("coverage:non_alcoholic_mentioned");
      nonAlcoholicProgram.confidence = covConf;
    }

    if (coffeeTeaProgram.maturity === "unknown" && covBev.coffeeTea.mentioned) {
      coffeeTeaProgram.maturity = covBev.coffeeTea.specialtyProgram ? "considered" : "incidental";
      coffeeTeaProgram.signals.push("coverage:coffee_tea_mentioned");
      coffeeTeaProgram.confidence = covConf;
    }

    // Event capabilities: direct fact evidence
    if (privateDiningMaturity === "unknown" && cov.facts.eventCapabilities.privateDining.mentioned) {
      privateDiningProgram.maturity = "incidental";
      privateDiningProgram.signals.push("coverage:private_dining_mentioned");
      privateDiningProgram.confidence = covConf;
      privateDiningProgram.evidence.push(...cov.facts.eventCapabilities.privateDining.evidence.slice(0, 3));
    }

    if (groupDiningMaturity === "unknown" && cov.facts.eventCapabilities.groupDining.mentioned) {
      groupDiningProgram.maturity = "incidental";
      groupDiningProgram.signals.push("coverage:group_dining_mentioned");
      groupDiningProgram.confidence = covConf;
      groupDiningProgram.evidence.push(...cov.facts.eventCapabilities.groupDining.evidence.slice(0, 3));
    }

    if (cateringMaturity === "unknown" && cov.facts.eventCapabilities.catering.mentioned) {
      cateringProgram.maturity = "incidental";
      cateringProgram.signals.push("coverage:catering_mentioned");
      cateringProgram.confidence = covConf;
      cateringProgram.evidence.push(...cov.facts.eventCapabilities.catering.evidence.slice(0, 3));
    }

    // Service model: fill unknown from coverage
    if (serviceMaturity === "unknown" && cov.interpretations.service.serviceModel) {
      serviceSignals.push(`coverage:${cov.interpretations.service.serviceModel}`);
    }

    // Food program: coverage can supplement when menu data absent
    if (foodMaturity === "unknown" && cov.interpretations.food.cuisinePosture) {
      foodMaturity = "incidental";
      foodSignalNames.push(`coverage:cuisine_${cov.interpretations.food.cuisinePosture.replace(/\s+/g, "_")}`);
    }
  }

  // ── source coverage / timestamps ──────────────────────────────────────────

  return {
    foodProgram: {
      programClass: "food",
      maturity:   foodMaturity,
      signals:    foodSignalNames,
      confidence: foodConfidence,
      evidence:   foodEvidence,
    },
    wineProgram: {
      programClass: "beverage",
      maturity:   wineMaturity,
      signals:    wineSignalNames,
      confidence: round2(wineConf),
      evidence:   wineEvidence,
    },
    beerProgram:          beerProgram,
    cocktailProgram:      cocktailProgram,
    nonAlcoholicProgram: nonAlcoholicProgram,
    coffeeTeaProgram:    coffeeTeaProgram,
    serviceProgram: {
      programClass: "service",
      maturity:   serviceMaturity,
      signals:    serviceSignals,
      confidence: serviceConf,
      evidence:   serviceEvidence,
    },
    privateDiningProgram:  privateDiningProgram,
    groupDiningProgram:    groupDiningProgram,
    cateringProgram:        cateringProgram,
    dumplingProgram:        dumplingProgram,
    sushiRawFishProgram:  sushiRawFishProgram,
    ramenNoodleProgram:    ramenNoodleProgram,
    tacoProgram:            tacoProgram,
    pizzaProgram:           pizzaProgram,
    sourceCoverage: {
      menuIdentityPresent:          src.menuIdentity    !== null,
      menuStructurePresent:         src.menuStructure   !== null,
      identitySignalsPresent:       src.identitySignals !== null,
      merchantSurfaceScansPresent: src.surfaceScanHints !== null,
      coverageEvidencePresent:     src.coverageEvidence !== null,
      coverageSourceCount:         src.coverageEvidence?.sourceCount ?? 0,
    },
    sourceTimestamps: {
      menuIdentity:    src.menuIdentity?.computedAt.toISOString()    ?? null,
      menuStructure:   src.menuStructure?.computedAt.toISOString()   ?? null,
      identitySignals: src.identitySignals?.computedAt.toISOString() ?? null,
      coverageEvidence: src.coverageEvidence?.materializedAt.toISOString() ?? null,
    },
    readiness: {
      isReadyForOfferingAssembly: true,
      gateReasons: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Target loading
// ---------------------------------------------------------------------------

async function loadTargets(
  slugArg:   string | undefined,
  limit:     number,
  reprocess: boolean,
): Promise<AssembleTarget[]> {
  // Entities that have at least one source signal
  const candidates = await db.entities.findMany({
    where: {
      ...(slugArg ? { slug: slugArg } : {}),
      derived_signals: {
        some: {
          signalKey: {
            in: [
              SRC_MENU_IDENTITY.key,
              SRC_MENU_STRUCTURE.key,
              SRC_IDENTITY_SIGNALS.key,
            ],
          },
        },
      },
    },
    select: { id: true, name: true, slug: true, primaryVertical: true, placeType: true },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  if (candidates.length === 0) return [];

  // Check which already have offering_programs v1
  let existingIds = new Set<string>();
  if (!reprocess) {
    const existing = await db.derived_signals.findMany({
      where: {
        entityId:      { in: candidates.map((c) => c.id) },
        signalKey:     SIGNAL_KEY,
        signalVersion: SIGNAL_VERSION,
      },
      select: { entityId: true },
    });
    existingIds = new Set(existing.map((r) => r.entityId));
  }

  return candidates
    .filter((c) => reprocess || !existingIds.has(c.id))
    .map((c) => ({
      entityId: c.id,
      entityName: c.name,
      slug: c.slug,
      primaryVertical: c.primaryVertical ?? null,
      placeType: c.placeType ?? null,
    }));
}

// ---------------------------------------------------------------------------
// Batch source signal fetch
// ---------------------------------------------------------------------------

async function fetchSourceSignals(entityIds: string[]): Promise<Map<string, SourceSignals>> {
  const map = new Map<string, SourceSignals>();
  for (const id of entityIds) {
    map.set(id, { menuIdentity: null, menuStructure: null, identitySignals: null, surfaceScanHints: null, coverageEvidence: null });
  }

  if (entityIds.length === 0) return map;

  const rows = await db.derived_signals.findMany({
    where: {
      entityId: { in: entityIds },
      OR: [
        { signalKey: SRC_MENU_IDENTITY.key,    signalVersion: SRC_MENU_IDENTITY.version },
        { signalKey: SRC_MENU_STRUCTURE.key,   signalVersion: SRC_MENU_STRUCTURE.version },
        { signalKey: SRC_IDENTITY_SIGNALS.key, signalVersion: SRC_IDENTITY_SIGNALS.version },
      ],
    },
    orderBy: { computedAt: "desc" },
    select: { entityId: true, signalKey: true, signalValue: true, computedAt: true },
  });

  // Keep only the latest row per (entity_id, signal_key) — rows are ordered desc
  for (const row of rows) {
    const entry = map.get(row.entityId);
    if (!entry) continue;

    if (row.signalKey === SRC_MENU_IDENTITY.key && !entry.menuIdentity) {
      entry.menuIdentity = {
        payload:    row.signalValue as MenuIdentityPayload,
        computedAt: row.computedAt,
      };
    } else if (row.signalKey === SRC_MENU_STRUCTURE.key && !entry.menuStructure) {
      entry.menuStructure = {
        payload:    row.signalValue as MenuStructurePayload,
        computedAt: row.computedAt,
      };
    } else if (row.signalKey === SRC_IDENTITY_SIGNALS.key && !entry.identitySignals) {
      entry.identitySignals = {
        payload:    row.signalValue as IdentitySignalsPayload,
        computedAt: row.computedAt,
      };
    }
  }

  // Fetch merchant_surface_scans for private_dining_present + events surface existence
  const scanRows = await db.merchant_surface_scans.findMany({
    where: { entityId: { in: entityIds } },
    select: { entityId: true, privateDiningPresent: true },
    orderBy: { fetchedAt: "desc" },
    distinct: ["entityId"],
  });

  const eventsSurfaceRows = await db.merchant_surfaces.findMany({
    where: {
      entityId: { in: entityIds },
      surfaceType: "events",
    },
    select: { entityId: true },
    distinct: ["entityId"],
  });
  const eventsSurfaceSet = new Set(eventsSurfaceRows.map((r) => r.entityId));

  for (const scan of scanRows) {
    const entry = map.get(scan.entityId);
    if (!entry) continue;
    entry.surfaceScanHints = {
      privateDiningPresent: scan.privateDiningPresent ?? false,
      eventsSurfaceExists:  eventsSurfaceSet.has(scan.entityId),
    };
  }

  // Also mark entities that have events surfaces but no scan row
  for (const eid of eventsSurfaceSet) {
    const entry = map.get(eid);
    if (entry && !entry.surfaceScanHints) {
      entry.surfaceScanHints = {
        private_dining_present: false,
        events_surface_exists:  true,
      };
    }
  }

  // Phase 5: Materialize coverage evidence for each entity
  for (const id of entityIds) {
    const entry = map.get(id);
    if (!entry) continue;
    try {
      entry.coverageEvidence = await materializeCoverageEvidence(id);
    } catch {
      // Coverage failure should not block assembly
      entry.coverageEvidence = null;
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args      = process.argv.slice(2);
  const slugArg   = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  const limit     = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10) || 100;
  const dryRun    = args.includes("--dry-run");
  const reprocess = args.includes("--reprocess");
  const verbose   = args.includes("--verbose");

  console.log(`WO-006 — Offering Program Assembly${dryRun ? " [DRY RUN]" : ""}${reprocess ? " [REPROCESS]" : ""}\n`);

  const targets = await loadTargets(slugArg, limit, reprocess);

  if (targets.length === 0) {
    console.log("No eligible targets. All entities may already have offering_programs v1 signals.");
    console.log("Use --reprocess to reassemble existing signals.");
    await db.$disconnect();
    return;
  }

  console.log(`${targets.length} entities to assemble\n`);

  const signalMap = await fetchSourceSignals(targets.map((t) => t.entityId));

  // Header
  console.log(
    `${"Name".padEnd(36)} ${"food".padEnd(12)} ${"wine".padEnd(12)} ${"beer".padEnd(12)} ${"cocktail".padEnd(12)} ${"service".padEnd(12)} ${"pvt-din".padEnd(12)} ${"group".padEnd(12)} ${"cater".padEnd(12)} src`,
  );
  console.log("─".repeat(150));

  let written = 0;
  let errored = 0;

  for (const target of targets) {
    const src      = signalMap.get(target.entityId) ?? { menuIdentity: null, menuStructure: null, identitySignals: null, surfaceScanHints: null, coverageEvidence: null };
    const programs = assemblePrograms(src);
    const gateReasons = computeGateReasons(src, target);
    const isReady = gateReasons.length === 0;
    programs.readiness = {
      isReadyForOfferingAssembly: isReady,
      gateReasons,
    };

    const srcTag = [
      src.menuIdentity    ? "MI" : "  ",
      src.menuStructure   ? "MS" : "  ",
      src.identitySignals ? "IS" : "  ",
      src.surfaceScanHints ? "SC" : "  ",
      src.coverageEvidence ? `CE(${src.coverageEvidence.sourceCount})` : "  ",
    ].join(" ");
    const gateTag = isReady ? "READY" : `BLOCKED(${gateReasons.length})`;

    console.log(
      `  ${target.entityName.slice(0, 34).padEnd(34)} ` +
      `${programs.foodProgram.maturity.padEnd(12)} ` +
      `${programs.wineProgram.maturity.padEnd(12)} ` +
      `${programs.beerProgram.maturity.padEnd(12)} ` +
      `${programs.cocktailProgram.maturity.padEnd(12)} ` +
      `${programs.serviceProgram.maturity.padEnd(12)} ` +
      `${programs.privateDiningProgram.maturity.padEnd(12)} ` +
      `${programs.groupDiningProgram.maturity.padEnd(12)} ` +
      `${programs.cateringProgram.maturity.padEnd(12)} ` +
      `${srcTag} ${gateTag}`,
    );

    if (verbose) {
      if (programs.foodProgram.signals.length > 0)
        console.log(`    food signals: ${programs.foodProgram.signals.join(", ")}`);
      if (programs.wineProgram.signals.length > 0)
        console.log(`    wine signals: ${programs.wineProgram.signals.join(", ")}`);
      if (programs.cocktailProgram.signals.length > 0)
        console.log(`    cocktail:     ${programs.cocktailProgram.signals.join(", ")}`);
      if (programs.beerProgram.signals.length > 0)
        console.log(`    beer:         ${programs.beerProgram.signals.join(", ")}`);
      if (programs.serviceProgram.signals.length > 0)
        console.log(`    service:      ${programs.serviceProgram.signals.join(", ")}`);
      if (programs.foodProgram.evidence.length > 0)
        console.log(`    food evidence: "${programs.foodProgram.evidence[0]?.slice(0, 100)}"`);
      if (programs.wineProgram.evidence.length > 0)
        console.log(`    wine evidence: "${programs.wineProgram.evidence[0]?.slice(0, 100)}"`);
      if (!isReady) {
        console.log(`    gate reasons:  ${gateReasons.join(", ")}`);
      }
    }

    if (!dryRun) {
      try {
        await writeDerivedSignal(db, {
          entityId:      target.entityId,
          signalKey:     SIGNAL_KEY,
          signalVersion: SIGNAL_VERSION,
          signalValue:   programs,
        });
        written++;
      } catch (err) {
        console.error(`    !! DB write failed for ${target.entityName}:`, err);
        errored++;
      }
    } else {
      written++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n" + "─".repeat(150));
  console.log(`\nSummary:`);
  console.log(`  entities assembled : ${written}`);
  if (errored > 0) console.log(`  errors             : ${errored}`);
  if (dryRun)      console.log("\n  [DRY RUN] — no writes performed");

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
