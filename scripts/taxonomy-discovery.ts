#!/usr/bin/env node
/**
 * taxonomy-discovery.ts — Classification Taxonomy Discovery
 *
 * Objective: Surface the natural functional roles already present in the dataset
 * in order to design a stable v1 classification taxonomy for Traces.
 *
 * This script does NOT generate labels automatically.
 * It analyzes the dataset to reveal natural clusters of use.
 *
 * Steps:
 *   1. Pull a stratified sample of ~150 places from the DB
 *   2. Format structured profiles from raw signals
 *   3. Send to Claude for:
 *      a. Functional role inference per place
 *      b. Cluster analysis
 *      c. Proposed taxonomy (10-15 labels)
 *      d. Coverage metrics
 *      e. Notes on ambiguous cases
 *   4. Write output to data/reports/taxonomy-discovery-{timestamp}.md
 *
 * Usage:
 *   npm run tsx:env scripts/taxonomy-discovery.ts
 *   npm run tsx:env scripts/taxonomy-discovery.ts --limit 100
 *   npm run tsx:env scripts/taxonomy-discovery.ts --outdir data/reports
 */

import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getFlag(name: string, fallback: string): string {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1]!;
  return fallback;
}

const LIMIT = parseInt(getFlag('--limit', '150'), 10);
const OUT_DIR = getFlag('--outdir', 'data/reports');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PlaceSample {
  id: string;
  name: string;
  category: string | null;
  primary_vertical: string;
  cuisine_type: string | null;
  price_level: number | null;
  reservation_url: string | null;
  hours: unknown;
  neighborhood: string | null;
  website: string | null;
  description: string | null;
  editorial_sources: unknown;
  vibe_tags: string[];
  intent_profile: string | null;
  google_types: string[];
  // Tag scores (SceneSense-like signals)
  tag_scores: {
    cozy_score: number | null;
    date_night_score: number | null;
    late_night_score: number | null;
    after_work_score: number | null;
    scene_score: number | null;
  } | null;
  // Merchant signals
  merchant: {
    menu_url: string | null;
    reservation_url: string | null;
    inferred_category: string | null;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Pull — stratified sample across verticals + price bands
// ─────────────────────────────────────────────────────────────────────────────

async function pullSample(limit: number): Promise<PlaceSample[]> {
  console.log(`\nPulling stratified sample (target: ${limit} places)...`);

  // Pull more than needed to allow stratification, then trim
  const oversample = Math.min(limit * 3, 500);

  const raw = await db.entities.findMany({
    where: {
      status: 'OPEN',
      // Prefer enriched places with more signals
      OR: [
        { description: { not: null } },
        { vibeTags: { isEmpty: false } },
        { category: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      category: true,
      primary_vertical: true,
      cuisineType: true,
      priceLevel: true,
      reservationUrl: true,
      hours: true,
      neighborhood: true,
      website: true,
      description: true,
      editorialSources: true,
      vibeTags: true,
      intentProfile: true,
      googleTypes: true,
      energy_scores: {
        select: { energy_score: true, version: true },
        orderBy: { computed_at: 'desc' },
        take: 1,
      },
      entity_tag_scores: {
        select: {
          cozy_score: true,
          date_night_score: true,
          late_night_score: true,
          after_work_score: true,
          scene_score: true,
          version: true,
        },
        orderBy: { computed_at: 'desc' },
        take: 1,
      },
      merchant_signals: {
        select: {
          menu_url: true,
          reservation_url: true,
          inferred_category: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: oversample,
  });

  // Stratify: spread across primary_verticals
  const byVertical = new Map<string, typeof raw>();
  for (const p of raw) {
    const v = p.primary_vertical;
    if (!byVertical.has(v)) byVertical.set(v, []);
    byVertical.get(v)!.push(p);
  }

  const verticals = [...byVertical.keys()];
  const perVertical = Math.ceil(limit / verticals.length);
  const selected: typeof raw = [];

  for (const v of verticals) {
    const bucket = byVertical.get(v)!;
    // Shuffle within bucket for variety
    const shuffled = bucket.sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, perVertical));
    if (selected.length >= limit * 1.2) break;
  }

  // Trim to limit
  const trimmed = selected.slice(0, limit);

  console.log(`  Pulled ${trimmed.length} places across ${verticals.length} vertical(s)`);
  console.log(`  Verticals: ${verticals.join(', ')}`);

  return trimmed.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    primary_vertical: p.primary_vertical,
    cuisine_type: p.cuisineType,
    price_level: p.priceLevel,
    reservation_url: p.reservationUrl,
    hours: p.hours,
    neighborhood: p.neighborhood,
    website: p.website ? '(present)' : null,
    description: p.description,
    editorial_sources: p.editorialSources,
    vibe_tags: p.vibeTags,
    intent_profile: p.intentProfile,
    google_types: p.googleTypes,
    tag_scores: p.entity_tag_scores[0]
      ? {
          cozy_score: p.entity_tag_scores[0].cozy_score,
          date_night_score: p.entity_tag_scores[0].date_night_score,
          late_night_score: p.entity_tag_scores[0].late_night_score,
          after_work_score: p.entity_tag_scores[0].after_work_score,
          scene_score: p.entity_tag_scores[0].scene_score,
        }
      : null,
    merchant: p.merchant_signals
      ? {
          menu_url: p.merchant_signals.menu_url ? '(present)' : null,
          reservation_url: p.merchant_signals.reservation_url,
          inferred_category: p.merchant_signals.inferred_category,
        }
      : null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Formatter — deterministic, no AI
// Converts raw DB row → compact structured profile string
// ─────────────────────────────────────────────────────────────────────────────

function formatHoursPattern(hours: unknown): string {
  if (!hours) return 'unknown';
  try {
    const h = hours as Record<string, { open: { time: string }[]; close: { time: string }[] }[]>;
    const periods = Object.values(h).flat();
    const hasMidnight = periods.some((p) =>
      p?.close?.some((c) => {
        const t = parseInt(c?.time ?? '0', 10);
        return t >= 2200 || t <= 200;
      })
    );
    const hasLunch = periods.some((p) =>
      p?.open?.some((o) => {
        const t = parseInt(o?.time ?? '0', 10);
        return t >= 1100 && t <= 1300;
      })
    );
    const days = Object.keys(h).length;
    const parts = [];
    if (days >= 7) parts.push('7-day');
    else if (days >= 5) parts.push('5-6 day');
    else parts.push('limited-days');
    if (hasLunch) parts.push('lunch');
    if (hasMidnight) parts.push('late-night');
    return parts.join(', ') || 'standard';
  } catch {
    return 'unknown';
  }
}

function scoreLabel(score: number | null | undefined): string {
  if (score == null) return 'n/a';
  if (score >= 0.7) return `high (${score.toFixed(2)})`;
  if (score >= 0.4) return `mid (${score.toFixed(2)})`;
  return `low (${score.toFixed(2)})`;
}

function formatProfile(p: PlaceSample, index: number): string {
  const lines: string[] = [
    `--- PLACE ${index + 1} ---`,
    `name: ${p.name}`,
    `vertical: ${p.primary_vertical}`,
    `category: ${p.category ?? 'unset'}`,
    `cuisine: ${p.cuisine_type ?? 'n/a'}`,
    `price_band: ${p.price_level ? '$'.repeat(p.price_level) : 'unknown'}`,
    `neighborhood: ${p.neighborhood ?? 'unknown'}`,
    `reservation_url: ${p.reservation_url ?? p.merchant?.reservation_url ?? 'none'}`,
    `hours_pattern: ${formatHoursPattern(p.hours)}`,
    `website: ${p.website ?? 'none'}`,
    `menu_url: ${p.merchant?.menu_url ?? 'none'}`,
    `intent_profile: ${p.intent_profile ?? 'unset'}`,
  ];

  if (p.vibe_tags.length > 0) {
    lines.push(`vibe_tags: ${p.vibe_tags.join(', ')}`);
  }
  if (p.google_types.length > 0) {
    lines.push(`google_types: ${p.google_types.slice(0, 5).join(', ')}`);
  }
  if (p.merchant?.inferred_category) {
    lines.push(`inferred_category: ${p.merchant.inferred_category}`);
  }
  if (p.description) {
    const desc = p.description.length > 200 ? p.description.slice(0, 200) + '…' : p.description;
    lines.push(`description: ${desc}`);
  }

  if (p.tag_scores) {
    lines.push(
      `scene_score: ${scoreLabel(p.tag_scores.scene_score)}`,
      `date_night_score: ${scoreLabel(p.tag_scores.date_night_score)}`,
      `cozy_score: ${scoreLabel(p.tag_scores.cozy_score)}`,
      `late_night_score: ${scoreLabel(p.tag_scores.late_night_score)}`,
      `after_work_score: ${scoreLabel(p.tag_scores.after_work_score)}`
    );
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude Analysis — the five-step taxonomy discovery prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a data analyst helping a food and lifestyle media company design a classification taxonomy for their restaurant and venue database. 

Your job is NOT to invent categories. Your job is to surface the natural functional roles that are already present in the data.

A good classification label must pass the "sentence test":
"This place is good for ____."
If a label fits naturally in that sentence, it is a good one.

You must stay disciplined: no more than 15 final labels, no vague categories like "restaurant", no invented taxonomy unrelated to the data.`;

function buildAnalysisPrompt(profiles: string[], sampleSize: number): string {
  return `You are analyzing a dataset of ${sampleSize} food and drink places in Los Angeles.

The goal: identify the natural functional roles places currently serve, in order to design a stable v1 classification taxonomy.

Below are structured profiles for each place. Work through the following five steps.

---

PLACE PROFILES:

${profiles.join('\n\n')}

---

STEP 1 — FUNCTIONAL ROLE INFERENCE

For each place, assign 1–3 functional roles that describe how it is likely used.
Think in terms of: who goes there, when, and why.

Example roles (use these as inspiration, not a fixed list):
quick bite, date night, group dinner, destination dining, neighborhood staple,
industry hang, walk-in friendly, solo dining, late night, casual meetup,
plan ahead, scene spot, coffee break, wine bar crawl, weekend brunch

Output a compact list:
[PLACE NAME] → [role 1], [role 2], [role 3]

STEP 2 — CLUSTER ANALYSIS

After reviewing all role assignments, cluster the roles into groups.
Each cluster should represent a coherent use-case archetype.
Target: 5–8 clusters.

Output format:
CLUSTER [Letter] — [Cluster Name]
  - [role a]
  - [role b]
  - ...

STEP 3 — PROPOSED TAXONOMY

From the clusters, propose a final taxonomy of 10–15 labels.

Structure the labels in 3 operational categories:
  Operational: how the place works (walk-in vs reservation, quick vs leisurely)
  Occasion: what brings people there (date, group, solo, work)
  Cultural: what kind of scene/identity (neighborhood staple, industry hang, destination)

Apply the sentence test to each label: "This place is good for ____."
Remove any label that does not fit naturally.

STEP 4 — COVERAGE METRICS

For each proposed label, estimate:
  - How many places in the sample (%) would receive that label
  - Whether the label is strong (>15%), moderate (5–15%), or weak (<5%)
  - Recommend removing weak labels if they add no differentiation

Output:
| Label | Estimated % | Strength | Keep? |
|-------|-------------|----------|-------|
...

STEP 5 — DATASET SUMMARY + AMBIGUOUS CASES

Summarize:
  1. What the sample looks like overall (dominant verticals, price distribution, neighborhoods)
  2. Any labels that were hard to assign or caused ambiguity
  3. Places that don't fit the taxonomy cleanly — what would improve the taxonomy to cover them

---

Return your full analysis in clearly labeled sections.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const anthropic = new Anthropic();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TAXONOMY DISCOVERY — Classification Analysis');
  console.log(`  ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Pull sample ────────────────────────────────────────────────────────
  const places = await pullSample(LIMIT);

  if (places.length === 0) {
    console.error('No places found. Check DB connection and filters.');
    process.exit(1);
  }

  // ── 2. Format profiles ───────────────────────────────────────────────────
  console.log('\nFormatting structured profiles...');
  const profiles = places.map((p, i) => formatProfile(p, i));

  // Quick dataset summary for console
  const verticalCounts = new Map<string, number>();
  const priceCounts = new Map<string, number>();
  for (const p of places) {
    verticalCounts.set(p.primary_vertical, (verticalCounts.get(p.primary_vertical) ?? 0) + 1);
    const band = p.price_level ? '$'.repeat(p.price_level) : 'unknown';
    priceCounts.set(band, (priceCounts.get(band) ?? 0) + 1);
  }

  console.log('\n  Sample breakdown:');
  for (const [v, count] of [...verticalCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${v.padEnd(14)} ${count}`);
  }
  console.log('\n  Price distribution:');
  for (const [band, count] of [...priceCounts.entries()].sort()) {
    console.log(`    ${band.padEnd(10)} ${count}`);
  }

  const withTagScores = places.filter((p) => p.tag_scores !== null).length;
  const withVibeTags = places.filter((p) => p.vibe_tags.length > 0).length;
  const withDescription = places.filter((p) => p.description).length;
  const withReservation = places.filter((p) => p.reservation_url || p.merchant?.reservation_url).length;

  console.log('\n  Signal coverage:');
  console.log(`    Tag scores (SceneSense)  ${withTagScores}/${places.length}`);
  console.log(`    Vibe tags                ${withVibeTags}/${places.length}`);
  console.log(`    Descriptions             ${withDescription}/${places.length}`);
  console.log(`    Reservation URL          ${withReservation}/${places.length}`);

  // ── 3. Claude analysis ────────────────────────────────────────────────────
  console.log('\nSending to Claude for taxonomy analysis...');
  console.log('  (This may take 30–60 seconds for a full dataset)');

  const userPrompt = buildAnalysisPrompt(profiles, places.length);

  let analysisText: string;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in Claude response');
    }
    analysisText = textBlock.text;
    console.log(`\n  Tokens used: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`);
  } catch (err) {
    console.error('\nClaude API error:', err);
    process.exit(1);
  }

  // ── 4. Write output ───────────────────────────────────────────────────────
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const outPath = path.join(OUT_DIR, `taxonomy-discovery-${timestamp}.md`);

  const header = [
    '# Taxonomy Discovery Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Sample size:** ${places.length} places`,
    `**Verticals:** ${[...verticalCounts.keys()].join(', ')}`,
    '',
    '## Dataset Sample Summary',
    '',
    '### Vertical Distribution',
    '',
    [...verticalCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([v, count]) => `- ${v}: ${count} (${Math.round((count / places.length) * 100)}%)`)
      .join('\n'),
    '',
    '### Price Distribution',
    '',
    [...priceCounts.entries()]
      .sort()
      .map(([band, count]) => `- ${band || '(unknown)'}: ${count}`)
      .join('\n'),
    '',
    '### Signal Coverage',
    '',
    `- Tag scores (SceneSense): ${withTagScores}/${places.length} (${Math.round((withTagScores / places.length) * 100)}%)`,
    `- Vibe tags: ${withVibeTags}/${places.length} (${Math.round((withVibeTags / places.length) * 100)}%)`,
    `- Descriptions: ${withDescription}/${places.length} (${Math.round((withDescription / places.length) * 100)}%)`,
    `- Reservation URL: ${withReservation}/${places.length} (${Math.round((withReservation / places.length) * 100)}%)`,
    '',
    '---',
    '',
    '## Claude Analysis',
    '',
  ].join('\n');

  const footer = [
    '',
    '---',
    '',
    '## Raw Place Profiles (Input)',
    '',
    '```',
    profiles.join('\n\n'),
    '```',
  ].join('\n');

  fs.writeFileSync(outPath, header + analysisText + footer, 'utf-8');

  console.log(`\n  Output written to: ${outPath}`);
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TAXONOMY DISCOVERY COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Taxonomy discovery failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
