#!/usr/bin/env node
/**
 * ingest-instagram.ts
 *
 * Fetch Instagram account + media data via the Graph API and store in
 * instagram_accounts / instagram_media tables.
 *
 * Two modes:
 *   1. Business Discovery — fetch any restaurant's public IG by handle
 *   2. Own account (/me) — fetch the authenticated account's data
 *
 * Requires: INSTAGRAM_ACCESS_TOKEN in .env.local
 *           For Business Discovery: token must have instagram_manage_insights,
 *           pages_show_list, pages_read_engagement permissions + Facebook Login.
 *
 * Usage:
 *   # Single restaurant by handle (Business Discovery)
 *   npx tsx scripts/ingest-instagram.ts --username=republaboratory --entity-id=<id>
 *
 *   # Batch: ingest all entities that have an instagram handle
 *   npx tsx scripts/ingest-instagram.ts --batch
 *
 *   # Own account (original /me endpoint)
 *   npx tsx scripts/ingest-instagram.ts --me --entity-id=<id>
 *
 *   # Options
 *   --media-limit=50         # cap media items per account (default 200)
 *   --dry-run                # print, don't write
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const isDryRun     = process.argv.includes('--dry-run');
const isBatch      = process.argv.includes('--batch');
const isMeMode     = process.argv.includes('--me');
const usernameArg  = process.argv.find((a) => a.startsWith('--username='));
const entityArg    = process.argv.find((a) => a.startsWith('--entity-id='));
const limitArg     = process.argv.find((a) => a.startsWith('--media-limit='));
const delayArg     = process.argv.find((a) => a.startsWith('--delay='));
const targetUsername = usernameArg ? usernameArg.split('=')[1] : undefined;
const entityId     = entityArg ? entityArg.split('=')[1] : undefined;
const mediaLimit   = limitArg  ? parseInt(limitArg.split('=')[1], 10) : 200;
const delayMs      = delayArg  ? parseInt(delayArg.split('=')[1], 10) * 1000 : 3000; // default 3s between accounts

const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_USER_ID = process.env.INSTAGRAM_USER_ID; // Your IG user ID (for Business Discovery calls)

if (!TOKEN) {
  console.error('[IG Ingest] Missing INSTAGRAM_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

const API_BASE = 'https://graph.instagram.com';
const FB_API_BASE = 'https://graph.facebook.com/v21.0';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IGAccount {
  id: string;
  username: string;
  account_type?: string;
  media_count?: number;
  followers_count?: number;
}

interface IGMedia {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

interface IGMediaPage {
  data: IGMedia[];
  paging?: { cursors?: { after?: string }; next?: string };
}

interface BusinessDiscoveryResult {
  business_discovery: {
    id: string;
    username: string;
    media_count?: number;
    followers_count?: number;
    media?: IGMediaPage;
  };
  id: string;
}

// ---------------------------------------------------------------------------
// Rate limiter — tracks API usage and enforces backoff
// ---------------------------------------------------------------------------

class RateLimiter {
  private callTimestamps: number[] = [];
  private consecutiveRateLimits = 0;
  private readonly maxCallsPerWindow: number;
  private readonly windowMs: number;

  constructor(maxCallsPerWindow = 180, windowMs = 60 * 60 * 1000) {
    // Meta Graph API: ~200 calls/hour; we target 180 for safety margin
    this.maxCallsPerWindow = maxCallsPerWindow;
    this.windowMs = windowMs;
  }

  /** Proactively wait if we're approaching the rate limit */
  async throttle(): Promise<void> {
    this.pruneOldTimestamps();
    if (this.callTimestamps.length >= this.maxCallsPerWindow) {
      const oldest = this.callTimestamps[0]!;
      const waitMs = oldest + this.windowMs - Date.now() + 5000; // 5s buffer
      if (waitMs > 0) {
        const waitMin = Math.ceil(waitMs / 60000);
        console.log(`[IG Ingest] ⏳ Proactive throttle: ${this.callTimestamps.length}/${this.maxCallsPerWindow} calls in window. Waiting ${waitMin}m...`);
        await this.sleep(waitMs);
      }
    }
    this.callTimestamps.push(Date.now());
  }

  /** Handle a rate limit response with exponential backoff */
  async handleRateLimit(): Promise<void> {
    this.consecutiveRateLimits++;
    const backoffMs = Math.min(
      30000 * Math.pow(2, this.consecutiveRateLimits - 1), // 30s, 60s, 120s, 240s...
      10 * 60 * 1000 // cap at 10 minutes
    );
    const backoffSec = Math.round(backoffMs / 1000);
    console.log(`[IG Ingest] ⏳ Rate limited (attempt ${this.consecutiveRateLimits}). Backing off ${backoffSec}s...`);
    // Clear call history — we know the window is exhausted
    this.callTimestamps = [];
    await this.sleep(backoffMs);
  }

  /** Reset consecutive rate limit counter on success */
  onSuccess(): void {
    this.consecutiveRateLimits = 0;
  }

  get consecutiveFailures(): number {
    return this.consecutiveRateLimits;
  }

  private pruneOldTimestamps(): void {
    const cutoff = Date.now() - this.windowMs;
    this.callTimestamps = this.callTimestamps.filter((t) => t > cutoff);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

const rateLimiter = new RateLimiter();

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

interface APIError {
  type: 'rate_limit' | 'not_found' | 'transient' | 'permanent';
  message: string;
  statusCode: number;
}

function classifyError(status: number, body: string): APIError {
  const msg = `IG API ${status}: ${body}`;

  // Rate limit — code 4 or explicit message
  if (status === 403 || body.includes('"code":4') || body.includes('Application request limit reached')) {
    return { type: 'rate_limit', message: msg, statusCode: status };
  }

  // Not found — permanent, bad handle
  if (body.includes('Cannot find User') || body.includes('error_subcode":2207013')) {
    return { type: 'not_found', message: msg, statusCode: status };
  }

  // Server errors — transient
  if (status >= 500) {
    return { type: 'transient', message: msg, statusCode: status };
  }

  // Everything else — assume permanent
  return { type: 'permanent', message: msg, statusCode: status };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchJSON<T>(url: string): Promise<T> {
  await rateLimiter.throttle();
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    const err = classifyError(res.status, body);
    const error = new Error(err.message) as Error & { apiError: APIError };
    error.apiError = err;
    throw error;
  }
  rateLimiter.onSuccess();
  return res.json() as Promise<T>;
}

// -- /me endpoints (own account) --

async function fetchOwnAccount(): Promise<IGAccount> {
  const url = `${API_BASE}/me?fields=id,username,account_type,media_count&access_token=${TOKEN}`;
  return fetchJSON<IGAccount>(url);
}

async function fetchOwnMediaPage(after?: string): Promise<IGMediaPage> {
  let url = `${API_BASE}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=25&access_token=${TOKEN}`;
  if (after) url += `&after=${after}`;
  return fetchJSON<IGMediaPage>(url);
}

// -- Business Discovery endpoints (other accounts) --

async function fetchBusinessDiscovery(username: string, mediaAfter?: string): Promise<BusinessDiscoveryResult> {
  if (!IG_USER_ID) {
    throw new Error('INSTAGRAM_USER_ID required in .env.local for Business Discovery. Set it to your IG numeric user ID.');
  }

  // Build media subfields with pagination
  let mediaFields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  let mediaParam = `media.limit(25){${mediaFields}}`;
  if (mediaAfter) {
    mediaParam = `media.after(${mediaAfter}).limit(25){${mediaFields}}`;
  }

  const fields = `business_discovery.username(${username}){id,username,media_count,followers_count,${mediaParam}}`;
  const url = `${FB_API_BASE}/${IG_USER_ID}?fields=${encodeURIComponent(fields)}&access_token=${TOKEN}`;
  return fetchJSON<BusinessDiscoveryResult>(url);
}

// ---------------------------------------------------------------------------
// Shared ingest logic
// ---------------------------------------------------------------------------

async function ingestAccount(
  account: IGAccount,
  resolvedEntityId: string,
  rawPayload: any,
): Promise<void> {
  if (isDryRun) {
    console.log('[IG Ingest] [DRY RUN] Would upsert account:', {
      instagram_user_id: account.id,
      username: account.username,
      media_count: account.media_count,
      entity_id: resolvedEntityId,
    });
    return;
  }

  await db.instagram_accounts.upsert({
    where: { instagram_user_id: account.id },
    create: {
      entity_id: resolvedEntityId,
      instagram_user_id: account.id,
      username: account.username,
      account_type: account.account_type ?? null,
      media_count: account.media_count ?? null,
      canonical_instagram_url: `https://instagram.com/${account.username}`,
      last_fetched_at: new Date(),
      last_successful_fetch_at: new Date(),
      source_status: 'active',
      raw_payload: rawPayload,
    },
    update: {
      username: account.username,
      account_type: account.account_type ?? null,
      media_count: account.media_count ?? null,
      canonical_instagram_url: `https://instagram.com/${account.username}`,
      last_fetched_at: new Date(),
      last_successful_fetch_at: new Date(),
      source_status: 'active',
      raw_payload: rawPayload,
    },
  });

  console.log(`[IG Ingest] Upserted account: @${account.username} (${account.id})`);
}

async function writeMedia(
  media: IGMedia[],
  instagramUserId: string,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const item of media) {
    const existing = await db.instagram_media.findUnique({
      where: { instagram_media_id: item.id },
    });

    if (existing) {
      await db.instagram_media.update({
        where: { instagram_media_id: item.id },
        data: {
          media_url: item.media_url ?? null,
          thumbnail_url: item.thumbnail_url ?? null,
          caption: item.caption ?? null,
          fetched_at: new Date(),
          raw_payload: item as any,
        },
      });
      updated++;
    } else {
      await db.instagram_media.create({
        data: {
          instagram_media_id: item.id,
          instagram_user_id: instagramUserId,
          media_type: item.media_type,
          media_url: item.media_url ?? null,
          thumbnail_url: item.thumbnail_url ?? null,
          permalink: item.permalink,
          caption: item.caption ?? null,
          timestamp: new Date(item.timestamp),
          fetched_at: new Date(),
          raw_payload: item as any,
        },
      });
      inserted++;
    }
  }

  return { inserted, updated };
}

