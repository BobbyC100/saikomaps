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

import { db }              from "../lib/db";
import { writeDerivedSignal } from "../lib/fields-v2/write-claim";

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

interface ProgramEntry {
  maturity:   ProgramMaturity;
  signals:    string[];
  confidence: number;
  evidence:   string[];
}

interface OfferingPrograms {
  food_program:            ProgramEntry;
  wine_program:            ProgramEntry;
  beer_program:            ProgramEntry;
  cocktail_program:        ProgramEntry;
  non_alcoholic_program:   ProgramEntry;
  coffee_tea_program:      ProgramEntry;
  service_program:         ProgramEntry;
  private_dining_program:  ProgramEntry;
  group_dining_program:    ProgramEntry;
  catering_program:        ProgramEntry;
  source_coverage: {
    menu_identity_present:         boolean;
    menu_structure_present:        boolean;
    identity_signals_present:      boolean;
    merchant_surface_scans_present: boolean;
  };
  source_timestamps: {
    menu_identity:    string | null;
    menu_structure:   string | null;
    identity_signals: string | null;
  };
}

interface MenuIdentityPayload {
  cuisine_posture:               string | null;
  cuisine_posture_confidence:    number;
  cuisine_posture_evidence:      string | null;
  service_model:                 string | null;
  service_model_confidence:      number;
  service_model_evidence:        string | null;
  wine_program_intent:           string | null;
  wine_program_intent_confidence: number;
  wine_program_intent_evidence:  string | null;
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
  cuisine_posture:       string | null;
  service_model:         string | null;
  wine_program_intent:   string | null;
  extraction_confidence: number;
}

interface MerchantSurfaceScanHints {
  private_dining_present: boolean;
  events_surface_exists:  boolean;
}

interface SourceSignals {
  menuIdentity:    { payload: MenuIdentityPayload; computedAt: Date } | null;
  menuStructure:   { payload: MenuStructurePayload; computedAt: Date } | null;
  identitySignals: { payload: IdentitySignalsPayload; computedAt: Date } | null;
  surfaceScanHints: MerchantSurfaceScanHints | null;
}

interface AssembleTarget {
  entity_id:   string;
  entity_name: string;
  slug:        string;
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

const WINE_SIGNALS = new Set([
  "extensive_wine_list",
  "natural_wine_presence",
  "aperitif_focus",  // WO-008: moved from cocktail → wine
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
    mi?.cuisine_posture_evidence ?? null,
    ...evidenceFor(FOOD_SIGNALS),
  ].filter((e): e is string => typeof e === "string" && e.length > 0);

  const foodConfPool: number[] = [];
  if (mi && typeof mi.cuisine_posture_confidence === "number") foodConfPool.push(mi.cuisine_posture_confidence);
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
  const wineIntent      = mi?.wine_program_intent ?? null;
  const wineEvidence    = [
    mi?.wine_program_intent_evidence ?? null,
    ...evidenceFor(WINE_SIGNALS),
  ].filter((e): e is string => typeof e === "string" && e.length > 0);

  const wineConf: number =
    typeof mi?.wine_program_intent_confidence === "number"
      ? mi.wine_program_intent_confidence
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
        maturity:   "considered",
        signals:    ["beer_program"],
        confidence: ms ? round2(ms.confidence) : 0,
        evidence:   evidenceFor(beerSignalSet),
      }
    : { maturity: "unknown", signals: [], confidence: 0, evidence: [] };

  // ── cocktail_program ──────────────────────────────────────────────────────
  // WO-008: aperitif_focus removed — cocktail_program only

  const cocktailSignalSet    = new Set(["cocktail_program"]);
  const cocktailSignalNames  = msSignalNames.filter((s) => cocktailSignalSet.has(s));
  const hasCocktail          = cocktailSignalNames.length > 0;
  const cocktailProgram: ProgramEntry = hasCocktail
    ? {
        maturity:   "considered",
        signals:    cocktailSignalNames,
        confidence: ms ? round2(ms.confidence) : 0,
        evidence:   evidenceFor(cocktailSignalSet),
      }
    : { maturity: "unknown", signals: [], confidence: 0, evidence: [] };

  // ── non_alcoholic_program (no inference in v1) ────────────────────────────

  const nonAlcoholicProgram: ProgramEntry = {
    maturity: "unknown", signals: [], confidence: 0, evidence: [],
  };

  // ── coffee_tea_program (no inference in v1) ───────────────────────────────

  const coffeeTeaProgram: ProgramEntry = {
    maturity: "unknown", signals: [], confidence: 0, evidence: [],
  };

  // ── service_program ───────────────────────────────────────────────────────

