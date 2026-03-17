#!/usr/bin/env node
/**
 * discover-social.ts
 *
 * Batch social discovery using Claude Haiku + web_search.
 * Finds Instagram, TikTok, and/or website handles for entities missing them.
 *
 * Usage:
 *   npx tsx scripts/discover-social.ts --mode=instagram --limit=50
 *   npx tsx scripts/discover-social.ts --mode=tiktok --limit=50
 *   npx tsx scripts/discover-social.ts --mode=website --limit=50
 *   npx tsx scripts/discover-social.ts --mode=instagram --dry-run --limit=10
 *
 * Options:
 *   --mode=instagram|tiktok|website   Required. Which handle to discover.
 *   --limit=N                         Max entities to process (default: 50)
 *   --dry-run                         Preview without writing claims
 *   --concurrency=N                   Parallel requests (default: 3)
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { PrismaClient, Prisma } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { writeClaimAndSanction } from '@/lib/fields-v2/write-claim';

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const modeArg = process.argv.find((a) => a.startsWith('--mode='));
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='));
const isDryRun = process.argv.includes('--dry-run');

const mode = modeArg?.split('=')[1] as 'instagram' | 'tiktok' | 'website' | undefined;
if (!mode || !['instagram', 'tiktok', 'website'].includes(mode)) {
  console.error('Usage: --mode=instagram|tiktok|website');
  process.exit(1);
}

const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;
const concurrency = concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : 3;

// ---------------------------------------------------------------------------
// Handle cleaning (mirrors route.ts logic)
// ---------------------------------------------------------------------------

function cleanHandle(raw: string): string | null {
  if (!raw) return null;
  let h = raw.trim();
  if (h.includes('instagram.com/')) {
    if (/instagram\.com\/(p|reel|reels|stories|explore|tv|ar)\//i.test(h)) return null;
    const match = h.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (match) h = match[1];
    else return null;
  }
  h = h.replace(/^@/, '').replace(/\/$/, '').trim();
  if (!h || !/^[a-zA-Z0-9._]+$/.test(h)) return null;
  if (h.toLowerCase() === 'none' || h.toLowerCase() === 'null') return null;
  return h;
}

function cleanTiktokHandle(raw: string): string | null {
  if (!raw) return null;
  let h = raw.trim();
  if (h.includes('tiktok.com/@')) {
    const match = h.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
    if (match) h = match[1];
    else return null;
  }
  h = h.replace(/^@/, '').replace(/\/$/, '').trim();
  if (!h || !/^[a-zA-Z0-9._]+$/.test(h)) return null;
  if (h.toLowerCase() === 'none' || h.toLowerCase() === 'null') return null;
  return h;
}

function cleanUrl(raw: string): string | null {
  if (!raw) return null;
  let url = raw.trim();
  const blocked = ['yelp.com', 'doordash.com', 'ubereats.com', 'grubhub.com', 'tripadvisor.com', 'google.com', 'facebook.com', 'instagram.com'];
  for (const domain of blocked) {
    if (url.includes(domain)) return null;
  }
  if (!url.startsWith('http')) url = 'https://' + url;
  return url;
}

// ---------------------------------------------------------------------------
// Discovery function
// ---------------------------------------------------------------------------

async function discoverOne(
  client: Anthropic,
  entity: { id: string; slug: string; name: string; neighborhood: string | null; category: string | null; website: string | null },
): Promise<{ slug: string; discovered: string | null; confidence: string; reasoning: string; saved: boolean }> {
  const city = 'Los Angeles';
  const neighborhood = entity.neighborhood ? ` (${entity.neighborhood})` : '';
  const category = entity.category ?? 'restaurant';

  let system: string;
  let user: string;

  if (mode === 'instagram') {
    system = `You are a social media researcher. Find the official Instagram handle for a specific ${category} in ${city}.
Rules: Only return the OFFICIAL account. Not fan pages or food bloggers. If unsure, say so.
Return JSON (no markdown fences): { "instagram_handle": "@handle" or null, "confidence": "high"|"medium"|"low", "reasoning": "brief explanation" }`;
    user = `Find the official Instagram handle for: ${entity.name}, ${city}${neighborhood}, ${category}. ${entity.website ? `Website: ${entity.website}` : ''}`;
  } else if (mode === 'tiktok') {
    system = `You are a social media researcher. Find the official TikTok handle for a specific ${category} in ${city}.
Rules: Only return the OFFICIAL account. Not fan pages or food bloggers. If unsure, say so.
Return JSON (no markdown fences): { "tiktok_handle": "@handle" or null, "confidence": "high"|"medium"|"low", "reasoning": "brief explanation" }`;
    user = `Find the official TikTok handle for: ${entity.name}, ${city}${neighborhood}, ${category}. ${entity.website ? `Website: ${entity.website}` : ''}`;
  } else {
    system = `You are a web researcher. Find the official website for a specific ${category} in ${city}.
Rules: Only the OFFICIAL website. Never yelp, doordash, ubereats, grubhub, tripadvisor, google.
Return JSON (no markdown fences): { "website_url": "https://..." or null, "confidence": "high"|"medium"|"low", "reasoning": "brief explanation" }`;
    user = `Find the official website for: ${entity.name}, ${city}${neighborhood}, ${category}.`;
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' } as any],
      messages: [{ role: 'user', content: user }],
    });

    const textBlocks = response.content.filter((b: any) => b.type === 'text');
    const fullText = textBlocks.map((b: any) => b.text).join('\n');

    const jsonMatch = fullText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return { slug: entity.slug, discovered: null, confidence: 'low', reasoning: 'No JSON in response', saved: false };

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      const start = fullText.indexOf('{');
      const end = fullText.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(fullText.slice(start, end + 1)); } catch { /* */ }
      }
      if (!parsed) return { slug: entity.slug, discovered: null, confidence: 'low', reasoning: 'JSON parse failed', saved: false };
    }

    const confidence = parsed.confidence ?? 'low';
    const reasoning = parsed.reasoning ?? '';
    const confidenceNum = confidence === 'high' ? 0.95 : confidence === 'medium' ? 0.80 : 0.50;

    const claimBase = {
      entityId: entity.id,
      sourceId: 'operator_website',
      extractionMethod: 'AI_EXTRACT' as const,
      confidence: confidenceNum,
      resolutionMethod: 'SLUG_EXACT' as const,
    };

    if (mode === 'instagram') {
      const handle = parsed.instagram_handle ? cleanHandle(parsed.instagram_handle) : null;
      if (!handle) return { slug: entity.slug, discovered: null, confidence, reasoning: reasoning || 'No handle found', saved: false };
      if ((confidence === 'high' || confidence === 'medium') && !isDryRun) {
        await writeClaimAndSanction(db as any, { ...claimBase, attributeKey: 'instagram', rawValue: handle });
        return { slug: entity.slug, discovered: handle, confidence, reasoning, saved: true };
      }
      return { slug: entity.slug, discovered: handle, confidence, reasoning, saved: false };
    } else if (mode === 'tiktok') {
      const handle = parsed.tiktok_handle ? cleanTiktokHandle(parsed.tiktok_handle) : null;
      if (!handle) return { slug: entity.slug, discovered: null, confidence, reasoning: reasoning || 'No handle found', saved: false };
      if ((confidence === 'high' || confidence === 'medium') && !isDryRun) {
        await writeClaimAndSanction(db as any, { ...claimBase, attributeKey: 'tiktok', rawValue: handle });
        return { slug: entity.slug, discovered: handle, confidence, reasoning, saved: true };
      }
      return { slug: entity.slug, discovered: handle, confidence, reasoning, saved: false };
    } else {
      const url = parsed.website_url ? cleanUrl(parsed.website_url) : null;
      if (!url) return { slug: entity.slug, discovered: null, confidence, reasoning: reasoning || 'No website found', saved: false };
      if ((confidence === 'high' || confidence === 'medium') && !isDryRun) {
        await writeClaimAndSanction(db as any, { ...claimBase, attributeKey: 'website', rawValue: url });
        return { slug: entity.slug, discovered: url, confidence, reasoning, saved: true };
      }
      return { slug: entity.slug, discovered: url, confidence, reasoning, saved: false };
    }
  } catch (err: any) {
    return { slug: entity.slug, discovered: null, confidence: 'error', reasoning: err.message?.slice(0, 200) ?? 'unknown error', saved: false };
  }
}

