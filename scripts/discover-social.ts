#!/usr/bin/env npx tsx
/**
 * Social Discovery — OpenAI-powered web search for Instagram handles & websites.
 *
 * Uses GPT-4.1-mini + web_search_preview tool to find official Instagram handles and
 * websites for entities that are missing them.
 *
 * Usage:
 *   npx tsx scripts/discover-social.ts --mode=instagram --limit=5 --dry-run
 *   npx tsx scripts/discover-social.ts --mode=website --limit=10
 *   npx tsx scripts/discover-social.ts --mode=both --slug=some-entity
 *   npx tsx scripts/discover-social.ts --mode=instagram --limit=50
 *
 * Options:
 *   --mode=instagram|website|both   What to discover (required)
 *   --slug=<slug>                   Single entity (default: batch all missing)
 *   --limit=N                       Max entities per run (default 50)
 *   --dry-run                       Print results, no DB writes
 *   --delay=N                       Seconds between calls (default 2)
 *   --verbose                       Show full response details
 */

import 'dotenv/config';
import OpenAI from 'openai';

// Prisma client — load-env.js handles DATABASE_URL before this import
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = 'gpt-4.1-mini';
const DEFAULT_DELAY_MS = 2000;
const DEFAULT_LIMIT = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Entity {
  id: string;
  slug: string;
  name: string;
  neighborhood: string | null;
  category: string | null;
  website: string | null;
  instagram: string | null;
}

interface DiscoveryResult {
  entityId: string;
  entityName: string;
  slug: string;
  mode: 'instagram' | 'website';
  discovered: string | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  action: 'set' | 'skipped_low_conf' | 'skipped_dry_run' | 'already_set' | 'not_found' | 'error';
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let mode: 'instagram' | 'website' | 'both' = 'instagram';
  let slug = '';
  let limit = DEFAULT_LIMIT;
  let dryRun = false;
  let delayMs = DEFAULT_DELAY_MS;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--mode=')) mode = arg.split('=')[1] as any;
    else if (arg.startsWith('--slug=')) slug = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) limit = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--delay=')) delayMs = parseInt(arg.split('=')[1], 10) * 1000;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--verbose' || arg === '-v') verbose = true;
  }

  if (!['instagram', 'website', 'both'].includes(mode)) {
    console.error('Usage: npx tsx scripts/discover-social.ts --mode=instagram|website|both');
    process.exit(1);
  }

  return { mode, slug, limit, dryRun, delayMs, verbose };
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function buildInstagramPrompt(entity: Entity): string {
  const city = 'Los Angeles';
  const neighborhood = entity.neighborhood ? ` (${entity.neighborhood})` : '';
  const category = entity.category ?? 'restaurant';

  return `You are a social media researcher. Find the official Instagram handle for this ${category} in ${city}.

Rules:
- Only return the OFFICIAL account for this specific business — not fan pages, food bloggers, or similarly-named businesses
- The handle must be an active Instagram account that belongs to the business
- If the name is generic (e.g. "La Fe"), require strong evidence of an exact match (location, posts about the business)
- Prefer accounts that post photos of their food/space and match the location
- If you find multiple possible accounts, pick the one most likely to be official
- If you cannot confidently identify the official account, say so

Search for "${entity.name} ${city} instagram" and "${entity.name} ${entity.neighborhood ?? city}" on Instagram. Check their website if available for social links.

**Name:** ${entity.name}
**Location:** ${city}${neighborhood}
**Category:** ${category}
${entity.website ? `**Website:** ${entity.website}` : ''}

You MUST return ONLY a JSON object with no other text before or after it:
{"instagram_handle": "@handle or null", "confidence": "high or medium or low", "source_url": "URL or null", "reasoning": "brief explanation"}

If you cannot find the handle, return: {"instagram_handle": null, "confidence": "low", "source_url": null, "reasoning": "why not found"}`;
}

function buildWebsitePrompt(entity: Entity): string {
  const city = 'Los Angeles';
  const neighborhood = entity.neighborhood ? ` (${entity.neighborhood})` : '';
  const category = entity.category ?? 'restaurant';

  return `You are a web researcher. Find the official website for this ${category} in ${city}.

Rules:
- Only return the OFFICIAL website for this specific business
- NEVER return aggregator URLs: no yelp.com, doordash.com, ubereats.com, grubhub.com, tripadvisor.com, google.com
- Acceptable: the business's own domain, or their page on a platform they control (e.g. squarespace, wix, their resy page if no standalone site)
- If the business only has social media and no website, return null
- If you find a domain that redirects to an ordering platform, that's acceptable if it's their own domain

Search for "${entity.name} ${city} ${category}" and "${entity.name} ${entity.neighborhood ?? city} official website".

**Name:** ${entity.name}
**Location:** ${city}${neighborhood}
**Category:** ${category}

You MUST return ONLY a JSON object with no other text before or after it:
{"website_url": "https://... or null", "confidence": "high or medium or low", "source_url": "URL or null", "reasoning": "brief explanation"}

If you cannot find the website, return: {"website_url": null, "confidence": "low", "source_url": null, "reasoning": "why not found"}`;
}

