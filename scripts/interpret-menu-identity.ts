#!/usr/bin/env node
/**
 * WO-003 — Menu Identity Enrichment Pass
 *
 * Interprets acquired menu text into a small set of high-value identity signals.
 * Works on the unified menu_fetches.raw_text layer regardless of source format
 * (HTML or PDF). Produces entity-level interpretation — not structured dishes.
 *
 * Target signals:
 *   • cuisine_posture        — overall menu identity direction
 *   • service_model          — how the menu suggests the place is used
 *   • wine_program_intent    — beverage program seriousness/direction
 *
 * Each signal includes: value, confidence (0–1), evidence snippet.
 *
 * Input:  menu_fetches (latest successful row per entity, raw_text IS NOT NULL)
 *         + optional entities.description for supporting context
 * Output: derived_signals (signal_key = 'menu_identity', version = 'v1')
 *
 * Usage:
 *   npx tsx scripts/interpret-menu-identity.ts [--limit=N] [--slug=<slug>] [--dry-run] [--reprocess]
 *
 * Notes:
 *   • Idempotent by default — skips entities that already have a menu_identity signal
 *   • --reprocess forces re-interpretation even if a signal already exists
 *   • Menu text is capped at 15,000 chars before sending to the model
 *   • Entities with < 100 chars of menu text are skipped (insufficient evidence)
 */

import Anthropic from "@anthropic-ai/sdk";
import { db }    from "../lib/db";
import { writeDerivedSignal } from "../lib/fields-v2/write-claim";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL          = "claude-sonnet-4-20250514";
const MAX_TOKENS     = 1024;
const RATE_LIMIT_MS  = 600;          // ms between API calls
const CONCURRENCY    = 3;
const MIN_TEXT_CHARS = 100;          // skip if menu text shorter than this
const MAX_TEXT_CHARS = 15_000;       // cap to keep prompt within token budget

const SIGNAL_KEY     = "menu_identity";
const SIGNAL_VERSION = "v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuIdentitySignal {
  cuisine_posture:                  string | null;
  cuisine_posture_confidence:       number;
  cuisine_posture_evidence:         string | null;

  service_model:                    string | null;
  service_model_confidence:         number;
  service_model_evidence:           string | null;

  wine_program_intent:              string | null;
  wine_program_intent_confidence:   number;
  wine_program_intent_evidence:     string | null;
}

interface InterpretTarget {
  entity_id:     string;
  entity_name:   string;
  slug:          string;
  description:   string | null;
  menu_text:     string;
  menu_format:   string;
  menu_fetch_id: string;
}

