/**
 * Social Discovery Tool API
 * POST /api/admin/tools/discover-social
 *
 * Uses Claude + web_search to find Instagram handles and websites for entities.
 *
 * Single entity (slug provided): runs inline, returns result synchronously (~5s).
 * Batch (no slug): spawns background script.
 *
 * Body: { mode: "instagram" | "tiktok" | "website" | "both", limit?: number, slug?: string, dryRun?: boolean }
 *
 * Coverage Operations resolution tool.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// Inline single-entity discovery (synchronous, ~5s)
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

async function discoverInline(
  entity: { id: string; slug: string; name: string; neighborhood: string | null; category: string | null; website: string | null },
  mode: 'instagram' | 'tiktok' | 'website',
  dryRun: boolean,
): Promise<{ discovered: string | null; confidence: string; reasoning: string; saved: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const client = new Anthropic({ apiKey });
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

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system,
    tools: [{ type: 'web_search_20250305' as any, name: 'web_search' } as any],
    messages: [{ role: 'user', content: user }],
  });

  const textBlocks = response.content.filter((b: any) => b.type === 'text');
  const fullText = textBlocks.map((b: any) => b.text).join('\n');

  // Parse JSON
  const jsonMatch = fullText.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return { discovered: null, confidence: 'low', reasoning: 'No JSON in response', saved: false };

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    const start = fullText.indexOf('{');
    const end = fullText.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { parsed = JSON.parse(fullText.slice(start, end + 1)); } catch { /* */ }
    }
    if (!parsed) return { discovered: null, confidence: 'low', reasoning: 'JSON parse failed', saved: false };
  }

  const confidence = parsed.confidence ?? 'low';
  const reasoning = parsed.reasoning ?? '';

  if (mode === 'instagram') {
    const handle = parsed.instagram_handle ? cleanHandle(parsed.instagram_handle) : null;
    if (!handle) return { discovered: null, confidence, reasoning: reasoning || 'No handle found', saved: false };
    if ((confidence === 'high' || confidence === 'medium') && !dryRun) {
      await db.entities.update({ where: { id: entity.id }, data: { instagram: handle } });
      return { discovered: handle, confidence, reasoning, saved: true };
    }
    return { discovered: handle, confidence, reasoning, saved: false };
  } else if (mode === 'tiktok') {
    const handle = parsed.tiktok_handle ? cleanTiktokHandle(parsed.tiktok_handle) : null;
    if (!handle) return { discovered: null, confidence, reasoning: reasoning || 'No handle found', saved: false };
    if ((confidence === 'high' || confidence === 'medium') && !dryRun) {
      await db.$executeRaw`UPDATE entities SET tiktok = ${handle} WHERE id = ${entity.id}`;
      return { discovered: handle, confidence, reasoning, saved: true };
    }
    return { discovered: handle, confidence, reasoning, saved: false };
  } else {
    const url = parsed.website_url ? cleanUrl(parsed.website_url) : null;
    if (!url) return { discovered: null, confidence, reasoning: reasoning || 'No website found', saved: false };
    if ((confidence === 'high' || confidence === 'medium') && !dryRun) {
      await db.entities.update({ where: { id: entity.id }, data: { website: url } });
      return { discovered: url, confidence, reasoning, saved: true };
    }
    return { discovered: url, confidence, reasoning, saved: false };
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, limit, slug, dryRun } = body as {
      mode?: string;
      limit?: number;
      slug?: string;
      dryRun?: boolean;
    };

    if (!mode || !['instagram', 'tiktok', 'website', 'both'].includes(mode)) {
      return NextResponse.json(
        { error: 'mode is required (instagram | tiktok | website | both)' },
        { status: 400 },
      );
    }

    // ── Single entity: run inline (synchronous, ~5s) ──
    if (slug) {
      const entity = await db.entities.findUnique({
        where: { slug },
        select: { id: true, slug: true, name: true, neighborhood: true, category: true, website: true, instagram: true },
      });

      if (!entity) {
        return NextResponse.json({ error: `Entity not found: ${slug}` }, { status: 404 });
      }

      const modes: ('instagram' | 'tiktok' | 'website')[] = mode === 'both' ? ['instagram', 'website'] : [mode as 'instagram' | 'tiktok' | 'website'];
      const results: Record<string, any> = {};

      for (const m of modes) {
        results[m] = await discoverInline(entity, m, dryRun ?? false);
      }

      return NextResponse.json({
        status: 'completed',
        slug: entity.slug,
        name: entity.name,
        results,
      });
    }

    // ── Batch: spawn background script ──
    const projectRoot = path.resolve(process.cwd());
    const tsxBin = path.join(projectRoot, 'node_modules', '.bin', 'tsx');

    const args = [
      '-r', './scripts/load-env.js',
      tsxBin,
      'scripts/discover-social.ts',
      `--mode=${mode}`,
    ];

    if (limit) args.push(`--limit=${limit}`);
    if (dryRun) args.push('--dry-run');

    const logFile = path.join(projectRoot, 'data', 'logs', `discover-social-${mode}-${Date.now()}.log`);
    const logFd = fs.openSync(logFile, 'a');

    const child = spawn('node', args, {
      cwd: projectRoot,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env },
    });
    child.unref();

    return NextResponse.json(
      {
        status: 'queued',
        mode,
        limit: limit ?? 50,
        dryRun: dryRun ?? false,
        logFile: path.basename(logFile),
        message: `Social discovery (${mode}) started in background`,
      },
      { status: 202 },
    );
  } catch (error: any) {
    console.error('[Discover Social] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start social discovery', message: error.message },
      { status: 500 },
    );
  }
}
