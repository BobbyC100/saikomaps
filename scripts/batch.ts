#!/usr/bin/env npx tsx
// =============================================================================
// SaikoAI Source Collector — Batch Runner
//
// Runs collect:b for every place in places.json with:
//   - Rate limit delays (configurable)
//   - Auto-retry on 429s with backoff
//   - Resume support (skips places that already have source files)
//   - Progress tracking and ETA
//
// Usage:
//   npm run batch                          # run all, skip already collected
//   npm run batch -- --force               # re-collect everything
//   npm run batch -- --limit 20            # first 20 only
//   npm run batch -- --delay 90            # 90s between places (default: 75)
//   npm run batch -- --category "wine bar" # only wine bars
//   npm run batch -- --start-at silver-lake-wine  # resume from slug
//   npm run batch -- --places data/input/places-curated.json  # curated list
// =============================================================================

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const DEFAULT_PLACES_PATH = "data/input/places.json";
const SOURCES_DIR = "data/input/sources";
const BENCHMARK_DIR = "data/benchmark/approach-b";
const DEFAULT_LOG_PATH = "data/batch-log.json";

interface Place {
  slug: string;
  name: string;
  city: string;
  category: string;
}

interface BatchLogEntry {
  slug: string;
  status: "success" | "error" | "skipped" | "no_sources";
  sourcesFound: number;
  timestamp: string;
  error?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let force = false;
  let delay = 75; // seconds between places
  let category = "";
  let startAt = "";
  let placesPath = DEFAULT_PLACES_PATH;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--limit": limit = parseInt(args[++i] || "10", 10); break;
      case "--force": force = true; break;
      case "--delay": delay = parseInt(args[++i] || "75", 10); break;
      case "--category": category = args[++i] || ""; break;
      case "--start-at": startAt = args[++i] || ""; break;
      case "--places": placesPath = args[++i] || DEFAULT_PLACES_PATH; break;
    }
  }

  const isCurated = placesPath.includes("curated");
  const logPath = isCurated ? "data/batch-curated-log.json" : DEFAULT_LOG_PATH;

  return { limit, force, delay, category, startAt, placesPath, logPath };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadLog(logPath: string): Promise<BatchLogEntry[]> {
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveLog(log: BatchLogEntry[], logPath: string) {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, JSON.stringify(log, null, 2), "utf-8");
}

function sleep(seconds: number): Promise<void> {
  return new Promise((r) => setTimeout(r, seconds * 1000));
}

function formatETA(remainingPlaces: number, delaySeconds: number): string {
  const totalSeconds = remainingPlaces * delaySeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `~${hours}h ${minutes}m`;
  return `~${minutes}m`;
}

async function collectPlace(slug: string, placesPath: string, retries = 3): Promise<{ success: boolean; sourcesFound: number; error?: string }> {
  const placesArg = placesPath !== DEFAULT_PLACES_PATH ? ` --places ${placesPath}` : "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      execSync(
        `npx tsx scripts/collect-b.ts --slug ${slug}${placesArg}`,
        { encoding: "utf-8", timeout: 120_000, stdio: "pipe" }
      );

      // Check if sources were written
      const sourceFile = path.join(SOURCES_DIR, `${slug}.json`);
      if (await fileExists(sourceFile)) {
        const raw = await fs.readFile(sourceFile, "utf-8");
        const data = JSON.parse(raw);
        const count = data.sources?.length || 0;

        // Copy to benchmark dir
        await fs.mkdir(BENCHMARK_DIR, { recursive: true });
        await fs.copyFile(sourceFile, path.join(BENCHMARK_DIR, `${slug}.json`));

        return { success: true, sourcesFound: count };
      }

      return { success: true, sourcesFound: 0 };
    } catch (err: unknown) {
      const e = err as { stderr?: string; message?: string };
      const msg = e.stderr || e.message || "";

      // Rate limited — backoff and retry
      if (msg.includes("429") || msg.includes("rate") || msg.includes("too many")) {
        const backoff = attempt * 60; // 60s, 120s, 180s
        console.log(`  ⏳ Rate limited (attempt ${attempt}/${retries}). Waiting ${backoff}s...`);
        await sleep(backoff);
        continue;
      }

      // Other error
      if (attempt === retries) {
        return { success: false, sourcesFound: 0, error: msg.slice(0, 200) };
      }

      console.log(`  ⚠️  Error (attempt ${attempt}/${retries}). Retrying in 30s...`);
      await sleep(30);
    }
  }

  return { success: false, sourcesFound: 0, error: "Max retries exceeded" };
}

