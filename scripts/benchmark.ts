#!/usr/bin/env npx tsx
// =============================================================================
// SaikoAI Source Collector — Benchmark
//
// Scores Approach A and/or B on how well they search the curated publication
// registry and return usable content for extraction.
//
// Usage:
//   npm run benchmark -- --slug psychic-wine
//   npm run benchmark -- --slug all
//   npm run benchmark -- --slug all --compare
// =============================================================================

import fs from "fs/promises";
import path from "path";
import {
  SOURCE_REGISTRY,
  CATEGORY_PRIORITY,
  DEFAULT_PRIORITY,
  type Publication,
} from "./collect-sources.config";

// =============================================================================
// Types
// =============================================================================

interface Source {
  source_id: string;
  publication: string;
  title: string;
  url: string;
  published_at: string;
  trust_level: string;
  content: string;
}

interface SourceFile {
  place_slug: string;
  sources: Source[];
}

interface Place {
  slug: string;
  name: string;
  city: string;
  category: string;
}

interface PlaceScore {
  slug: string;
  category: string;
  approach: string;
  sourcesFound: number;
  publicationsSearchable: number;
  publicationsHit: number;
  coverageRate: number;
  tierBreakdown: { tier1: number; tier2: number; tier3: number };
  totalSources: number;
  cleanSources: number;
  paywalledSources: number;
  emptySources: number;
  contentQualityRate: number;
  avgContentLength: number;
  shortTitleSources: number;
  withDate: number;
  withTitle: number;
  metadataRate: number;
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeCategory(category: string): string {
  const c = category.toLowerCase().trim();
  if (c.includes("coffee")) return "coffee";
  if (c.includes("wine bar") || c.includes("wine shop")) return "wine bar";
  if (c.includes("street food") || c.includes("taco")) return "street food";
  if (c.includes("bar") && !c.includes("wine")) return "bar";
  return "restaurant";
}

function getRelevantPubs(category: string): Publication[] {
  const normalized = normalizeCategory(category);
  const domains = CATEGORY_PRIORITY[normalized] || DEFAULT_PRIORITY;
  return domains
    .map((d) => SOURCE_REGISTRY.find((p) => p.domain === d))
    .filter(Boolean) as Publication[];
}

function getTier(publicationName: string): number {
  const pub = SOURCE_REGISTRY.find(
    (p) => p.name.toLowerCase() === publicationName.toLowerCase()
  );
  return pub?.tier || 0;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let slug = "";
  let compare = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--slug") slug = args[++i] || "";
    if (args[i] === "--compare") compare = true;
  }
  if (!slug) {
    console.error("Usage: npm run benchmark -- --slug psychic-wine");
    process.exit(1);
  }
  return { slug, compare };
}

// =============================================================================
// Scoring
// =============================================================================

function scorePlace(
  place: Place,
  result: SourceFile,
  approach: string
): PlaceScore {
  const relevantPubs = getRelevantPubs(place.category);

  const pubsHit = new Set<string>();
  const tierCounts = { tier1: 0, tier2: 0, tier3: 0 };
  let cleanSources = 0;
  let paywalledSources = 0;
  let emptySources = 0;
  let totalCleanLength = 0;
  let withDate = 0;
  let withTitle = 0;
  let shortTitleSources = 0;

  for (const src of result.sources) {
    pubsHit.add(src.publication.toLowerCase());

    const tier = getTier(src.publication);
    if (tier === 1) tierCounts.tier1++;
    else if (tier === 2) tierCounts.tier2++;
    else if (tier === 3) tierCounts.tier3++;

    if (!src.content || src.content.trim().length === 0) {
      emptySources++;
    } else if (src.content === "[PAYWALLED]") {
      paywalledSources++;
    } else if (src.content.length > 200) {
      cleanSources++;
      totalCleanLength += src.content.length;
    } else {
      emptySources++;
    }

    if (src.published_at && src.published_at.length >= 4) withDate++;
    if (src.title && src.title.length > 5) withTitle++;
    if (!src.title || src.title.length < 10) shortTitleSources++;
  }

  const total = result.sources.length;

  return {
    slug: place.slug,
    category: place.category,
    approach,
    sourcesFound: total,
    publicationsSearchable: relevantPubs.length,
    publicationsHit: pubsHit.size,
    coverageRate: relevantPubs.length > 0 ? pubsHit.size / relevantPubs.length : 0,
    tierBreakdown: tierCounts,
    totalSources: total,
    cleanSources,
    paywalledSources,
    emptySources,
    contentQualityRate: total > 0 ? cleanSources / total : 0,
    avgContentLength: cleanSources > 0 ? Math.round(totalCleanLength / cleanSources) : 0,
    shortTitleSources,
    withDate,
    withTitle,
    metadataRate: total > 0 ? ((withDate + withTitle) / (total * 2)) : 0,
  };
}

