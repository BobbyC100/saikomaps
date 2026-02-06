#!/usr/bin/env npx tsx
// =============================================================================
// SaikoAI Source Collector — Review
//
// Rapid-fire review of all collected sources. Shows each place's sources
// and lets you approve, reject, or flag for later.
//
// Usage:
//   npm run review                    # review all collected sources
//   npm run review -- --category bar  # only bars
//   npm run review -- --flagged       # re-review flagged items only
//   npm run review -- --no-sources    # review places with 0 sources (triaging)
//   npm run review -- --min-sources 3  # places below threshold (0, 1, or 2 sources)
//   npm run review -- --no-sources --all-manual  # mark all 0-source places as manual (no prompts)
// =============================================================================

import fs from "fs/promises";
import path from "path";
import * as readline from "readline";

const SOURCES_DIR = "data/input/sources";
const PLACES_PATH = "data/input/places.json";
const REVIEW_LOG_PATH = "data/review-log.json";
const NO_SOURCES_LOG_PATH = "data/no-sources-review.json";

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

interface ReviewEntry {
  slug: string;
  status: "approved" | "rejected" | "flagged";
  sourcesKept: number;
  removedSources: string[]; // source_ids removed
  timestamp: string;
}

interface NoSourcesEntry {
  slug: string;
  status: "manual" | "skip" | "retry";
  timestamp: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let category = "";
  let flaggedOnly = false;
  let noSourcesOnly = false;
  let minSources = 0; // 0 = not set
  let allManual = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--category") category = args[++i] || "";
    if (args[i] === "--flagged") flaggedOnly = true;
    if (args[i] === "--no-sources") noSourcesOnly = true;
    if (args[i] === "--min-sources") minSources = parseInt(args[++i] || "0", 10) || 0;
    if (args[i] === "--all-manual") allManual = true;
  }

  return { category, flaggedOnly, noSourcesOnly, minSources, allManual };
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function loadReviewLog(): Promise<Record<string, ReviewEntry>> {
  try {
    const raw = await fs.readFile(REVIEW_LOG_PATH, "utf-8");
    const entries: ReviewEntry[] = JSON.parse(raw);
    const map: Record<string, ReviewEntry> = {};
    for (const e of entries) map[e.slug] = e;
    return map;
  } catch {
    return {};
  }
}