function printSampleMedia(media: IGMedia[]) {
  console.log('[IG Ingest] [DRY RUN] Sample media:');
  for (const m of media.slice(0, 5)) {
    console.log(`  ${m.media_type} | ${m.timestamp} | ${m.permalink}`);
    if (m.caption) console.log(`    caption: ${m.caption.slice(0, 80)}...`);
  }
}

// ---------------------------------------------------------------------------
// Mode: Business Discovery (single username)
// ---------------------------------------------------------------------------

async function ingestByUsername(username: string, resolvedEntityId: string) {
  console.log(`[IG Ingest] Business Discovery for @${username}...`);

  // First call — gets account info + first page of media
  const result = await fetchBusinessDiscovery(username);
  const bd = result.business_discovery;

  const account: IGAccount = {
    id: bd.id,
    username: bd.username,
    media_count: bd.media_count,
    followers_count: bd.followers_count,
  };

  console.log(`[IG Ingest] Account: @${account.username} (${account.id}), ${account.media_count ?? '?'} posts, ${account.followers_count ?? '?'} followers`);

  await ingestAccount(account, resolvedEntityId, bd);

  // Paginate media
  const allMedia: IGMedia[] = [];
  if (bd.media?.data) {
    allMedia.push(...bd.media.data);
    console.log(`[IG Ingest]   Page 1: ${bd.media.data.length} items`);
  }

  let cursor = bd.media?.paging?.cursors?.after;
  let pageNum = 1;

  while (allMedia.length < mediaLimit && cursor) {
    pageNum++;
    try {
      const nextResult = await fetchBusinessDiscovery(username, cursor);
      const nextMedia = nextResult.business_discovery.media;
      if (!nextMedia?.data || nextMedia.data.length === 0) break;

      allMedia.push(...nextMedia.data);
      console.log(`[IG Ingest]   Page ${pageNum}: ${nextMedia.data.length} items (total: ${allMedia.length})`);

      cursor = nextMedia.paging?.cursors?.after;
      if (!nextMedia.paging?.next) break;
    } catch (err: any) {
      console.warn(`[IG Ingest]   Pagination stopped at page ${pageNum}: ${err.message}`);
      break;
    }
  }

  const trimmed = allMedia.slice(0, mediaLimit);
  console.log(`[IG Ingest] Fetched ${trimmed.length} media items`);

  if (isDryRun) {
    printSampleMedia(trimmed);
    return;
  }

  const { inserted, updated } = await writeMedia(trimmed, account.id);
  console.log(`[IG Ingest] Media: ${inserted} inserted, ${updated} updated`);
}