  const serviceModel    = mi?.service_model ?? null;
  const serviceEvidence = [mi?.service_model_evidence ?? null]
    .filter((e): e is string => typeof e === "string" && e.length > 0);
  const serviceConf     =
    typeof mi?.service_model_confidence === "number" ? round2(mi.service_model_confidence) : 0;
  const serviceSignals  = serviceModel ? [serviceModel] : [];
  const serviceMaturity: ProgramMaturity = serviceModel ? "considered" : "unknown";

  // ── private_dining_program ────────────────────────────────────────────────

  const pdSignalNames = msSignalNames.filter((s) => PRIVATE_DINING_SIGNALS.has(s));
  const scanHints     = src.surfaceScanHints;
  const hasPrivateDiningPresent = scanHints?.private_dining_present ?? false;
  const hasEventsSurface        = scanHints?.events_surface_exists ?? false;

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
    maturity:   cateringMaturity,
    signals:    catSignalNames,
    confidence: cateringMaturity === "unknown" ? 0 : hasEventsSurface ? 0.8 : 0.5,
    evidence:   evidenceFor(CATERING_SIGNALS),
  };

  // ── source coverage / timestamps ──────────────────────────────────────────

  return {
    food_program: {
      maturity:   foodMaturity,
      signals:    foodSignalNames,
      confidence: foodConfidence,
      evidence:   foodEvidence,
    },
    wine_program: {
      maturity:   wineMaturity,
      signals:    wineSignalNames,
      confidence: round2(wineConf),
      evidence:   wineEvidence,
    },
    beer_program:          beerProgram,
    cocktail_program:      cocktailProgram,
    non_alcoholic_program: nonAlcoholicProgram,
    coffee_tea_program:    coffeeTeaProgram,
    service_program: {
      maturity:   serviceMaturity,
      signals:    serviceSignals,
      confidence: serviceConf,
      evidence:   serviceEvidence,
    },
    private_dining_program:  privateDiningProgram,
    group_dining_program:    groupDiningProgram,
    catering_program:        cateringProgram,
    source_coverage: {
      menu_identity_present:          src.menuIdentity    !== null,
      menu_structure_present:         src.menuStructure   !== null,
      identity_signals_present:       src.identitySignals !== null,
      merchant_surface_scans_present: src.surfaceScanHints !== null,
    },
    source_timestamps: {
      menu_identity:    src.menuIdentity?.computedAt.toISOString()    ?? null,
      menu_structure:   src.menuStructure?.computedAt.toISOString()   ?? null,
      identity_signals: src.identitySignals?.computedAt.toISOString() ?? null,
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
          signal_key: {
            in: [
              SRC_MENU_IDENTITY.key,
              SRC_MENU_STRUCTURE.key,
              SRC_IDENTITY_SIGNALS.key,
            ],
          },
        },
      },
    },
    select: { id: true, name: true, slug: true },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  if (candidates.length === 0) return [];

  // Check which already have offering_programs v1
  let existingIds = new Set<string>();
  if (!reprocess) {
    const existing = await db.derived_signals.findMany({
      where: {
        entity_id:      { in: candidates.map((c) => c.id) },
        signal_key:     SIGNAL_KEY,
        signal_version: SIGNAL_VERSION,
      },
      select: { entity_id: true },
    });
    existingIds = new Set(existing.map((r) => r.entity_id));
  }

  return candidates
    .filter((c) => reprocess || !existingIds.has(c.id))
    .map((c) => ({ entity_id: c.id, entity_name: c.name, slug: c.slug }));
}

// ---------------------------------------------------------------------------
// Batch source signal fetch
// ---------------------------------------------------------------------------