async function main() {
  const args = parseArgs();

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  SaikoAI Batch Collector                     ║");
  console.log("╚══════════════════════════════════════════════╝");

  // Load places
  let places: Place[];
  try {
    const raw = await fs.readFile(args.placesPath, "utf-8");
    places = JSON.parse(raw);
  } catch {
    console.error("❌ Could not read", args.placesPath);
    process.exit(1);
  }

  if (args.placesPath.includes("curated")) {
    console.log(`\n  📋 Using curated list: ${args.placesPath}`);
  }

  // Filter by category
  if (args.category) {
    places = places.filter((p) =>
      p.category.toLowerCase().includes(args.category.toLowerCase())
    );
    console.log(`\n  Filtered to category "${args.category}": ${places.length} places`);
  }

  // Start-at support (resume from a specific slug)
  if (args.startAt) {
    const idx = places.findIndex((p) => p.slug === args.startAt);
    if (idx === -1) {
      console.error(`❌ Slug "${args.startAt}" not found`);
      process.exit(1);
    }
    places = places.slice(idx);
    console.log(`  Starting at "${args.startAt}": ${places.length} remaining`);
  }

  // Apply limit
  places = places.slice(0, args.limit);

  // Skip already collected (unless --force)
  let toProcess: Place[] = [];
  let skipped = 0;

  if (args.force) {
    toProcess = places;
  } else {
    for (const place of places) {
      const exists = await fileExists(path.join(SOURCES_DIR, `${place.slug}.json`));
      if (exists) {
        skipped++;
      } else {
        toProcess.push(place);
      }
    }
  }

  console.log(`\n  Total places:    ${places.length}`);
  console.log(`  Already done:    ${skipped}`);
  console.log(`  To process:      ${toProcess.length}`);
  console.log(`  Delay:           ${args.delay}s between places`);
  console.log(`  ETA:             ${formatETA(toProcess.length, args.delay)}`);
  console.log("");

  if (toProcess.length === 0) {
    console.log("  ✅ Nothing to do!");
    return;
  }

  // Load existing log
  const log = await loadLog(args.logPath);

  // Process
  let successCount = 0;
  let errorCount = 0;
  let noSourceCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const place = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;
    const eta = formatETA(toProcess.length - i - 1, args.delay);

    console.log(`${progress} 📍 ${place.name} (${place.category}) — ETA: ${eta}`);

    const result = await collectPlace(place.slug, args.placesPath);

    const entry: BatchLogEntry = {
      slug: place.slug,
      status: result.success
        ? result.sourcesFound > 0 ? "success" : "no_sources"
        : "error",
      sourcesFound: result.sourcesFound,
      timestamp: new Date().toISOString(),
      error: result.error,
    };

    log.push(entry);
    await saveLog(log, args.logPath);

    if (result.success && result.sourcesFound > 0) {
      console.log(`  ✅ ${result.sourcesFound} sources`);
      successCount++;
    } else if (result.success) {
      console.log(`  ⚠️  No sources found`);
      noSourceCount++;
    } else {
      console.log(`  ❌ Error: ${result.error?.slice(0, 100)}`);
      errorCount++;
    }

    // Delay before next (skip on last)
    if (i < toProcess.length - 1) {
      console.log(`  ⏳ Waiting ${args.delay}s...\n`);
      await sleep(args.delay);
    }
  }

  // Summary
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  Batch Complete                               ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n  ✅ Collected:     ${successCount}`);
  console.log(`  ⚠️  No sources:   ${noSourceCount}`);
  console.log(`  ❌ Errors:        ${errorCount}`);
  console.log(`  📊 Log:           ${args.logPath}`);

  // Run benchmark
  console.log(`\n  Run benchmark: npm run benchmark -- --slug all\n`);
}

main().catch((err) => {
  console.error("💥", err);
  process.exit(1);
});