// ---------------------------------------------------------------------------
// Mode: Batch (all entities with instagram handle)
// ---------------------------------------------------------------------------

async function ingestBatch() {
  // Find entities that have an instagram handle but no instagram_accounts row yet
  const entities = await db.entities.findMany({
    where: {
      instagram: { not: null },
      status: 'OPEN',
    },
    select: {
      id: true,
      name: true,
      instagram: true,
      instagram_accounts: {
        select: { instagram_user_id: true, last_fetched_at: true },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  // Filter: only entities without an existing instagram_accounts row,
  // or those not fetched in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const targets = entities.filter((e) => {
    if (!e.instagram || e.instagram === 'NONE') return false;
    const existing = e.instagram_accounts[0];
    if (!existing) return true; // never ingested
    if (existing.last_fetched_at && existing.last_fetched_at < oneDayAgo) return true; // stale
    return false;
  });

  console.log(`[IG Ingest] Batch: ${targets.length} entities to ingest (of ${entities.length} with IG handles)`);
  console.log('');

  let success = 0;
  let failed = 0;
  let notFound = 0;
  let rateLimited = 0;
  const MAX_CONSECUTIVE_RATE_LIMITS = 5; // circuit breaker

  for (let i = 0; i < targets.length; i++) {
    const entity = targets[i]!;
    const handle = cleanHandle(entity.instagram!);
    if (!handle) {
      console.warn(`[IG Ingest] Skipping ${entity.name}: invalid handle "${entity.instagram}"`);
      failed++;
      continue;
    }

    try {
      console.log(`[IG Ingest] [${i + 1}/${targets.length}] @${handle} (${entity.name})`);
      await ingestByUsername(handle, entity.id);
      success++;
      console.log('');
    } catch (err: any) {
      const apiError: APIError | undefined = err.apiError;
      const msg = err.message ?? '';

      if (apiError?.type === 'rate_limit') {
        // Rate limit — exponential backoff and retry
        rateLimited++;
        await rateLimiter.handleRateLimit();

        // Circuit breaker: if we've hit N consecutive rate limits, abort
        if (rateLimiter.consecutiveFailures >= MAX_CONSECUTIVE_RATE_LIMITS) {
          console.error(`[IG Ingest] Circuit breaker: ${MAX_CONSECUTIVE_RATE_LIMITS} consecutive rate limits. Stopping batch.`);
          console.log(`[IG Ingest] Resume later — the script will pick up where it left off (skips already-ingested).`);
          break;
        }

        // Retry this entity after backoff
        try {
          console.log(`[IG Ingest] Retrying @${handle}...`);
          await ingestByUsername(handle, entity.id);
          success++;
          console.log(`[IG Ingest] ✓ Retry succeeded for @${handle}`);
        } catch (retryErr: any) {
          const retryApiError: APIError | undefined = (retryErr as any).apiError;
          if (retryApiError?.type === 'rate_limit') {
            // Still rate limited after backoff — push this entity to end and continue
            console.warn(`[IG Ingest] Still rate limited after backoff. Will continue with next entity.`);
            failed++;
          } else {
            console.error(`[IG Ingest] Retry failed @${handle}: ${retryErr.message}`);
            failed++;
          }
        }
        console.log('');
        continue; // skip normal delay, we already waited during backoff

      } else if (apiError?.type === 'not_found') {
        // Permanent: bad handle — log and move on quickly
        console.warn(`[IG Ingest] ✗ Not found: @${handle} (${entity.name}) — handle may be incorrect`);
        notFound++;
        // No delay needed for not-found — didn't cost a real API call
        console.log('');
        continue;

      } else if (apiError?.type === 'transient') {
        // Server error — quick retry once
        console.warn(`[IG Ingest] Transient error for @${handle}, retrying in 10s...`);
        await new Promise((r) => setTimeout(r, 10000));
        try {
          await ingestByUsername(handle, entity.id);
          success++;
        } catch {
          console.error(`[IG Ingest] FAILED @${handle} (${entity.name}): ${msg}`);
          failed++;
        }
        console.log('');
        continue;

      } else {
        // Permanent error — log and mark
        console.error(`[IG Ingest] FAILED @${handle} (${entity.name}): ${msg}`);
        failed++;

        if (!isDryRun) {
          try {
            const existing = await db.instagram_accounts.findFirst({
              where: { entity_id: entity.id },
            });
            if (existing) {
              await db.instagram_accounts.update({
                where: { id: existing.id },
                data: {
                  last_fetched_at: new Date(),
                  source_status: 'error',
                },
              });
            }
          } catch { /* ignore */ }
        }
        console.log('');
      }
    }

    // Delay between accounts to respect API rate limits
    if (delayMs > 0 && i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  console.log('');
  console.log('[IG Ingest] ═══════════════════════════════════');
  console.log('[IG Ingest] Batch complete:');
  console.log(`  Succeeded:    ${success}`);
  console.log(`  Not found:    ${notFound} (bad handles)`);
  console.log(`  Rate limited: ${rateLimited} (retried with backoff)`);
  console.log(`  Other fails:  ${failed}`);
  console.log(`  Total:        ${success + notFound + failed}/${targets.length}`);
}

// ---------------------------------------------------------------------------
// Mode: Own account (/me)
// ---------------------------------------------------------------------------

async function ingestMe() {
  if (!entityId) {
    console.error('[IG Ingest] --entity-id required for --me mode (or use --dry-run)');
    if (!isDryRun) process.exit(1);
  }

  console.log('[IG Ingest] Fetching own account (/me)...');
  const account = await fetchOwnAccount();
  console.log(`[IG Ingest] Account: @${account.username} (${account.id}), ${account.media_count} posts`);

  if (entityId) {
    await ingestAccount(account, entityId, account);
  } else {
    console.log('[IG Ingest] [DRY RUN] Would upsert account:', {
      instagram_user_id: account.id,
      username: account.username,
      media_count: account.media_count,
    });
  }

  // Fetch media
  console.log('[IG Ingest] Fetching media...');
  const allMedia: IGMedia[] = [];
  let cursor: string | undefined;
  let pageNum = 0;

  while (allMedia.length < mediaLimit) {
    pageNum++;
    const page = await fetchOwnMediaPage(cursor);
    if (!page.data || page.data.length === 0) break;

    allMedia.push(...page.data);
    console.log(`[IG Ingest]   Page ${pageNum}: ${page.data.length} items (total: ${allMedia.length})`);

    if (!page.paging?.next) break;
    cursor = page.paging.cursors?.after;
    if (!cursor) break;
  }

  const trimmed = allMedia.slice(0, mediaLimit);
  console.log(`[IG Ingest] Fetched ${trimmed.length} media items`);

  if (isDryRun) {
    printSampleMedia(trimmed);
    return;
  }

  const { inserted, updated } = await writeMedia(trimmed, account.id);
  console.log(`[IG Ingest] Media: ${inserted} inserted, ${updated} updated`);
}

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

function cleanHandle(raw: string): string | null {
  let h = raw.trim();
  // Handle full Instagram URLs
  if (h.includes('instagram.com/')) {
    const match = h.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (match) h = match[1];
  }
  // Remove @ prefix and trailing slash
  h = h.replace(/^@/, '').replace(/\/$/, '');
  // Validate
  if (!/^[a-zA-Z0-9._]+$/.test(h)) return null;
  if (h === 'NONE') return null;
  return h;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[IG Ingest] Starting Instagram ingestion...');
  if (isDryRun) console.log('[IG Ingest] DRY RUN — no writes');
  console.log(`[IG Ingest] Media limit: ${mediaLimit}`);
  console.log('');

  if (isBatch) {
    await ingestBatch();
  } else if (targetUsername) {
    // Single restaurant by handle
    if (!entityId && !isDryRun) {
      // Try to resolve entity_id from entities.instagram
      const entity = await db.entities.findFirst({
        where: {
          OR: [
            { instagram: targetUsername },
            { instagram: `@${targetUsername}` },
            { instagram: { contains: targetUsername } },
          ],
        },
        select: { id: true, name: true },
      });

      if (entity) {
        console.log(`[IG Ingest] Auto-resolved entity: ${entity.name} (${entity.id})`);
        await ingestByUsername(targetUsername, entity.id);
      } else {
        console.error(`[IG Ingest] No entity found for @${targetUsername}. Use --entity-id=<id> or --dry-run.`);
        process.exit(1);
      }
    } else if (entityId) {
      await ingestByUsername(targetUsername, entityId);
    } else {
      // Dry run — pass placeholder
      await ingestByUsername(targetUsername, 'DRY_RUN');
    }
  } else if (isMeMode) {
    await ingestMe();
  } else {
    console.log('Usage:');
    console.log('  npx tsx scripts/ingest-instagram.ts --username=<handle>           # single restaurant');
    console.log('  npx tsx scripts/ingest-instagram.ts --username=<handle> --entity-id=<id>');
    console.log('  npx tsx scripts/ingest-instagram.ts --batch                       # all entities with IG');
    console.log('  npx tsx scripts/ingest-instagram.ts --me --entity-id=<id>         # own account');
    console.log('  Add --dry-run to preview without writing.');
    process.exit(0);
  }

  console.log('');
  console.log('[IG Ingest] Done.');
}

main()
  .catch((err) => {
    console.error('[IG Ingest] Fatal error:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