async function fetchSourceSignals(entityIds: string[]): Promise<Map<string, SourceSignals>> {
  const map = new Map<string, SourceSignals>();
  for (const id of entityIds) {
    map.set(id, { menuIdentity: null, menuStructure: null, identitySignals: null, surfaceScanHints: null });
  }

  if (entityIds.length === 0) return map;

  const rows = await db.derived_signals.findMany({
    where: {
      entity_id: { in: entityIds },
      OR: [
        { signal_key: SRC_MENU_IDENTITY.key,    signal_version: SRC_MENU_IDENTITY.version },
        { signal_key: SRC_MENU_STRUCTURE.key,   signal_version: SRC_MENU_STRUCTURE.version },
        { signal_key: SRC_IDENTITY_SIGNALS.key, signal_version: SRC_IDENTITY_SIGNALS.version },
      ],
    },
    orderBy: { computed_at: "desc" },
    select: { entity_id: true, signal_key: true, signal_value: true, computed_at: true },
  });

  // Keep only the latest row per (entity_id, signal_key) — rows are ordered desc
  for (const row of rows) {
    const entry = map.get(row.entity_id);
    if (!entry) continue;

    if (row.signal_key === SRC_MENU_IDENTITY.key && !entry.menuIdentity) {
      entry.menuIdentity = {
        payload:    row.signal_value as MenuIdentityPayload,
        computedAt: row.computed_at,
      };
    } else if (row.signal_key === SRC_MENU_STRUCTURE.key && !entry.menuStructure) {
      entry.menuStructure = {
        payload:    row.signal_value as MenuStructurePayload,
        computedAt: row.computed_at,
      };
    } else if (row.signal_key === SRC_IDENTITY_SIGNALS.key && !entry.identitySignals) {
      entry.identitySignals = {
        payload:    row.signal_value as IdentitySignalsPayload,
        computedAt: row.computed_at,
      };
    }
  }

  // Fetch merchant_surface_scans for private_dining_present + events surface existence
  const scanRows = await db.merchant_surface_scans.findMany({
    where: { entity_id: { in: entityIds } },
    select: { entity_id: true, private_dining_present: true },
    orderBy: { fetched_at: "desc" },
    distinct: ["entity_id"],
  });

  const eventsSurfaceRows = await db.merchant_surfaces.findMany({
    where: {
      entity_id: { in: entityIds },
      surface_type: "events",
    },
    select: { entity_id: true },
    distinct: ["entity_id"],
  });
  const eventsSurfaceSet = new Set(eventsSurfaceRows.map((r) => r.entity_id));

  for (const scan of scanRows) {
    const entry = map.get(scan.entity_id);
    if (!entry) continue;
    entry.surfaceScanHints = {
      private_dining_present: scan.private_dining_present ?? false,
      events_surface_exists:  eventsSurfaceSet.has(scan.entity_id),
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

  const signalMap = await fetchSourceSignals(targets.map((t) => t.entity_id));

  // Header
  console.log(
    `${"Name".padEnd(36)} ${"food".padEnd(12)} ${"wine".padEnd(12)} ${"beer".padEnd(12)} ${"cocktail".padEnd(12)} ${"service".padEnd(12)} ${"pvt-din".padEnd(12)} ${"group".padEnd(12)} ${"cater".padEnd(12)} src`,
  );
  console.log("─".repeat(150));

  let written = 0;
  let errored = 0;

  for (const target of targets) {
    const src      = signalMap.get(target.entity_id) ?? { menuIdentity: null, menuStructure: null, identitySignals: null, surfaceScanHints: null };
    const programs = assemblePrograms(src);

    const srcTag = [
      src.menuIdentity    ? "MI" : "  ",
      src.menuStructure   ? "MS" : "  ",
      src.identitySignals ? "IS" : "  ",
      src.surfaceScanHints ? "SC" : "  ",
    ].join(" ");

    console.log(
      `  ${target.entity_name.slice(0, 34).padEnd(34)} ` +
      `${programs.food_program.maturity.padEnd(12)} ` +
      `${programs.wine_program.maturity.padEnd(12)} ` +
      `${programs.beer_program.maturity.padEnd(12)} ` +
      `${programs.cocktail_program.maturity.padEnd(12)} ` +
      `${programs.service_program.maturity.padEnd(12)} ` +
      `${programs.private_dining_program.maturity.padEnd(12)} ` +
      `${programs.group_dining_program.maturity.padEnd(12)} ` +
      `${programs.catering_program.maturity.padEnd(12)} ` +
      `${srcTag}`,
    );

    if (verbose) {
      if (programs.food_program.signals.length > 0)
        console.log(`    food signals: ${programs.food_program.signals.join(", ")}`);
      if (programs.wine_program.signals.length > 0)
        console.log(`    wine signals: ${programs.wine_program.signals.join(", ")}`);
      if (programs.cocktail_program.signals.length > 0)
        console.log(`    cocktail:     ${programs.cocktail_program.signals.join(", ")}`);
      if (programs.beer_program.signals.length > 0)
        console.log(`    beer:         ${programs.beer_program.signals.join(", ")}`);
      if (programs.service_program.signals.length > 0)
        console.log(`    service:      ${programs.service_program.signals.join(", ")}`);
      if (programs.food_program.evidence.length > 0)
        console.log(`    food evidence: "${programs.food_program.evidence[0]?.slice(0, 100)}"`);
      if (programs.wine_program.evidence.length > 0)
        console.log(`    wine evidence: "${programs.wine_program.evidence[0]?.slice(0, 100)}"`);
    }

    if (!dryRun) {
      try {
        await writeDerivedSignal(db, {
          entityId:      target.entity_id,
          signalKey:     SIGNAL_KEY,
          signalVersion: SIGNAL_VERSION,
          signalValue:   programs,
        });
        written++;
      } catch (err) {
        console.error(`    !! DB write failed for ${target.entity_name}:`, err);
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
