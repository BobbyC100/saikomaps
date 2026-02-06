#!/usr/bin/env npx tsx
import "dotenv/config";
/**
 * SaikoAI Batch Extraction Script
 * Reads places.json + pre-collected sources, runs extraction prompt, writes JSON per place.
 *
 * Usage:
 *   npx tsx scripts/extract.ts           # all places
 *   npx tsx scripts/extract.ts --slug maru-coffee
 *   npx tsx scripts/extract.ts --force   # overwrite existing
 *   npx tsx scripts/extract.ts --dry-run
 *   npx tsx scripts/extract.ts --verbose
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import {
  SAIKOAI_EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
} from '../lib/saikoai/prompts/place-extraction';
import type { ExtractionInput, ExtractionOutput, ExtractionSourceInput } from '../lib/saikoai/types/extraction';
import { config } from './extract.config';

const ROOT = path.resolve(process.cwd());

interface PlaceInput {
  slug: string;
  name: string;
  city: string;
  category: string;
  raw_values?: Record<string, unknown> | null;
}

interface SourcesFile {
  place_slug: string;
  sources: Array<{
    source_id: string;
    publication: string;
    title: string;
    url: string;
    published_at?: string | null;
    trust_level: 'official' | 'editorial' | 'ugc';
    content: string;
  }>;
}

function parseArgs(): { slug?: string; force: boolean; dryRun: boolean; verbose: boolean } {
  const args = process.argv.slice(2);
  let slug: string | undefined;
  let force = false;
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slug' && args[i + 1]) {
      slug = args[++i];
    } else if (args[i] === '--force') force = true;
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--verbose') verbose = true;
  }

  return { slug, force, dryRun, verbose };
}

async function loadPlaces(): Promise<PlaceInput[]> {
  const p = path.join(ROOT, config.inputDir, 'places.json');
  const raw = await fs.readFile(p, 'utf-8');
  return JSON.parse(raw);
}

async function loadSources(slug: string): Promise<SourcesFile | null> {
  const p = path.join(ROOT, config.inputDir, 'sources', `${slug}.json`);
  try {
    const raw = await fs.readFile(p, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function outputExists(slug: string): Promise<boolean> {
  const p = path.join(ROOT, config.outputDir, `${slug}.json`);
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function parseAiJson(text: string, place: PlaceInput): ExtractionOutput {
  let cleaned = text.trim();

  // Strip markdown fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // Find the outermost JSON object
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) throw new Error('No JSON object found in response');

  let depth = 0;
  let lastBrace = -1;
  for (let i = firstBrace; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) { lastBrace = i; break; }
    }
  }

  if (lastBrace === -1) throw new Error('Unterminated JSON object in response');
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  const raw = JSON.parse(cleaned);

  // Default editor hints for null fields (used by both code paths)
  const defaultHints: Record<string, string> = {
    music: 'Check Instagram stories/reels for ambient audio',
    best_time: 'Check Google Maps popular times graph',
    price_signal: 'Check Google Maps price level or recent menu photos',
    similar_energy: 'Editor judgment — suggest after visiting',
    staff_energy: 'Field visit required — not captured in reviews',
    wifi: 'Check Google Maps listing or call ahead',
    cups: 'Field visit required — check in person',
    decor: 'Check Instagram tagged photos',
    food: 'Check recent menu photos on Instagram or Google',
    seating: 'Field visit required or check Google Maps photos',
  };

  const applyDefaultHints = (claims: Array<{ field_key: string; proposed_value: unknown; notes_for_editor: string | null }>) => {
    for (const c of claims) {
      if ((c.proposed_value ?? null) == null && (c.notes_for_editor ?? null) == null) {
        c.notes_for_editor = defaultHints[c.field_key] ?? 'No sources found — manual research needed';
      }
    }
  };

  // If already in { place, claims } format, use as-is (after applying default hints for nulls)
  if (raw.place && Array.isArray(raw.claims)) {
    applyDefaultHints(raw.claims);
    return raw as ExtractionOutput;
  }

  // Otherwise transform flat field format into claims array
  const claims = Object.entries(raw)
    .filter(([k]) => k !== 'place')
    .map(([field_key, val]: [string, unknown]) => {
      const v = val as { value?: string; proposed_value?: string; confidence?: string; evidence?: Array<{ source_id: string; quote: string }>; editor_hint?: string | null; null_reason?: string | null } | string | null;
      const proposed = typeof v === 'object' && v !== null
        ? (v.proposed_value ?? v.value ?? (typeof v === 'string' ? v : null))
        : (typeof v === 'string' ? v : null);
      return {
        field_key,
        proposed_value: proposed ?? null,
        raw_value: null,
        confidence: (typeof v === 'object' && v?.confidence) || 'medium',
        confidence_reason: typeof v === 'object' && v?.confidence ? `confidence: ${v.confidence}` : 'transformed from alternate format',
        evidence: (typeof v === 'object' && v?.evidence) || [],
        method: 'search' as const,
        notes_for_editor: (typeof v === 'object' && (v?.notes_for_editor ?? v?.editor_hint ?? v?.null_reason)) ??
          (proposed == null ? (defaultHints[field_key] ?? 'No sources found — manual research needed') : null),
      };
    });

  applyDefaultHints(claims);

  return {
    place: { name: place.name, city: place.city, category: place.category },
    claims,
  };
}

async function extractPlace(place: PlaceInput, sources: ExtractionSourceInput[]): Promise<ExtractionOutput> {
  const client = new Anthropic();

  const input: ExtractionInput = {
    place: { name: place.name, city: place.city, category: place.category },
    raw_values: place.raw_values ?? null,
    sources,
  };

  const userPrompt = buildExtractionUserPrompt(input);

  const callApi = () =>
    client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: SAIKOAI_EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

  let response;
  try {
    response = await callApi();
  } catch (err) {
    const isTimeout =
      (err instanceof Error && (err.message.includes('timeout') || err.message.includes('ETIMEDOUT'))) ||
      (err as { status?: number })?.status === 504;
    if (isTimeout) {
      await new Promise((r) => setTimeout(r, 3000));
      response = await callApi();
    } else {
      throw err;
    }
  }

  const block = response.content[0];
  const text = block.type === 'text' ? block.text : '';
  console.log('--- RAW API RESPONSE (first 500 chars) ---');
  console.log(text.slice(0, 500));
  console.log('--- END RAW ---');
  return parseAiJson(text, place);
}

async function writeOutput(slug: string, result: ExtractionOutput, meta: Record<string, unknown>): Promise<void> {
  const outDir = path.join(ROOT, config.outputDir);
  await fs.mkdir(outDir, { recursive: true });

  const output = {
    ...result,
    _meta: meta,
  };

  const p = path.join(outDir, `${slug}.json`);
  await fs.writeFile(p, JSON.stringify(output, null, 2), 'utf-8');
}

async function writeError(slug: string, rawResponse: string, error: Error): Promise<void> {
  const outDir = path.join(ROOT, config.outputDir);
  await fs.mkdir(outDir, { recursive: true });

  const p = path.join(outDir, `${slug}.error.json`);
  await fs.writeFile(
    p,
    JSON.stringify(
      {
        error: error.message,
        raw_response: rawResponse,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf-8'
  );
}

async function processPlace(
  place: PlaceInput,
  opts: { force: boolean; dryRun: boolean; verbose: boolean }
): Promise<boolean> {
  const { slug, name } = place;

  const sourcesFile = await loadSources(slug);
  if (!sourcesFile || !sourcesFile.sources?.length) {
    console.warn(`⚠ Skipping ${name} (${slug}): no sources file or empty sources`);
    return false;
  }

  const exists = await outputExists(slug);
  if (exists && !opts.force) {
    console.log(`⊘ Skipping ${name} (${slug}): output exists (use --force to overwrite)`);
    return false;
  }

  if (opts.dryRun) {
    console.log(`[dry-run] Would process: ${name} (${slug}) — ${sourcesFile.sources.length} sources`);
    return true;
  }

  const start = Date.now();

  try {
    const result = await extractPlace(place, sourcesFile.sources as ExtractionSourceInput[]);

    const fieldCount = result.claims.length;
    const nullCount = result.claims.filter((c) => c.proposed_value == null).length;
    const duration = Date.now() - start;

    const meta = {
      extracted_at: new Date().toISOString(),
      model: config.model,
      prompt_version: config.promptVersion,
      source_count: sourcesFile.sources.length,
      field_count: fieldCount,
      null_count: nullCount,
      duration_ms: duration,
    };

    await writeOutput(slug, result, meta);

    console.log(
      `✓ ${name} — ${sourcesFile.sources.length} sources, ${fieldCount} fields, ${nullCount} nulls, ${duration}ms`
    );

    if (opts.verbose) {
      console.log(JSON.stringify(result, null, 2));
    }

    return true;
  } catch (err) {
    const block = (err as { response?: { content?: unknown[] } })?.response?.content?.[0];
    const rawText = block && typeof block === 'object' && 'text' in block ? String((block as { text: string }).text) : '';

    console.error(`✗ ${name} (${slug}):`, err instanceof Error ? err.message : err);
    await writeError(slug, rawText, err instanceof Error ? err : new Error(String(err)));
    return false;
  }
}

async function main(): Promise<void> {
  const { slug, force, dryRun, verbose } = parseArgs();

  if (!process.env.ANTHROPIC_API_KEY && !dryRun) {
    console.error('ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  let places: PlaceInput[];
  try {
    places = await loadPlaces();
  } catch (err) {
    console.error('Failed to load places.json:', err);
    process.exit(1);
  }

  if (slug) {
    places = places.filter((p) => p.slug === slug);
    if (places.length === 0) {
      console.error(`No place found with slug: ${slug}`);
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log(`[dry-run] Would process ${places.length} place(s)`);
  }

  let processed = 0;
  for (let i = 0; i < places.length; i++) {
    const ok = await processPlace(places[i], { force, dryRun, verbose });
    if (ok) processed++;

    if (!dryRun && i < places.length - 1) {
      await new Promise((r) => setTimeout(r, config.delayBetweenCalls));
    }
  }

  if (!dryRun) {
    console.log(`\nDone. Processed ${processed}/${places.length} places.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