// ---------------------------------------------------------------------------
// Handle cleaning (same logic as backfill-instagram-handles.ts)
// ---------------------------------------------------------------------------

function cleanHandle(raw: string): string | null {
  if (!raw) return null;
  let h = raw.trim();

  // Full URL → extract username
  if (h.includes('instagram.com/')) {
    if (/instagram\.com\/(p|reel|reels|stories|explore|tv|ar)\//i.test(h)) return null;
    const match = h.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (match) h = match[1];
    else return null;
  }

  h = h.replace(/^@/, '').replace(/\/$/, '').trim();
  if (!h) return null;
  if (!/^[a-zA-Z0-9._]+$/.test(h)) return null;
  if (h.toLowerCase() === 'none' || h.toLowerCase() === 'null') return null;

  return h;
}

function cleanUrl(raw: string): string | null {
  if (!raw) return null;
  let url = raw.trim();

  // Reject aggregators
  const blocked = ['yelp.com', 'doordash.com', 'ubereats.com', 'grubhub.com', 'tripadvisor.com', 'google.com', 'facebook.com', 'instagram.com'];
  for (const domain of blocked) {
    if (url.includes(domain)) return null;
  }

  // Ensure https
  if (!url.startsWith('http')) url = 'https://' + url;

  return url;
}

// ---------------------------------------------------------------------------
// OpenAI web_search call via Responses API
// ---------------------------------------------------------------------------

async function discover(
  client: OpenAI,
  entity: Entity,
  mode: 'instagram' | 'website',
  verbose: boolean,
): Promise<DiscoveryResult> {
  const prompt = mode === 'instagram' ? buildInstagramPrompt(entity) : buildWebsitePrompt(entity);
  const start = Date.now();

  try {
    const response = await client.responses.create({
      model: MODEL,
      tools: [{ type: 'web_search_preview' }],
      input: prompt,
    });

    const timeMs = Date.now() - start;

    // Extract text from output items
    // The Responses API returns different item types: 'message' (with content[].text),
    // and top-level 'output_text' items. Handle both.
    let fullText = '';
    for (const item of response.output as any[]) {
      if (item.type === 'message') {
        for (const c of item.content ?? []) {
          if (c.type === 'output_text') fullText += c.text + '\n';
          if (c.type === 'text') fullText += c.text + '\n';
        }
      } else if (item.type === 'output_text') {
        fullText += item.text + '\n';
      }
    }
    fullText = fullText.trim();

    if (verbose) {
      const searches = response.output.filter((item: any) => item.type === 'web_search_call').length;
      const types = (response.output as any[]).map((i: any) => i.type).join(', ');
      console.log(`    [${timeMs}ms | ${searches} searches | types: ${types}]`);
      if (!fullText) {
        const msgItems = (response.output as any[]).filter((i: any) => i.type === 'message');
        for (const m of msgItems) {
          console.log(`    DEBUG message.content: ${JSON.stringify(m.content).slice(0, 500)}`);
        }
      }
    }

    // Extract JSON from response
    // Try to find JSON in code fences first, then bare JSON
    let jsonStr: string | null = null;
    const fenceMatch = fullText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const jsonMatch = fullText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
    }

    if (!jsonStr) {
      // Model responded in prose without JSON — check if it's a "not found" response
      const lower = fullText.toLowerCase();
      if (lower.includes("couldn't find") || lower.includes('could not find') || lower.includes('unable to find') || lower.includes('no official') || lower.includes('not find')) {
        return { entityId: entity.id, entityName: entity.name, slug: entity.slug, mode, discovered: null, confidence: 'low', reasoning: 'Model could not find handle (prose response)', action: 'not_found' };
      }
      console.log(`    WARNING: No JSON in response for ${entity.name}`);
      if (verbose) console.log(`    RESPONSE TEXT: ${fullText.slice(0, 300)}`);
      return { entityId: entity.id, entityName: entity.name, slug: entity.slug, mode, discovered: null, confidence: 'low', reasoning: 'No JSON in response', action: 'error' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try more aggressive extraction
      const start = fullText.indexOf('{');
      const end = fullText.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(fullText.slice(start, end + 1)); } catch { /* fall through */ }
      }
      if (!parsed) {
        console.log(`    WARNING: JSON parse failed for ${entity.name}`);
        return { entityId: entity.id, entityName: entity.name, slug: entity.slug, mode, discovered: null, confidence: 'low', reasoning: 'JSON parse failed', action: 'error' };
      }
    }

    const confidence = parsed.confidence ?? 'low';
    const reasoning = parsed.reasoning ?? '';

    if (mode === 'instagram') {
      const raw = parsed.instagram_handle;
      const handle = raw ? cleanHandle(raw) : null;
      if (!handle) {
        return { entityId: entity.id, entityName: entity.name, slug: entity.slug, mode, discovered: null, confidence, reasoning: reasoning || 'No handle found', action: 'not_found' };
      }
      return { entityId: entity.id, entityName: entity.name, slug: entity.slug, mode, discovered: handle, confidence, reasoning, action: confidence === 'high' || confidence === 'medium' ? 'set' : 'skipped_low_conf' };
    } else {
      const raw = parsed.website_url;
      const url = raw ? cleanUrl(raw) : null;
      if (!url) {
        return { entityId: entity.id, entityName: entity.name, slug: entity.slug, mode, discovered: null, confidence, reasoning: reasoning || 'No website found', action: 'not_found' };
      }
      return { entityId: entity.id, entityName: entity.name, slug: entity.slug, mode, discovered: url, confidence, reasoning, action: confidence === 'high' || confidence === 'medium' ? 'set' : 'skipped_low_conf' };
    }
  } catch (err: any) {
    console.error(`    ERROR for ${entity.name}: ${err.status ?? ''} ${err.message}`);
    return { entityId: entity.id, entityName: entity.name, slug: entity.slug, mode, discovered: null, confidence: 'low', reasoning: err.message, action: 'error' };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { mode, slug, limit, dryRun, delayMs, verbose } = parseArgs();

  console.log(`[Discover Social] mode=${mode} limit=${limit} dryRun=${dryRun} delay=${delayMs}ms model=${MODEL}`);

  if (!OPENAI_API_KEY) {
    console.error('[Discover Social] OPENAI_API_KEY not set');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const modes: ('instagram' | 'website')[] = mode === 'both' ? ['instagram', 'website'] : [mode as 'instagram' | 'website'];

  for (const currentMode of modes) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Discovering: ${currentMode.toUpperCase()}`);
    console.log(`${'='.repeat(60)}\n`);

    // Query entities missing this field
    let where: any;
    if (slug) {
      where = { slug };
    } else if (currentMode === 'instagram') {
      // Find entities where instagram is null or empty (exclude 'NONE' = confirmed no IG)
      where = { instagram: null };
    } else {
      where = { website: null };
    }

    const entities: Entity[] = await db.entities.findMany({
      where,
      select: { id: true, slug: true, name: true, neighborhood: true, category: true, website: true, instagram: true },
      orderBy: { name: 'asc' },
      take: limit,
    });

    console.log(`Found ${entities.length} entities missing ${currentMode}\n`);

    if (entities.length === 0) continue;

    const results: DiscoveryResult[] = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      console.log(`  [${i + 1}/${entities.length}] ${entity.name} (${entity.slug})`);

      // Skip if already has data (relevant for --slug with --mode=both)
      if (currentMode === 'instagram' && entity.instagram && entity.instagram !== '' && entity.instagram !== 'NONE') {
        console.log(`    SKIP: already has IG handle: ${entity.instagram}`);
        results.push({ entityId: entity.id, entityName: entity.name, slug: entity.slug, mode: currentMode, discovered: entity.instagram, confidence: 'high', reasoning: 'Already set', action: 'already_set' });
        continue;
      }
      if (currentMode === 'website' && entity.website && entity.website !== '') {
        console.log(`    SKIP: already has website: ${entity.website}`);
        results.push({ entityId: entity.id, entityName: entity.name, slug: entity.slug, mode: currentMode, discovered: entity.website, confidence: 'high', reasoning: 'Already set', action: 'already_set' });
        continue;
      }

      const result = await discover(client, entity, currentMode, verbose);

      if (result.discovered) {
        console.log(`    FOUND: ${result.discovered} (${result.confidence})`);
      } else {
        console.log(`    NOT FOUND: ${result.reasoning}`);
      }

      // Write to DB if confidence is high or medium and not dry-run
      if (result.action === 'set') {
        if (dryRun) {
          result.action = 'skipped_dry_run';
          console.log(`    DRY RUN: would set ${currentMode} = ${result.discovered}`);
        } else {
          const data: any = {};
          if (currentMode === 'instagram') data.instagram = result.discovered;
          else data.website = result.discovered;

          await db.entities.update({ where: { id: entity.id }, data });
          console.log(`    SAVED: ${currentMode} = ${result.discovered}`);
        }
      }

      results.push(result);

      // Rate limit between calls
      if (i < entities.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    // Summary
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${currentMode.toUpperCase()} RESULTS`);
    console.log(`${'─'.repeat(60)}`);

    const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);
    console.log(`  ${pad('ENTITY', 30)} ${pad('DISCOVERED', 25)} ${pad('CONF', 8)} ACTION`);
    console.log(`  ${'═'.repeat(75)}`);

    let setCount = 0, notFound = 0, errors = 0, skipped = 0;

    for (const r of results) {
      const display = r.discovered ?? '—';
      console.log(`  ${pad(r.entityName, 30)} ${pad(display, 25)} ${pad(r.confidence, 8)} ${r.action}`);
      if (r.action === 'set') setCount++;
      else if (r.action === 'not_found') notFound++;
      else if (r.action === 'error') errors++;
      else skipped++;
    }

    console.log(`\n  Total: ${results.length} | Set: ${setCount} | Not found: ${notFound} | Skipped: ${skipped} | Errors: ${errors}`);
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error('[Discover Social] Fatal:', err);
  process.exit(1);
});
