#!/usr/bin/env node
/**
 * WO-004 / WO-008 — Menu Structure Signal Extraction
 *
 * Extracts structural menu signals from the unified menu_fetches.raw_text layer.
 * Interprets how a menu behaves without parsing individual dishes.
 *
 * WO-008 changes:
 *   • Evidence is now per-signal (not a global pool) — eliminates cross-program bleed
 *   • Added street-food signal vocabulary: taco_program, street_food_program, tortilla_program
 *
 * Signal vocabulary:
 *   shared_plate_structure, large_format_mains, vegetable_heavy, seafood_heavy,
 *   meat_forward, fermentation_focus, pizza_program, raw_bar, bakery_program,
 *   pastry_program, sandwich_program, rotisserie_program, extensive_wine_list,
 *   natural_wine_presence, cocktail_program, beer_program, aperitif_focus,
 *   tasting_menu_present, prix_fixe_present,
 *   taco_program, street_food_program, tortilla_program
 *
 * Output shape (v1, WO-008):
 *   signals: [{ signal: string, evidence: string[] }]
 *   confidence: number
 *
 * Input:  menu_fetches (latest successful row per entity, raw_text IS NOT NULL)
 *         + optional entities.description
 * Output: derived_signals (signal_key = 'menu_structure', version = 'v1')
 *
 * Usage:
 *   npx tsx scripts/interpret-menu-structure.ts [--limit=N] [--slug=<slug>] [--dry-run] [--reprocess] [--verbose]
 */

import Anthropic from "@anthropic-ai/sdk";
import { db }    from "../lib/db";
import { writeDerivedSignal } from "../lib/fields-v2/write-claim";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL          = "claude-sonnet-4-20250514";
const MAX_TOKENS     = 1536;  // increased for per-signal evidence objects
const RATE_LIMIT_MS  = 600;
const CONCURRENCY    = 3;
const MIN_TEXT_CHARS = 100;
const MAX_TEXT_CHARS = 15_000;

const SIGNAL_KEY     = "menu_structure";
const SIGNAL_VERSION = "v1";

