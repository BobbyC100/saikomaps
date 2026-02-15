#!/usr/bin/env npx tsx
// =============================================================================
// SaikoAI Source Collector — Approach B (Claude-Native Search)
//
// Instead of CSE → fetch → Readability → validate, this collapses the entire
// pipeline into a single Claude API call with web_search tool enabled.
// Claude searches, evaluates, and returns structured sources in one shot.
//
// Usage:
//   npm run collect:b -- --slug bar-bandini
//   npm run collect:b -- --slug all --limit 5
//   npm run collect:b -- --slug bar-bandini --verbose
// =============================================================================

import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

// =============================================================================
// Config
// =============================================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const PLACES_PATH = "data/input/places.json";
const SOURCES_DIR = "data/input/sources";

// =============================================================================
// Types
// =============================================================================

interface Place {
  slug: string;
  name: string;
  city: string;
  category: string;
}

interface Source {
  source_id: string;
  publication: string;
  title: string;
  url: string;
  published_at: string;
  trust_level: "editorial" | "official";
  content: string;
}

interface SourceFile {
  place_slug: string;
  sources: Source[];
}

interface BenchmarkMetrics {
  slug: string;
  sourcesFound: number;
  timeMs: number;
  inputTokens: number;
  outputTokens: number;
  searchQueries: number;
  file: string | null;
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  let slug = "";
  let limit = Infinity;
  let verbose = false;
  let dryRun = false;
  let placesPath = PLACES_PATH;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--slug": slug = args[++i] || ""; break;
      case "--limit": limit = parseInt(args[++i] || "10", 10); break;
      case "--verbose": case "-v": verbose = true; break;
      case "--dry-run": dryRun = true; break;
      case "--places": placesPath = args[++i] || PLACES_PATH; break;
    }
  }

  if (!slug) {
    console.error("Usage: npm run collect:b -- --slug bar-bandini");
    process.exit(1);
  }

  return { slug, limit, verbose, dryRun, placesPath };
}

// =============================================================================
// The Prompt
// =============================================================================

function buildSystemPrompt(): string {
  return `You are a source collector for SaikoAI, a curated map platform. Your job is to find high-quality editorial articles about a specific place.

## Source Registry (search these publications in priority order)

**Tier 1 — Primary Authority:**
- Michelin Guide (guide.michelin.com) — fine dining, restaurants
- LA Times (latimes.com) — all restaurants
- NYT (nytimes.com) — restaurants
- L.A. Taco (lataco.com) — street food, tacos
- Sprudge (sprudge.com) — coffee
- Punch (punchdrink.com) — wine bars, cocktails

**Tier 2 — Editorial Consensus:**
- Eater LA (la.eater.com) — restaurants, openings, heat maps
- The Infatuation (theinfatuation.com) — restaurants, neighborhood guides
- Time Out LA (timeout.com/los-angeles) — restaurants, bars, coffee
- Bon Appétit (bonappetit.com) — restaurants

**Tier 3 — Confirmation:**
- Food GPS (foodgps.com) — LA restaurants
- Consuming LA (consumingla.com) — annual best-of lists

## EXCLUDED — Never use:
- Yelp — excluded entirely, never cite or reference
- TripAdvisor, Google Reviews, Reddit, or any user-generated review platform

## Category Search Priority:
- Coffee: Sprudge → Eater → Time Out
- Wine bars: Punch → Eater → Infatuation
- Restaurants: LA Times → NYT → Michelin → Eater → Infatuation
- Street food: L.A. Taco → Eater → LA Times
- Bars: Punch → Eater → Time Out

## What counts as a valid source:
- **Direct review**: A dedicated article or feature about the place ✅
- **List inclusion**: Place appears in a best-of list, map, or guide with at least a sentence of editorial content ✅
- **Passing mention**: Place is named but no substantive content ❌
- **Not found**: Place not mentioned ❌

## Rules:
1. Search the publications relevant to the place's category, in priority order
2. For each publication, search for the place name + city
3. Only include articles with substantive editorial content (direct review or meaningful list inclusion)
4. Extract the full article text for each source — clean text only, no HTML/nav/ads
5. If an article is paywalled, set content to "[PAYWALLED]" and still include it for metadata
6. Articles older than 5 years should still be included but note the date
7. Aim for 2-5 sources for well-covered places; report honestly if coverage is thin
8. DO NOT fabricate sources or URLs — only include articles you actually found via search`;
}

