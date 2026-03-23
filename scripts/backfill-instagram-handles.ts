#!/usr/bin/env node
/**
 * backfill-instagram-handles.ts
 *
 * Phase 1: Backfill entities.instagram from merchant_surfaces.
 *
 * The surface discovery pipeline found ~90 Instagram URLs across ~70 entities,
 * but entities.instagram only has 7 rows populated (with quality issues).
 * This script closes that gap.
 *
 * What it does:
 *   1. Queries merchant_surfaces WHERE surface_type = 'instagram'
 *   2. Extracts a clean handle from each source_url
 *   3. For each entity: updates entities.instagram if null, 'null', or a full URL
 *   4. Reports: what was set, what was skipped, what was already good
 *
 * Usage:
 *   npx tsx scripts/backfill-instagram-handles.ts --dry-run   # review without writing
 *   npx tsx scripts/backfill-instagram-handles.ts             # apply changes
 *
 * Safe to re-run: only writes when the existing value is missing or bad.
 * Use --force to overwrite even "good" existing values.
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { PrismaClient } from '@prisma/client';
import { writeClaimAndSanction } from '@/lib/fields-v2/write-claim';

const db = new PrismaClient();

const isDryRun  = process.argv.includes('--dry-run');
const isForce   = process.argv.includes('--force');
const excludeArg = process.argv.find((a) => a.startsWith('--exclude='));
const excludeNames = excludeArg ? excludeArg.split('=').slice(1).join('=').split(',').map((s) => s.trim()) : [];

// ---------------------------------------------------------------------------
// Handle extraction (mirrors logic in ingest-instagram.ts)
// ---------------------------------------------------------------------------

function extractHandle(url: string): string | null {
  if (!url) return null;
  let h = url.trim();

  // Full URL → extract username segment
  if (h.includes('instagram.com/')) {
    // Reject post, reel, story, explore, and other non-profile URLs
    if (/instagram\.com\/(p|reel|reels|stories|explore|tv|ar)\//i.test(h)) return null;

    const match = h.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (match) h = match[1];
    else return null;
  }

  // Remove @ prefix and trailing slash
  h = h.replace(/^@/, '').replace(/\/$/, '').trim();

  // Validate
  if (!h) return null;
  if (!/^[a-zA-Z0-9._]+$/.test(h)) return null;
  if (h.toLowerCase() === 'none' || h.toLowerCase() === 'null') return null;

  return h;
}

// Determine whether an existing entities.instagram value is "bad"
// (missing, literal "null" string, or a full URL that should be a handle)
function isBadValue(val: string | null): boolean {
  if (val === null || val === undefined) return true;
  if (val.trim() === '') return true;
  if (val.toLowerCase() === 'null') return true;
  if (val.includes('instagram.com/')) return true; // full URL stored instead of handle
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface Result {
  entityId: string;
  entityName: string;
  surfaceUrl: string;
  extractedHandle: string | null;
  existingHandle: string | null;
  action: 'set' | 'already_good' | 'bad_extract' | 'skipped_force_off' | 'force_overwrite';
}

async function main() {
  console.log('[IG Backfill] Starting Instagram handle backfill...');
  if (isDryRun) console.log('[IG Backfill] DRY RUN — no writes');
  if (isForce)  console.log('[IG Backfill] FORCE mode — will overwrite existing values');
  console.log('');

  // Fetch all instagram surfaces with their entity info
  const surfaces = await db.merchant_surfaces.findMany({
    where: { surface_type: 'instagram' },
    include: {
      entity: {
        select: { id: true, name: true, instagram: true },
      },
    },
    orderBy: [{ entity: { name: 'asc' } }],
  });

  console.log(`[IG Backfill] Found ${surfaces.length} instagram surfaces across entities\n`);

  const results: Result[] = [];

  if (excludeNames.length > 0) {
    console.log(`[IG Backfill] Excluding: ${excludeNames.join(', ')}\n`);
  }

  // Deduplicate: keep only one surface per entity (the first one alphabetically by URL)
  const byEntity = new Map<string, typeof surfaces[0]>();
  for (const s of surfaces) {
    if (excludeNames.includes(s.entity.name)) continue;
    if (!byEntity.has(s.entityId)) {
      byEntity.set(s.entityId, s);
    }
  }

  for (const [, surface] of byEntity) {
    const entity = surface.entity;
    const extracted = extractHandle(surface.source_url);
    const existing = entity.instagram;

    let action: Result['action'];

    if (!extracted) {
      action = 'bad_extract';
    } else if (!isBadValue(existing) && !isForce) {
      // Existing value looks good — skip unless --force
      action = existing === extracted ? 'already_good' : 'skipped_force_off';
    } else if (!isBadValue(existing) && isForce) {
      action = 'force_overwrite';
    } else {
      action = 'set';
    }

    results.push({
      entityId: entity.id,
      entityName: entity.name,
      surfaceUrl: surface.source_url,
      extractedHandle: extracted,
      existingHandle: existing,
      action,
    });
  }

  // Print summary table
  console.log('='.repeat(90));
  console.log(
    'ENTITY'.padEnd(40) +
    'EXISTING'.padEnd(25) +
    'EXTRACTED'.padEnd(25) +
    'ACTION'
  );
  console.log('='.repeat(90));

  for (const r of results.sort((a, b) => a.entityName.localeCompare(b.entityName))) {
    const existing = (r.existingHandle ?? '(null)').substring(0, 23).padEnd(25);
    const extracted = (r.extractedHandle ?? '(unresolvable)').substring(0, 23).padEnd(25);
    console.log(r.entityName.substring(0, 38).padEnd(40) + existing + extracted + r.action);
  }

  console.log('='.repeat(90));
  console.log('');

  // Tally
  const toSet    = results.filter((r) => r.action === 'set' || r.action === 'force_overwrite');
  const skipped  = results.filter((r) => r.action === 'already_good' || r.action === 'skipped_force_off');
  const bad      = results.filter((r) => r.action === 'bad_extract');

  console.log(`Will set:    ${toSet.length}`);
  console.log(`Skipped:     ${skipped.filter(r => r.action === 'already_good').length} already good, ${skipped.filter(r => r.action === 'skipped_force_off').length} existing differs (use --force to overwrite)`);
  console.log(`Bad extract: ${bad.length} (unresolvable URLs — review manually)`);
  console.log('');

  if (bad.length > 0) {
    console.log('[IG Backfill] Unresolvable surfaces (manual review needed):');
    for (const r of bad) {
      console.log(`  ${r.entityName}: ${r.surfaceUrl}`);
    }
    console.log('');
  }

  if (isDryRun) {
    console.log('[IG Backfill] DRY RUN complete — no changes made.');
    await db.$disconnect();
    return;
  }

  // Apply writes
  let written = 0;
  let errors = 0;

  for (const r of toSet) {
    try {
      await writeClaimAndSanction(db, {
        entityId: r.entityId,
        attributeKey: 'instagram',
        rawValue: r.extractedHandle!,
        sourceId: 'operator_website',
        sourceUrl: r.surfaceUrl,
        extractionMethod: 'SCRAPE',
        confidence: 0.90,
        resolutionMethod: 'SLUG_EXACT',
      });
      written++;
      console.log(`[IG Backfill] ✓ ${r.entityName} → @${r.extractedHandle}`);
    } catch (err: any) {
      errors++;
      console.error(`[IG Backfill] ✗ ${r.entityName}: ${err.message}`);
    }
  }

  console.log('');
  console.log(`[IG Backfill] Done. Written: ${written}, Errors: ${errors}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error('[IG Backfill] Fatal:', err);
  process.exit(1);
});