// Full signal vocabulary — model is constrained to this list
const VALID_SIGNALS = new Set([
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
  "extensive_wine_list",
  "natural_wine_presence",
  "cocktail_program",
  "beer_program",
  "aperitif_focus",
  "tasting_menu_present",
  "prix_fixe_present",
  // WO-008: street-food vocabulary
  "taco_program",
  "street_food_program",
  "tortilla_program",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignalEntry {
  signal:   string;
  evidence: string[];
}

interface MenuStructureSignal {
  signals:    SignalEntry[];
  confidence: number;
}

interface StructureTarget {
  entityId:     string;
  entityName:   string;
  slug:          string;
  description:   string | null;
  menuText:     string;
  menuFormat:   string;
  menuFetchId: string;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const VALID_LIST = [...VALID_SIGNALS].join(", ");

const SYSTEM_PROMPT = `You are a restaurant menu analyst. Given menu text and optional descriptive context, identify which structural menu patterns are present.

Return ONLY a valid JSON object — no markdown, no commentary:
{
  "signals": [
    { "signal": "<signal_name>", "evidence": ["<short excerpt>", "<short excerpt>"] },
    { "signal": "<signal_name>", "evidence": ["<short excerpt>"] }
  ],
  "confidence": <0.0–1.0>
}

Valid signal values (use ONLY these exact strings):
${VALID_LIST}

Signal detection rules:

Food structure signals:
  • "shared_plate_structure" — explicit sharing language or menu sectioned into small plates
  • "large_format_mains" — language like "whole," "large format," "for two," "whole animal"
  • "vegetable_heavy" — multiple vegetable-focused sections or items
  • "seafood_heavy" — seafood dominates the menu
  • "meat_forward" — charcuterie, butcher cuts, or meat sections are dominant
  • "fermentation_focus" — multiple fermented items (kimchi, miso, koji, preserved, lacto, etc.)
  • "pizza_program" — pizza is a primary menu category
  • "raw_bar" — oysters, crudo, ceviche in a dedicated raw section
  • "bakery_program" — bread, pastry, or baked goods are a primary category
  • "pastry_program" — desserts or pastries are a prominent section
  • "sandwich_program" — sandwiches are a primary menu category
  • "rotisserie_program" — rotisserie cooking is featured

Street-food signals (fire on clear keyword presence):
  • "taco_program" — tacos explicitly appear as a primary item (taco, tacos, al pastor, birria taco)
  • "street_food_program" — street food format: taqueria, food truck, or street-style items (sopes, huaraches, elotes, esquites)
  • "tortilla_program" — tortillas as a menu anchor (tortilla, corn tortilla, flour tortilla)
  • These signals may fire on very short menus — the presence of the keyword is sufficient evidence

Beverage signals:
  • "extensive_wine_list" — many producers, regions, or a dedicated wine section spanning the menu
  • "natural_wine_presence" — explicit language: "natural," "biodynamic," "skin-contact," or named natural producers
  • "cocktail_program" — a dedicated cocktails section or cocktail menu
  • "beer_program" — a dedicated beer list or multiple beer styles
  • "aperitif_focus" — explicit aperitif section or aperitivo-style service

Format signals:
  • "tasting_menu_present" — explicit tasting menu or omakase structure
  • "prix_fixe_present" — explicit prix fixe pricing structure

General rules:
  • Only list signals with clear evidence in the provided text
  • Do NOT infer from cuisine type alone
  • Return "signals": [] if no signals have sufficient evidence

confidence — overall confidence in the detected signal set.
  • 0.85–1.0: strong, direct evidence for each detected signal
  • 0.65–0.84: clear evidence but some signals inferred from context
  • 0.40–0.64: weak evidence, signals are plausible but uncertain
  • 0.0 if signals list is empty

evidence — per signal, quote 1–3 short excerpts directly from the text.
  • Quote directly (do not paraphrase)
  • Keep each excerpt under 80 characters
  • Use [] for a signal's evidence only if the text is too short to quote`;

function buildUserMessage(target: StructureTarget): string {
  const textSnippet = target.menuText.slice(0, MAX_TEXT_CHARS);
  const truncated   = target.menuText.length > MAX_TEXT_CHARS
    ? `\n[...truncated at ${MAX_TEXT_CHARS} chars]`
    : "";

  let msg = `Place: ${target.entityName}\n`;
  if (target.description) {
    msg += `\nDescriptive context:\n${target.description.slice(0, 600)}\n`;
  }
  msg += `\nMenu text (${target.menuFormat} source, ${target.menuText.length} chars total):\n`;
  msg += `---\n${textSnippet}${truncated}\n---`;
  return msg;
}

// ---------------------------------------------------------------------------
// Claude call
// ---------------------------------------------------------------------------

async function callClaude(client: Anthropic, target: StructureTarget): Promise<MenuStructureSignal | null> {
  const msg = await client.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: buildUserMessage(target) }],
  });

  const raw     = msg.content.find((b) => b.type === "text")?.text ?? "";
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as { signals: unknown[]; confidence: number };

    // Sanitize: accept only known signals, ensure evidence is a string array
    const knownEntries: SignalEntry[] = (parsed.signals ?? [])
      .filter((entry): entry is { signal: string; evidence?: unknown[] } =>
        typeof entry === "object" && entry !== null && typeof (entry as Record<string, unknown>)["signal"] === "string"
      )
      .filter((entry) => VALID_SIGNALS.has(entry.signal))
      .map((entry) => ({
        signal:   entry.signal,
        evidence: Array.isArray(entry.evidence)
          ? entry.evidence.filter((e): e is string => typeof e === "string" && e.length > 0)
          : [],
      }));

    return {
      signals:    knownEntries,
      confidence: knownEntries.length === 0 ? 0 : (parsed.confidence ?? 0),
    };
  } catch {
    console.warn(`    [parse] JSON parse failed — raw: ${raw.slice(0, 200)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Target selection (same pattern as WO-003)
// ---------------------------------------------------------------------------

async function loadTargets(
  slugArg:   string | undefined,
  limit:     number,
  reprocess: boolean,
): Promise<StructureTarget[]> {
  type RawRow = {
    entityId:     string;
    entityName:   string;
    slug:          string;
    description:   string | null;
    menuText:     string;
    menuFormat:   string;
    menuFetchId: string;
    hasSignal:    boolean;
  };

  const rows = slugArg
    ? await db.$queryRaw<RawRow[]>`
        SELECT DISTINCT ON (mf.entity_id)
          e.id                          AS "entityId",
          e.name                        AS "entityName",
          e.slug,
          e.description,
          mf.raw_text                   AS "menuText",
          mf.menu_format                AS "menuFormat",
          mf.id                         AS "menuFetchId",
          EXISTS (
            SELECT 1 FROM derived_signals ds
            WHERE ds.entity_id    = e.id
              AND ds.signal_key   = ${SIGNAL_KEY}
              AND ds.signal_version = ${SIGNAL_VERSION}
          )                             AS "hasSignal"
        FROM menu_fetches mf
        JOIN entities e ON e.id = mf.entity_id
        WHERE mf.http_status < 400
          AND mf.raw_text IS NOT NULL
          AND length(mf.raw_text) >= ${MIN_TEXT_CHARS}
          AND e.slug = ${slugArg}
        ORDER BY mf.entity_id, mf.fetched_at DESC
        LIMIT ${limit}`
    : await db.$queryRaw<RawRow[]>`
        SELECT DISTINCT ON (mf.entity_id)
          e.id                          AS "entityId",
          e.name                        AS "entityName",
          e.slug,
          e.description,
          mf.raw_text                   AS "menuText",
          mf.menu_format                AS "menuFormat",
          mf.id                         AS "menuFetchId",
          EXISTS (
            SELECT 1 FROM derived_signals ds
            WHERE ds.entity_id    = e.id
              AND ds.signal_key   = ${SIGNAL_KEY}
              AND ds.signal_version = ${SIGNAL_VERSION}
          )                             AS "hasSignal"
        FROM menu_fetches mf
        JOIN entities e ON e.id = mf.entity_id
        WHERE mf.http_status < 400
          AND mf.raw_text IS NOT NULL
          AND length(mf.raw_text) >= ${MIN_TEXT_CHARS}
        ORDER BY mf.entity_id, mf.fetched_at DESC
        LIMIT ${limit}`;

  return rows
    .filter((r) => reprocess || !r.hasSignal)
    .map((r) => ({
      entityId:     r.entityId,
      entityName:   r.entityName,
      slug:          r.slug,
      description:   r.description,
      menuText:     r.menuText,
      menuFormat:   r.menuFormat,
      menuFetchId: r.menuFetchId,
    }));
}

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------

async function runPool<T>(
  items:       T[],
  worker:      (item: T, idx: number) => Promise<void>,
  concurrency: number,
): Promise<void> {
  let i = 0;
  async function next(): Promise<void> {
    const idx = i++;
    if (idx >= items.length) return;
    await worker(items[idx], idx);
    return next();
  }
  await Promise.all(Array.from({ length: concurrency }, next));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args      = process.argv.slice(2);
  const slugArg   = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  const limit     = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10) || 50;
  const dryRun    = args.includes("--dry-run");
  const reprocess = args.includes("--reprocess");
  const verbose   = args.includes("--verbose");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌  ANTHROPIC_API_KEY not set.");
    process.exit(1);
  }

  const claude = new Anthropic({ apiKey });

  console.log(`WO-004 — Menu Structure Signal Extraction${dryRun ? " [DRY RUN]" : ""}${reprocess ? " [REPROCESS]" : ""}\n`);

  const targets = await loadTargets(slugArg, limit, reprocess);

  if (targets.length === 0) {
    console.log("No eligible targets. All entities may already have menu_structure signals.");
    console.log("Use --reprocess to re-interpret.");
    return;
  }

  console.log(`${targets.length} entities to interpret\n`);

  // Track signal frequencies across the run
  const signalCounts = new Map<string, number>();
  let totalWritten = 0;
  let totalErrors  = 0;
  let totalEmpty   = 0;

  await runPool(
    targets,
    async (target, idx) => {
      let result: MenuStructureSignal | null = null;
      let error: string | null = null;

      try {
        result = await callClaude(claude, target);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      const entries  = result?.signals ?? [];
      const conf     = result ? Math.round(result.confidence * 100) : 0;
      const isEmpty  = entries.length === 0;

      // Log one line per entity
      const signalStr = isEmpty ? "—" : entries.map((e) => e.signal).join(", ");
      console.log(
        `  [${String(idx + 1).padStart(2)}] ${target.entityName.slice(0, 34).padEnd(34)} ` +
        `${target.menuFormat.padEnd(4)} ${String(target.menuText.length).padStart(6)}c  ` +
        `conf=${String(conf).padStart(3)}%  ${signalStr.slice(0, 60)}`,
      );

      if (error) {
        console.log(`      !! error: ${error}`);
      }

      if (verbose && result && entries.length > 0) {
        entries.forEach((entry) => {
          const evStr = entry.evidence.map((e) => `"${e.slice(0, 80)}"`).join(", ");
          console.log(`      [${entry.signal}] ${evStr || "(no evidence)"}`);
        });
      }

      // Accumulate frequency stats
      entries.forEach(({ signal }) => signalCounts.set(signal, (signalCounts.get(signal) ?? 0) + 1));
      if (isEmpty) totalEmpty++;

      // Write
      if (result && !dryRun) {
        try {
          await writeDerivedSignal(db, {
            entityId:      target.entityId,
            signalKey:     SIGNAL_KEY,
            signalVersion: SIGNAL_VERSION,
            signalValue:   {
              signals:        result.signals,
              confidence:     result.confidence,
              source:         "menu_fetches",
              menuFetchId:  target.menuFetchId,
              menuFormat:    target.menuFormat,
              menuChars:     target.menuText.length,
              interpretedAt: new Date().toISOString(),
            },
            inputClaimIds: [target.menuFetchId],
          });
          totalWritten++;
        } catch (err) {
          console.error(`    !! DB write failed for ${target.entityName}:`, err);
          totalErrors++;
        }
      }

      // Rate limit
      if (idx < targets.length - 1) {
        await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
      }
    },
    CONCURRENCY,
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const withSignals = targets.length - totalEmpty;

  console.log(`\n${"═".repeat(68)}`);
  console.log(`WO-004/008 SUMMARY  (${targets.length} interpreted / ${withSignals} with signals / ${totalEmpty} empty)`);
  console.log(`${"═".repeat(68)}`);

  if (signalCounts.size > 0) {
    console.log(`\nSignal frequency (across ${targets.length} entities):`);
    const sorted = [...signalCounts.entries()].sort((a, b) => b[1] - a[1]);
    sorted.forEach(([sig, count]) =>
      console.log(`  ${sig.padEnd(32)} ${count}/${targets.length}`)
    );
  }

  if (totalErrors) console.log(`\nDB errors: ${totalErrors}`);

  if (dryRun) console.log(`\n[dry-run] No rows written.`);
  else        console.log(`\n${totalWritten} rows written to derived_signals (signal_key='menu_structure').`);
}

main().catch((e) => { console.error(e); process.exit(1); });