function buildUserPrompt(place: Place): string {
  return `Find editorial sources for this place:

**Name:** ${place.name}
**City:** ${place.city}
**Category:** ${place.category}

Search the relevant publications from the registry (prioritized for the "${place.category}" category). For each article you find, extract the full article text.

Return your results as a JSON object with this exact schema (no markdown fences, just raw JSON):

{
  "place_slug": "${place.slug}",
  "sources": [
    {
      "source_id": "src_{publication}_{year}",
      "publication": "Publication Name",
      "title": "Article Title",
      "url": "https://...",
      "published_at": "YYYY-MM-DD",
      "trust_level": "editorial",
      "content": "Full article text, stripped of HTML..."
    }
  ],
  "search_notes": "Brief summary of what you searched and found/didn't find"
}

Field rules:
- source_id: src_{publication_lowercase}_{year} — e.g. src_eater_la_2023
- trust_level: always "editorial" for these publications
- published_at: ISO date if findable, empty string if not
- content: full clean article text, or "[PAYWALLED]" if blocked

If you find zero relevant sources, return an empty sources array and explain in search_notes.`;
}

// =============================================================================
// Core — Single Claude Call with Web Search
// =============================================================================

async function collectWithClaude(
  client: Anthropic,
  place: Place,
  verbose: boolean
): Promise<{ result: SourceFile | null; metrics: BenchmarkMetrics }> {
  const start = Date.now();

  if (verbose) console.log(`\n  🤖 Calling Claude with web_search for ${place.name}...`);

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      system: buildSystemPrompt(),
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        },
      ],
      messages: [
        {
          role: "user",
          content: buildUserPrompt(place),
        },
      ],
    });

    const timeMs = Date.now() - start;

    // Count search queries from tool use blocks
    let searchQueries = 0;
    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "web_search") {
        searchQueries++;
      }
    }

    // Extract the final text response
    const textBlocks = response.content.filter((b) => b.type === "text");
    const fullText = textBlocks.map((b) => (b as { text: string }).text).join("\n");

    if (verbose) {
      console.log(`  ⏱️  ${timeMs}ms | ${response.usage.input_tokens} in / ${response.usage.output_tokens} out | ${searchQueries} searches`);
    }

    // Parse JSON from response
    const jsonMatch = fullText.match(/\{[\s\S]*"place_slug"[\s\S]*"sources"[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`  ⚠️  Could not extract JSON from response`);
      if (verbose) console.log(`  Raw text:\n${fullText.slice(0, 500)}`);
      return {
        result: null,
        metrics: {
          slug: place.slug,
          sourcesFound: 0,
          timeMs,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          searchQueries,
          file: null,
        },
      };
    }

    // Clean and parse
    let parsed: { sources?: unknown[]; search_notes?: string } | null = null;
    try {
      const cleaned = jsonMatch[0].replace(/```json\n?|```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Try a more aggressive extraction — find the outermost { }
      try {
        const start = fullText.indexOf("{");
        const end = fullText.lastIndexOf("}");
        if (start >= 0 && end > start) {
          parsed = JSON.parse(fullText.slice(start, end + 1));
        }
      } catch {
        console.log(`  ⚠️  JSON parse failed`);
        if (verbose) console.log(`  Raw: ${jsonMatch[0].slice(0, 300)}`);
        return {
          result: null,
          metrics: {
            slug: place.slug,
            sourcesFound: 0,
            timeMs,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            searchQueries,
            file: null,
          },
        };
      }
    }

    if (!parsed) {
      return {
        result: null,
        metrics: {
          slug: place.slug,
          sourcesFound: 0,
          timeMs,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          searchQueries,
          file: null,
        },
      };
    }

    // Validate and clean sources
    const rawSources = (parsed.sources || []) as Array<Record<string, unknown>>;
    const sources: Source[] = rawSources
      .filter((s) => s && typeof s.url === "string" && typeof s.publication === "string" && typeof s.content === "string")
      .map((s) => ({
        source_id: (s.source_id as string) || `src_unknown_${Date.now()}`,
        publication: s.publication as string,
        title: (s.title as string) || "",
        url: s.url as string,
        published_at: (s.published_at as string) || "",
        trust_level: (s.trust_level === "official" ? "official" : "editorial") as "editorial" | "official",
        content: s.content as string,
      }));

    const result: SourceFile = {
      place_slug: place.slug,
      sources,
    };

    if (parsed.search_notes && verbose) {
      console.log(`  📝 ${parsed.search_notes}`);
    }

    return {
      result,
      metrics: {
        slug: place.slug,
        sourcesFound: sources.length,
        timeMs,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        searchQueries,
        file: null, // set after writing
      },
    };
  } catch (err) {
    const timeMs = Date.now() - start;
    console.error(`  ❌ API error: ${(err as Error).message}`);
    return {
      result: null,
      metrics: {
        slug: place.slug,
        sourcesFound: 0,
        timeMs,
        inputTokens: 0,
        outputTokens: 0,
        searchQueries: 0,
        file: null,
      },
    };
  }
}