// ---------------------------------------------------------------------------
// Batch runner with concurrency control
// ---------------------------------------------------------------------------

async function runBatch<T, R>(items: T[], fn: (item: T) => Promise<R>, maxConcurrent: number): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Build where clause: entities missing the target field
  // Also exclude entities that already have a claim for this attribute
  const fieldColumn = mode === 'instagram' ? 'instagram' : mode === 'tiktok' ? 'tiktok' : 'website';

  // Get entities missing this field, excluding those with existing claims
  const entities = await db.$queryRaw<Array<{
    id: string;
    slug: string;
    name: string;
    neighborhood: string | null;
    category: string | null;
    website: string | null;
  }>>`
    SELECT e.id, e.slug, e.name, e.neighborhood, e.category, e.website
    FROM entities e
    WHERE e.${Prisma.raw(fieldColumn)} IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM observed_claims oc
        WHERE oc.entity_id = e.id AND oc.attribute_key = ${fieldColumn} AND oc.is_active = true
      )
    ORDER BY e.name ASC
    LIMIT ${limit}
  `;

  console.log(`[discover-social] mode=${mode} limit=${limit} concurrency=${concurrency} dry_run=${isDryRun}`);
  console.log(`[discover-social] Found ${entities.length} entities missing ${mode}`);
  if (entities.length === 0) {
    console.log('[discover-social] Nothing to do.');
    await db.$disconnect();
    return;
  }

  const results = await runBatch(
    entities,
    (entity) => discoverOne(client, entity),
    concurrency,
  );

  // Tally
  let saved = 0;
  let discovered = 0;
  let notFound = 0;
  let errors = 0;

  for (const r of results) {
    if (r.confidence === 'error') {
      errors++;
      console.log(`  ✗ ${r.slug} — ERROR: ${r.reasoning}`);
    } else if (!r.discovered) {
      notFound++;
      console.log(`  - ${r.slug} — not found (${r.reasoning})`);
    } else if (r.saved) {
      saved++;
      console.log(`  ✓ ${r.slug} → @${r.discovered} (${r.confidence})`);
    } else {
      discovered++;
      console.log(`  ~ ${r.slug} → @${r.discovered} (${r.confidence}, not saved — ${isDryRun ? 'dry run' : 'low confidence'})`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Processed: ${results.length}`);
  console.log(`Saved:     ${saved}`);
  console.log(`Found (not saved): ${discovered}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors:    ${errors}`);
  if (isDryRun) console.log(`(DRY RUN — no claims written)`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