// =============================================================================
// Display
// =============================================================================

function printScore(s: PlaceScore) {
  const bar = (pct: number) => {
    const filled = Math.round(pct * 10);
    return "█".repeat(filled) + "░".repeat(10 - filled);
  };

  console.log(`\n  ${s.approach}`);
  console.log(`  ${"─".repeat(50)}`);
  console.log(`  Sources found:       ${s.sourcesFound}`);
  console.log(`  Tier breakdown:      T1: ${s.tierBreakdown.tier1}  T2: ${s.tierBreakdown.tier2}  T3: ${s.tierBreakdown.tier3}`);
  console.log(`  Pub coverage:        ${s.publicationsHit}/${s.publicationsSearchable} ${bar(s.coverageRate)} ${(s.coverageRate * 100).toFixed(0)}%`);
  console.log(`  Content quality:     ${s.cleanSources} clean, ${s.paywalledSources} paywalled, ${s.emptySources} empty ${bar(s.contentQualityRate)} ${(s.contentQualityRate * 100).toFixed(0)}%`);
  console.log(`  Avg content length:  ${s.avgContentLength.toLocaleString()} chars`);
  console.log(`  Metadata complete:   ${bar(s.metadataRate)} ${(s.metadataRate * 100).toFixed(0)}%`);

  if (s.shortTitleSources > 0) {
    console.log(`  ⚠️  ${s.shortTitleSources} source(s) with suspicious/missing titles`);
  }
}