// =============================================================================
// Entry Point
// =============================================================================

async function main() {
  const args = parseArgs();

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  SaikoAI Source Collector — Approach B       ║");
  console.log("║  (Claude-Native Search)                      ║");
  console.log("╚══════════════════════════════════════════════╝");

  if (!ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY is required");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  // Load places
  let places: Place[];
  try {
    const raw = await fs.readFile(args.placesPath, "utf-8");
    places = JSON.parse(raw);
  } catch {
    console.error(`❌ Could not read ${args.placesPath}`);
    process.exit(1);
  }

  // Filter targets
  let targets: Place[];
  if (args.slug === "all") {
    targets = places.slice(0, args.limit);
  } else {
    const found = places.find((p) => p.slug === args.slug);
    if (!found) {
      console.error(`❌ Slug "${args.slug}" not found`);
      process.exit(1);
    }
    targets = [found];
  }

  console.log(`\n🎯 Processing ${targets.length} place(s)\n`);

  // Process
  const allMetrics: BenchmarkMetrics[] = [];

  for (const place of targets) {
    console.log(`📍 ${place.name} (${place.city}) — ${place.category}`);

    const { result, metrics } = await collectWithClaude(client, place, args.verbose);

    if (result && result.sources.length > 0) {
      // Print summary
      console.log(`   ✅ ${result.sources.length} source(s) found`);
      for (const src of result.sources) {
        const preview =
          src.content === "[PAYWALLED]"
            ? "🔒 PAYWALLED"
            : `${src.content.length.toLocaleString()} chars`;
        console.log(`      • ${src.publication}: "${src.title.slice(0, 55)}" (${preview})`);
      }

      // Write file
      if (!args.dryRun) {
        const outPath = path.join(SOURCES_DIR, `${place.slug}.json`);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf-8");
        metrics.file = outPath;
        console.log(`   💾 ${outPath}`);
      }
    } else {
      console.log(`   ⚠️  No sources found`);
    }

    allMetrics.push(metrics);
  }

  // ==========================================================================
  // Benchmark Report
  // ==========================================================================

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  Benchmark Report — Approach B               ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // Per-place table
  console.log("  Place                    Sources  Time     Tokens (in/out)   Searches");
  console.log("  ─────────────────────────────────────────────────────────────────────");
  for (const m of allMetrics) {
    const name = m.slug.padEnd(24);
    const sources = String(m.sourcesFound).padEnd(8);
    const time = `${(m.timeMs / 1000).toFixed(1)}s`.padEnd(8);
    const tokens = `${m.inputTokens}/${m.outputTokens}`.padEnd(18);
    const searches = String(m.searchQueries);
    console.log(`  ${name} ${sources} ${time} ${tokens} ${searches}`);
  }

  // Aggregates
  const totalTime = allMetrics.reduce((s, m) => s + m.timeMs, 0);
  const totalIn = allMetrics.reduce((s, m) => s + m.inputTokens, 0);
  const totalOut = allMetrics.reduce((s, m) => s + m.outputTokens, 0);
  const totalSources = allMetrics.reduce((s, m) => s + m.sourcesFound, 0);
  const totalSearches = allMetrics.reduce((s, m) => s + m.searchQueries, 0);

  // Estimate cost (Sonnet: $3/M input, $15/M output)
  const costIn = (totalIn / 1_000_000) * 3;
  const costOut = (totalOut / 1_000_000) * 15;
  const totalCost = costIn + costOut;

  console.log("\n  ─────────────────────────────────────────────────────────────────────");
  console.log(`  Total sources:      ${totalSources}`);
  console.log(`  Total time:         ${(totalTime / 1000).toFixed(1)}s (avg ${(totalTime / allMetrics.length / 1000).toFixed(1)}s/place)`);
  console.log(`  Total tokens:       ${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out`);
  console.log(`  Total searches:     ${totalSearches}`);
  console.log(`  Est. API cost:      $${totalCost.toFixed(4)} ($${(totalCost / allMetrics.length).toFixed(4)}/place)`);

  // Write benchmark file
  const benchmarkPath = `data/benchmarks/approach-b-${new Date().toISOString().slice(0, 10)}.json`;
  await fs.mkdir(path.dirname(benchmarkPath), { recursive: true });
  await fs.writeFile(
    benchmarkPath,
    JSON.stringify(
      {
        approach: "B-claude-native",
        timestamp: new Date().toISOString(),
        model: CLAUDE_MODEL,
        places: allMetrics,
        totals: {
          sources: totalSources,
          timeMs: totalTime,
          inputTokens: totalIn,
          outputTokens: totalOut,
          searches: totalSearches,
          estimatedCost: totalCost,
        },
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`\n  📊 Benchmark saved to ${benchmarkPath}`);
  console.log("");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