async function saveReviewLog(log: Record<string, ReviewEntry>) {
  const entries = Object.values(log).sort((a, b) => a.slug.localeCompare(b.slug));
  await fs.mkdir(path.dirname(REVIEW_LOG_PATH), { recursive: true });
  await fs.writeFile(REVIEW_LOG_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

async function loadNoSourcesLog(): Promise<Record<string, NoSourcesEntry>> {
  try {
    const raw = await fs.readFile(NO_SOURCES_LOG_PATH, "utf-8");
    const entries: NoSourcesEntry[] = JSON.parse(raw);
    const map: Record<string, NoSourcesEntry> = {};
    for (const e of entries) map[e.slug] = e;
    return map;
  } catch {
    return {};
  }
}

async function saveNoSourcesLog(log: Record<string, NoSourcesEntry>) {
  const entries = Object.values(log).sort((a, b) => a.slug.localeCompare(b.slug));
  await fs.mkdir(path.dirname(NO_SOURCES_LOG_PATH), { recursive: true });
  await fs.writeFile(NO_SOURCES_LOG_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

function displaySources(sources: Source[]) {
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const status =
      src.content === "[PAYWALLED]" ? "🔒" :
      !src.content || src.content.length < 200 ? "⚠️" : "✅";
    const chars =
      src.content === "[PAYWALLED]" ? "PAYWALLED" :
      !src.content ? "EMPTY" :
      `${src.content.length.toLocaleString()} chars`;
    const date = src.published_at || "no date";

    console.log(`   ${i + 1}. ${status} ${src.publication} (${date})`);
    console.log(`      "${src.title}"`);
    console.log(`      ${src.url}  [${chars}]`);
  }
}

async function runNoSourcesReview(places: Place[], noSourcesLog: Record<string, NoSourcesEntry>) {
  const toReview = places.filter((p) => !noSourcesLog[p.slug]);
  const alreadyDone = Object.keys(noSourcesLog).length;

  console.log(`  ${toReview.length} to review | ${alreadyDone} already triaged\n`);
  if (toReview.length === 0) {
    console.log("  ✅ Nothing to review!");
    return;
  }

  let manual = 0, skip = 0, retry = 0;

  for (let i = 0; i < toReview.length; i++) {
    const place = toReview[i];
    const remaining = toReview.length - i;

    console.log(`─────────────────────────────────────────────── [${i + 1}/${toReview.length}]`);
    console.log(`📍 ${place.name} (${place.category}) — 0 sources`);
    console.log(`   slug: ${place.slug}`);

    const answer = await prompt(`\n  [m]manual  [s]kip  [r]etry  [q]uit: `);

    if (answer === "q" || answer === "quit") {
      console.log(`\n  💾 Progress saved. ${remaining} remaining.`);
      break;
    }

    const status: NoSourcesEntry["status"] =
      answer === "s" ? "skip" : answer === "r" ? "retry" : "manual";
    noSourcesLog[place.slug] = { slug: place.slug, status, timestamp: new Date().toISOString() };
    await saveNoSourcesLog(noSourcesLog);

    if (status === "manual") { manual++; console.log(`  📝 Manual research\n`); }
    else if (status === "skip") { skip++; console.log(`  ⏭️  Skipped\n`); }
    else { retry++; console.log(`  🔄 Marked for retry\n`); }
  }

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  No-Sources Review Complete                   ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n  📝 Manual:  ${manual}`);
  console.log(`  ⏭️  Skip:    ${skip}`);
  console.log(`  🔄 Retry:   ${retry}`);
  console.log(`  📊 Log:     ${NO_SOURCES_LOG_PATH}\n`);
}

async function runRegularReview(
  toReview: { place: Place; sources: SourceFile }[],
  reviewLog: Record<string, ReviewEntry>
) {
  let approved = 0, rejected = 0, flagged = 0, sourcesRemoved = 0;

  for (let i = 0; i < toReview.length; i++) {
    const { place, sources } = toReview[i];
    const remaining = toReview.length - i;

    console.log(`─────────────────────────────────────────────── [${i + 1}/${toReview.length}]`);
    console.log(`📍 ${place.name} (${place.category}) — ${sources.sources.length} source(s)`);
    displaySources(sources.sources);

    const answer = await prompt(`\n  [y/n/f/r #/q]: `);

    if (answer === "q" || answer === "quit") {
      console.log(`\n  💾 Progress saved. ${remaining} remaining.`);
      break;
    }

    if (answer === "n" || answer === "no") {
      const sourceFile = path.join(SOURCES_DIR, `${place.slug}.json`);
      try { await fs.unlink(sourceFile); } catch {}
      reviewLog[place.slug] = {
        slug: place.slug,
        status: "rejected",
        sourcesKept: 0,
        removedSources: sources.sources.map((s) => s.source_id),
        timestamp: new Date().toISOString(),
      };
      await saveReviewLog(reviewLog);
      console.log(`  🗑️  Rejected\n`);
      rejected++;
    } else if (answer === "f" || answer === "flag") {
      reviewLog[place.slug] = {
        slug: place.slug,
        status: "flagged",
        sourcesKept: sources.sources.length,
        removedSources: [],
        timestamp: new Date().toISOString(),
      };
      await saveReviewLog(reviewLog);
      console.log(`  🚩 Flagged for later\n`);
      flagged++;
    } else if (answer.startsWith("r ") || answer.startsWith("r")) {
      const nums = answer
        .replace(/^r\s*/, "")
        .split(",")
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= sources.sources.length);

      if (nums.length === 0) {
        console.log(`  ⚠️  Invalid source numbers. Use "r 2" or "r 1,3"\n`);
        i--;
        continue;
      }

      const indicesToRemove = new Set(nums.map((n) => n - 1));
      const removed = sources.sources.filter((_, idx) => indicesToRemove.has(idx));
      const kept = sources.sources.filter((_, idx) => !indicesToRemove.has(idx));

      if (kept.length === 0) {
        const sourceFile = path.join(SOURCES_DIR, `${place.slug}.json`);
        try { await fs.unlink(sourceFile); } catch {}
        console.log(`  🗑️  All sources removed — file deleted\n`);
      } else {
        const updated: SourceFile = { place_slug: place.slug, sources: kept };
        const sourceFile = path.join(SOURCES_DIR, `${place.slug}.json`);
        await fs.writeFile(sourceFile, JSON.stringify(updated, null, 2), "utf-8");
        console.log(`  ✂️  Removed ${removed.length}, kept ${kept.length}\n`);
      }

      reviewLog[place.slug] = {
        slug: place.slug,
        status: "approved",
        sourcesKept: kept.length,
        removedSources: removed.map((s) => s.source_id),
        timestamp: new Date().toISOString(),
      };
      await saveReviewLog(reviewLog);
      sourcesRemoved += removed.length;
      approved++;
    } else {
      reviewLog[place.slug] = {
        slug: place.slug,
        status: "approved",
        sourcesKept: sources.sources.length,
        removedSources: [],
        timestamp: new Date().toISOString(),
      };
      await saveReviewLog(reviewLog);
      console.log(`  ✓ Approved\n`);
      approved++;
    }
  }

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  Review Complete                              ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n  ✅ Approved:       ${approved}`);
  console.log(`  🗑️  Rejected:       ${rejected}`);
  console.log(`  🚩 Flagged:        ${flagged}`);
  console.log(`  ✂️  Sources removed: ${sourcesRemoved}`);
  console.log(`  📊 Review log:     ${REVIEW_LOG_PATH}\n`);
}

async function main() {
  const args = parseArgs();

  // Load places
  let places: Place[];
  try {
    const raw = await fs.readFile(PLACES_PATH, "utf-8");
    places = JSON.parse(raw);
  } catch {
    console.error("❌ Could not read", PLACES_PATH);
    process.exit(1);
  }

  if (args.category) {
    places = places.filter((p) =>
      p.category.toLowerCase().includes(args.category.toLowerCase())
    );
  }

  // --- No-sources / insufficient-sources mode ---
  const noSourcesLog = await loadNoSourcesLog();
  const placesWithNoFile: Place[] = [];
  const placesWithSources: { place: Place; sources: SourceFile }[] = [];

  for (const place of places) {
    const sourcePath = path.join(SOURCES_DIR, `${place.slug}.json`);
    try {
      const raw = await fs.readFile(sourcePath, "utf-8");
      const data: SourceFile = JSON.parse(raw);
      const count = data.sources?.length ?? 0;
      if (args.minSources > 0 && count > 0 && count < args.minSources) {
        placesWithSources.push({ place, sources: data });
      }
    } catch {
      placesWithNoFile.push(place);
    }
  }

  const runNoSources = args.noSourcesOnly || (args.minSources > 0 && placesWithNoFile.length > 0);
  const runInsufficient = args.minSources > 0 && placesWithSources.length > 0;

  if (runNoSources) {
    const toTriage = placesWithNoFile.filter((p) => !noSourcesLog[p.slug]);
    if (toTriage.length > 0) {
      console.log("╔══════════════════════════════════════════════╗");
      console.log("║  SaikoAI — No-Sources Review                  ║");
      console.log("╚══════════════════════════════════════════════╝");
      if (args.allManual) {
        for (const place of toTriage) {
          noSourcesLog[place.slug] = {
            slug: place.slug,
            status: "manual",
            timestamp: new Date().toISOString(),
          };
        }
        await saveNoSourcesLog(noSourcesLog);
        console.log(`\n  📝 Marked ${toTriage.length} places as manual research.`);
        console.log(`  📊 Log: ${NO_SOURCES_LOG_PATH}\n`);
      } else {
        console.log("\n  Triaging places with no editorial sources.");
        console.log("  m = manual research | s = skip | r = retry later\n");
        await runNoSourcesReview(toTriage, noSourcesLog);
      }
    } else if (args.noSourcesOnly) {
      console.log("  ✅ No unreviewed no-sources places.\n");
      return;
    }
    if (args.noSourcesOnly && !runInsufficient) return;
  }

  if (runInsufficient) {
    const reviewLog = await loadReviewLog();
    const toReview = placesWithSources.filter((item) => !reviewLog[item.place.slug]);
    if (toReview.length > 0) {
      console.log("\n╔══════════════════════════════════════════════╗");
      console.log("║  SaikoAI — Below-Threshold Review              ║");
      console.log("╚══════════════════════════════════════════════╝");
      console.log(`\n  Places with 1–${args.minSources - 1} sources (threshold: ${args.minSources}).`);
      console.log("  y=approve | n=reject | f=flag | r #=remove source | q=quit\n");
      await runRegularReview(toReview, reviewLog);
    } else {
      console.log("  ✅ No unreviewed below-threshold places.\n");
    }
    return;
  }

  // --- Regular source review mode ---
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  SaikoAI Source Review                        ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");
  console.log("  Commands:");
  console.log("    y / enter  — approve all sources");
  console.log("    n          — reject (delete source file)");
  console.log("    f          — flag for later");
  console.log("    r 2        — remove source #2, keep the rest");
  console.log("    r 1,3      — remove sources #1 and #3");
  console.log("    q          — quit (progress saved)");
  console.log("");

  const reviewLog = await loadReviewLog();

  // Find places with source files that haven't been reviewed
  const toReview: { place: Place; sources: SourceFile }[] = [];

  for (const place of places) {
    const sourceFile = path.join(SOURCES_DIR, `${place.slug}.json`);
    try {
      const raw = await fs.readFile(sourceFile, "utf-8");
      const data: SourceFile = JSON.parse(raw);

      if (args.flaggedOnly) {
        // Only show flagged items
        if (reviewLog[place.slug]?.status === "flagged") {
          toReview.push({ place, sources: data });
        }
      } else {
        // Show unreviewed items
        if (!reviewLog[place.slug]) {
          toReview.push({ place, sources: data });
        }
      }
    } catch {
      // No source file — skip
    }
  }

  const alreadyReviewed = Object.keys(reviewLog).length;
  console.log(`  ${toReview.length} to review | ${alreadyReviewed} already reviewed\n`);

  if (toReview.length === 0) {
    console.log("  ✅ Nothing to review!");
    if (args.flaggedOnly) console.log("  No flagged items.");
    return;
  }

  await runRegularReview(toReview, reviewLog);
}

main().catch((err) => {
  console.error("💥", err);
  process.exit(1);
});