function printComparison(a: PlaceScore, b: PlaceScore) {
  console.log(`\n  ──── Head to Head ────`);

  const metrics: [string, number, number][] = [
    ["Sources found", a.sourcesFound, b.sourcesFound],
    ["Pub coverage", a.coverageRate, b.coverageRate],
    ["Content quality", a.contentQualityRate, b.contentQualityRate],
    ["Metadata", a.metadataRate, b.metadataRate],
    ["Avg content len", a.avgContentLength, b.avgContentLength],
  ];

  console.log(`  ${"Metric".padEnd(20)} ${"A".padStart(8)} ${"B".padStart(8)}  Winner`);
  for (const [name, va, vb] of metrics) {
    const isPercent = va <= 1 && vb <= 1 && name !== "Sources found" && name !== "Avg content len";
    const fmtA = isPercent ? `${(va * 100).toFixed(0)}%` : va.toLocaleString();
    const fmtB = isPercent ? `${(vb * 100).toFixed(0)}%` : vb.toLocaleString();
    const winner = va > vb ? "← A" : vb > va ? "B →" : "tie";
    console.log(`  ${name.padEnd(20)} ${fmtA.padStart(8)} ${fmtB.padStart(8)}  ${winner}`);
  }

  const compositeA = (a.coverageRate * 0.3) + (a.contentQualityRate * 0.4) + (a.metadataRate * 0.15) + (Math.min(a.sourcesFound / 5, 1) * 0.15);
  const compositeB = (b.coverageRate * 0.3) + (b.contentQualityRate * 0.4) + (b.metadataRate * 0.15) + (Math.min(b.sourcesFound / 5, 1) * 0.15);

  console.log(`\n  Composite:           A=${(compositeA * 100).toFixed(0)}  B=${(compositeB * 100).toFixed(0)}  ${compositeA > compositeB ? "→ A wins" : compositeB > compositeA ? "→ B wins" : "→ Tie"}`);
  console.log(`  (weights: coverage 30%, content quality 40%, metadata 15%, source count 15%)`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const { slug, compare } = parseArgs();

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  SaikoAI Source Collector — Benchmark         ║");
  console.log("╚══════════════════════════════════════════════╝");

  let places: Place[];
  try {
    const raw = await fs.readFile("data/input/places.json", "utf-8");
    places = JSON.parse(raw);
  } catch {
    console.error("❌ Could not read data/input/places.json");
    process.exit(1);
  }

  const targets = slug === "all" ? places : places.filter((p) => p.slug === slug);
  if (targets.length === 0) {
    console.error(`❌ No places found for slug "${slug}"`);
    process.exit(1);
  }

  const approachADir = "data/benchmark/approach-a";
  const approachBDir = "data/benchmark/approach-b";

  for (const dir of [approachADir, approachBDir]) {
    await fs.mkdir(dir, { recursive: true });
  }

  const allScoresA: PlaceScore[] = [];
  const allScoresB: PlaceScore[] = [];

  for (const place of targets) {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║  📍 ${(place.name + " (" + place.category + ")").padEnd(40)} ║`);
    console.log(`╚══════════════════════════════════════════════╝`);

    // Load results
    let resultA: SourceFile | null = null;
    let resultB: SourceFile | null = null;

    try {
      resultA = JSON.parse(await fs.readFile(path.join(approachADir, `${place.slug}.json`), "utf-8"));
    } catch {}

    try {
      resultB = JSON.parse(await fs.readFile(path.join(approachBDir, `${place.slug}.json`), "utf-8"));
    } catch {}

    if (!resultA && !resultB) {
      console.log(`\n  ⚠️  No results found. Run collect or collect:b first.`);
      continue;
    }

    let scoreA: PlaceScore | null = null;
    let scoreB: PlaceScore | null = null;

    if (resultA) {
      scoreA = scorePlace(place, resultA, "Approach A (CSE Pipeline)");
      printScore(scoreA);
      allScoresA.push(scoreA);
    }

    if (resultB) {
      scoreB = scorePlace(place, resultB, "Approach B (Claude-Native)");
      printScore(scoreB);
      allScoresB.push(scoreB);
    }

    if (scoreA && scoreB && compare) {
      printComparison(scoreA, scoreB);
    }

    // List sources
    const showSources = (label: string, result: SourceFile) => {
      console.log(`\n  ${label} sources:`);
      for (const src of result.sources) {
        const tier = getTier(src.publication);
        const status =
          src.content === "[PAYWALLED]" ? "🔒" :
          !src.content || src.content.length < 200 ? "⚠️" : "✅";
        console.log(`    ${status} T${tier || "?"} ${src.publication}: ${src.title.slice(0, 50)}`);
        console.log(`       ${src.url}`);
      }
    };

    if (resultA) showSources("A", resultA);
    if (resultB) showSources("B", resultB);
  }

  // Aggregate
  if (targets.length > 1 && (allScoresA.length > 0 || allScoresB.length > 0)) {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║  Aggregate Summary                            ║`);
    console.log(`╚══════════════════════════════════════════════╝`);

    const summarize = (scores: PlaceScore[], label: string) => {
      if (scores.length === 0) return;
      const avg = (fn: (s: PlaceScore) => number) =>
        scores.reduce((sum, s) => sum + fn(s), 0) / scores.length;

      console.log(`\n  ${label} (${scores.length} places)`);
      console.log(`  ${"─".repeat(40)}`);
      console.log(`  Avg sources/place:   ${avg((s) => s.sourcesFound).toFixed(1)}`);
      console.log(`  Avg pub coverage:    ${(avg((s) => s.coverageRate) * 100).toFixed(0)}%`);
      console.log(`  Avg content quality: ${(avg((s) => s.contentQualityRate) * 100).toFixed(0)}%`);
      console.log(`  Avg metadata:        ${(avg((s) => s.metadataRate) * 100).toFixed(0)}%`);
    };

    summarize(allScoresA, "Approach A");
    summarize(allScoresB, "Approach B");
  }

  console.log("\n");
}

main().catch((err) => {
  console.error("💥", err);
  process.exit(1);
});