interface InterpretOutcome {
  target:   InterpretTarget;
  signal:   MenuIdentitySignal | null;
  skipped:  boolean;
  reason:   string | null;
  error:    string | null;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a restaurant identity analyst. Given the text content of a restaurant's menu and optional descriptive context, extract three identity signals.

Return ONLY a valid JSON object matching this exact structure — no markdown, no commentary:
{
  "cuisine_posture": "<string or null>",
  "cuisine_posture_confidence": <0.0–1.0>,
  "cuisine_posture_evidence": "<direct excerpt or null>",

  "service_model": "<string or null>",
  "service_model_confidence": <0.0–1.0>,
  "service_model_evidence": "<direct excerpt or null>",

  "wine_program_intent": "<string or null>",
  "wine_program_intent_confidence": <0.0–1.0>,
  "wine_program_intent_evidence": "<direct excerpt or null>"
}

Field guidance:

cuisine_posture — overall menu identity and directional cuisine posture.
  Examples: middle_eastern, produce_driven_california, bakery_cafe, seafood_focused,
            italian_american, wine_bar_food_forward, filipino, thai, french_bistro,
            japanese, counter_service_mexican, korean_bbq, new_american, mediterranean
  Do not overfit to highly specific subregional labels unless evidence is strong.
  Return null if insufficient evidence.

service_model — how the menu suggests the place is used.
  Examples: counter_service, shared_plates, full_service, bar_forward,
            large_format_dining, bakery_cafe, tasting_menu, fast_casual, diner
  Infer from menu structure (sections, format, portion language) not just dish types.
  Return null if insufficient evidence.

wine_program_intent — seriousness or directional identity of the wine/beverage program.
  Examples: none, light, integrated, serious, eclectic, classical, natural_leaning,
            mediterranean_focused, california_leaning, cocktail_forward
  Only fill this when menu text explicitly supports it (wine list, beverage section, curated bottles).
  Return null if evidence is insufficient or the concept is a taco shop, coffee counter, etc.

Confidence rules:
  - 0.85–1.0: clear, direct evidence in the text
  - 0.65–0.84: reasonable inference from multiple signals
  - 0.40–0.64: weak signal, plausible but uncertain
  - below 0.40: return null for the value itself

Evidence rules:
  - Quote directly from the provided text — do not paraphrase
  - Keep under 120 characters
  - Return null if the field value is null`;

function buildUserMessage(target: InterpretTarget): string {
  const textSnippet = target.menu_text.slice(0, MAX_TEXT_CHARS);
  const truncated   = target.menu_text.length > MAX_TEXT_CHARS
    ? `\n[...text truncated at ${MAX_TEXT_CHARS} chars]`
    : "";

  let msg = `Place: ${target.entity_name}\n`;
  if (target.description) {
    msg += `\nDescriptive context:\n${target.description.slice(0, 800)}\n`;
  }
  msg += `\nMenu text (${target.menu_format} source, ${target.menu_text.length} chars total):\n`;
  msg += `---\n${textSnippet}${truncated}\n---`;
  return msg;
}

// ---------------------------------------------------------------------------
// Claude call
// ---------------------------------------------------------------------------

async function callClaude(client: Anthropic, target: InterpretTarget): Promise<MenuIdentitySignal | null> {
  const msg = await client.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: buildUserMessage(target) }],
  });

  const raw = msg.content.find((b) => b.type === "text")?.text ?? "";

  // Strip accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as MenuIdentitySignal;
    return parsed;
  } catch {
    console.warn(`    [parse] JSON parse failed — raw: ${raw.slice(0, 200)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Target selection
// ---------------------------------------------------------------------------

async function loadTargets(slugArg: string | undefined, limit: number, reprocess: boolean): Promise<InterpretTarget[]> {
  type RawRow = {
    entity_id:     string;
    entity_name:   string;
    slug:          string;
    description:   string | null;
    menu_text:     string;
    menu_format:   string;
    menu_fetch_id: string;
    has_signal:    boolean;
  };

  // Build the "already has signal?" exclusion inline
  const rows = slugArg
    ? await db.$queryRaw<RawRow[]>`
        SELECT DISTINCT ON (mf.entity_id)
          e.id                          AS entity_id,
          e.name                        AS entity_name,
          e.slug,
          e.description,
          mf.raw_text                   AS menu_text,
          mf.menu_format,
          mf.id                         AS menu_fetch_id,
          EXISTS (
            SELECT 1 FROM derived_signals ds
            WHERE ds.entity_id  = e.id
              AND ds.signal_key = ${SIGNAL_KEY}
              AND ds.signal_version = ${SIGNAL_VERSION}
          )                             AS has_signal
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
          e.id                          AS entity_id,
          e.name                        AS entity_name,
          e.slug,
          e.description,
          mf.raw_text                   AS menu_text,
          mf.menu_format,
          mf.id                         AS menu_fetch_id,
          EXISTS (
            SELECT 1 FROM derived_signals ds
            WHERE ds.entity_id  = e.id
              AND ds.signal_key = ${SIGNAL_KEY}
              AND ds.signal_version = ${SIGNAL_VERSION}
          )                             AS has_signal
        FROM menu_fetches mf
        JOIN entities e ON e.id = mf.entity_id
        WHERE mf.http_status < 400
          AND mf.raw_text IS NOT NULL
          AND length(mf.raw_text) >= ${MIN_TEXT_CHARS}
        ORDER BY mf.entity_id, mf.fetched_at DESC
        LIMIT ${limit}`;

  return rows
    .filter((r) => reprocess || !r.has_signal)
    .map((r) => ({
      entity_id:     r.entity_id,
      entity_name:   r.entity_name,
      slug:          r.slug,
      description:   r.description,
      menu_text:     r.menu_text,
      menu_format:   r.menu_format,
      menu_fetch_id: r.menu_fetch_id,
    }));
}

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------

async function runPool<T>(
  items: T[],
  worker: (item: T, idx: number) => Promise<void>,
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
    console.error("❌  ANTHROPIC_API_KEY not set. Load it from .env.local first.");
    process.exit(1);
  }

  const claude = new Anthropic({ apiKey });

  console.log(`WO-003 — Menu Identity Enrichment Pass${dryRun ? " [DRY RUN]" : ""}${reprocess ? " [REPROCESS]" : ""}\n`);

  const targets = await loadTargets(slugArg, limit, reprocess);

  if (targets.length === 0) {
    console.log("No eligible targets. All entities may already have menu_identity signals.");
    console.log("Use --reprocess to re-interpret existing signals.");
    return;
  }

  console.log(`${targets.length} entities to interpret\n`);
  console.log(`${"Name".padEnd(36)} ${"Format".padEnd(5)} ${"Chars".padStart(6)}  ${"cuisine_posture".padEnd(28)} ${"service_model".padEnd(20)} ${"wine_intent".padEnd(18)} ${"conf".padStart(4)}`);
  console.log("─".repeat(130));

  const outcomes: InterpretOutcome[] = new Array(targets.length);

  await runPool(
    targets,
    async (target, idx) => {
      const outcome: InterpretOutcome = {
        target,
        signal:  null,
        skipped: false,
        reason:  null,
        error:   null,
      };
      outcomes[idx] = outcome;

      let signal: MenuIdentitySignal | null = null;

      try {
        signal = await callClaude(claude, target);
        outcome.signal = signal;
      } catch (err) {
        outcome.error = err instanceof Error ? err.message : String(err);
      }

      // Log
      const textLen  = target.menu_text.length;
      const cp       = signal?.cuisine_posture           ?? "—";
      const sm       = signal?.service_model             ?? "—";
      const wi       = signal?.wine_program_intent       ?? "—";
      const conf     = signal ? Math.round(
        ((signal.cuisine_posture_confidence ?? 0) +
         (signal.service_model_confidence   ?? 0) +
         (signal.wine_program_intent_confidence ?? 0)) / 3 * 100
      ) : 0;

      console.log(
        `  ${target.entity_name.slice(0, 34).padEnd(34)} ` +
        `${target.menu_format.padEnd(5)} ${String(textLen).padStart(6)}c  ` +
        `${cp.slice(0, 26).padEnd(28)} ${sm.slice(0, 18).padEnd(20)} ${wi.slice(0, 16).padEnd(18)} ` +
        `${String(conf).padStart(3)}%`,
      );

      if (outcome.error) {
        console.log(`    !! error: ${outcome.error}`);
      }

      if (verbose && signal) {
        if (signal.cuisine_posture_evidence)     console.log(`    cuisine evidence: "${signal.cuisine_posture_evidence.slice(0, 100)}"`);
        if (signal.service_model_evidence)       console.log(`    service evidence: "${signal.service_model_evidence.slice(0, 100)}"`);
        if (signal.wine_program_intent_evidence) console.log(`    wine evidence:    "${signal.wine_program_intent_evidence.slice(0, 100)}"`);
      }

      // Write
      if (signal && !dryRun) {
        try {
          await writeDerivedSignal(db, {
            entityId:      target.entity_id,
            signalKey:     SIGNAL_KEY,
            signalVersion: SIGNAL_VERSION,
            signalValue:   {
              ...signal,
              source:        "menu_fetches",
              menu_fetch_id: target.menu_fetch_id,
              menu_format:   target.menu_format,
              menu_chars:    textLen,
              interpreted_at: new Date().toISOString(),
            },
            inputClaimIds: [target.menu_fetch_id],
          });
        } catch (err) {
          console.error(`    !! DB write failed for ${target.entity_name}:`, err);
          outcome.error = String(err);
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

  const withSignal      = outcomes.filter((o) => o?.signal !== null);
  const withCuisine     = withSignal.filter((o) => o.signal!.cuisine_posture !== null);
  const withService     = withSignal.filter((o) => o.signal!.service_model !== null);
  const withWine        = withSignal.filter((o) => o.signal!.wine_program_intent !== null);
  const errored         = outcomes.filter((o) => o?.error);

  const avgCuisineConf  = withCuisine.length
    ? withCuisine.reduce((s, o) => s + (o.signal!.cuisine_posture_confidence ?? 0), 0) / withCuisine.length
    : 0;
  const avgServiceConf  = withService.length
    ? withService.reduce((s, o) => s + (o.signal!.service_model_confidence ?? 0), 0) / withService.length
    : 0;
  const avgWineConf     = withWine.length
    ? withWine.reduce((s, o) => s + (o.signal!.wine_program_intent_confidence ?? 0), 0) / withWine.length
    : 0;

  const htmlOutcomes = withSignal.filter((o) => o.target.menu_format === "html");
  const pdfOutcomes  = withSignal.filter((o) => o.target.menu_format === "pdf");
  const htmlAvgChars = htmlOutcomes.length
    ? Math.round(htmlOutcomes.reduce((s, o) => s + o.target.menu_text.length, 0) / htmlOutcomes.length)
    : 0;
  const pdfAvgChars  = pdfOutcomes.length
    ? Math.round(pdfOutcomes.reduce((s, o) => s + o.target.menu_text.length, 0) / pdfOutcomes.length)
    : 0;

  console.log(`\n${"═".repeat(70)}`);
  console.log(`WO-003 SUMMARY  (${targets.length} interpreted / ${withSignal.length} signals produced)`);
  console.log(`${"═".repeat(70)}`);
  console.log(`Signal fill-rate:`);
  console.log(`  cuisine_posture:     ${withCuisine.length}/${targets.length}  (avg conf: ${(avgCuisineConf * 100).toFixed(0)}%)`);
  console.log(`  service_model:       ${withService.length}/${targets.length}  (avg conf: ${(avgServiceConf * 100).toFixed(0)}%)`);
  console.log(`  wine_program_intent: ${withWine.length}/${targets.length}  (avg conf: ${(avgWineConf * 100).toFixed(0)}%)`);
  console.log(`\nBy source format:`);
  console.log(`  HTML sources: ${htmlOutcomes.length}  avg menu text: ${htmlAvgChars.toLocaleString()} chars`);
  console.log(`  PDF  sources: ${pdfOutcomes.length}  avg menu text: ${pdfAvgChars.toLocaleString()} chars`);
  if (errored.length) {
    console.log(`\nErrors: ${errored.length}`);
    errored.forEach((o) => console.log(`  • ${o.target.entity_name}: ${o.error}`));
  }

  if (dryRun) console.log(`\n[dry-run] No rows written.`);
  else        console.log(`\n${withSignal.length} rows written to derived_signals (signal_key='menu_identity').`);
}

main().catch((e) => { console.error(e); process.exit(1); });
