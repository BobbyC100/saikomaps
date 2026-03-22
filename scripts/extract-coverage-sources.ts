#!/usr/bin/env node
/**
 * Coverage Source Extraction — Phase 4
 *
 * Reads FETCHED coverage sources, sends archived article content through
 * Claude Sonnet for structured signal extraction, and writes results to
 * coverage_source_extractions.
 *
 * Usage:
 *   npx tsx scripts/extract-coverage-sources.ts [--dry-run] [--limit=N] [--reprocess] [--verbose] [--min-words=N]
 *
 * Flags:
 *   --dry-run      Show what would be extracted, no API calls or DB writes
 *   --limit=N      Process at most N sources (default: unlimited)
 *   --reprocess    Re-extract sources that already have current extractions
 *   --verbose      Show full extraction output per source
 *   --min-words=N  Skip sources with fewer than N words (default: 50)
 *
 * Reads:  coverage_sources WHERE enrichmentStage = 'FETCHED'
 * Writes: coverage_source_extractions (isCurrent = true)
 * Updates: coverage_sources.enrichmentStage → 'EXTRACTED'
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import Anthropic from '@anthropic-ai/sdk';
import { db } from '../lib/db';
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserMessage,
  parseExtractionResponse,
} from '../lib/coverage/extract-source-prompt';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;
const RATE_LIMIT_MS = 800;
const EXTRACTION_VERSION = 'coverage-extract-v2';
const DEFAULT_MIN_WORDS = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const reprocess = args.includes('--reprocess');
const verbose = args.includes('--verbose');

const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

const minWordsArg = args.find((a) => a.startsWith('--min-words='));
const minWords = minWordsArg ? parseInt(minWordsArg.split('=')[1], 10) : DEFAULT_MIN_WORDS;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (dryRun) {
    console.log('\n🔍 DRY RUN — no API calls, no DB writes\n');
  } else {
    console.log('\n🧠 Extracting coverage sources...\n');
  }

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !dryRun) {
    console.error('❌  ANTHROPIC_API_KEY not set.');
    process.exit(1);
  }

  const claude = dryRun ? null : new Anthropic({ apiKey });

  console.log(`  Model:       ${MODEL}`);
  console.log(`  Version:     ${EXTRACTION_VERSION}`);
  console.log(`  Min words:   ${minWords}`);
  console.log(`  Reprocess:   ${reprocess}`);
  if (limit) console.log(`  Limit:       ${limit}`);
  console.log('');

  // ── Query sources ────────────────────────────────────────────────────────

  // Find FETCHED sources (optionally excluding already-extracted ones)
  const sources = await db.coverage_sources.findMany({
    where: {
      enrichmentStage: reprocess ? { in: ['FETCHED', 'EXTRACTED'] } : 'FETCHED',
      wordCount: { gte: minWords },
      ...(reprocess ? {} : {
        extractions: { none: { isCurrent: true } },
      }),
    },
    select: {
      id: true,
      entityId: true,
      url: true,
      publicationName: true,
      articleTitle: true,
      fetchedContent: true,
      wordCount: true,
      entity: { select: { name: true, slug: true } },
    },
    orderBy: { wordCount: 'desc' },  // richest content first
    ...(limit ? { take: limit } : {}),
  });

  console.log(`Found ${sources.length} sources to extract.\n`);

  if (sources.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // ── Process ──────────────────────────────────────────────────────────────

  let extracted = 0;
  let failed = 0;
  let skipped = 0;
  const pubStats = new Map<string, { ok: number; fail: number }>();

  function trackPub(pub: string, success: boolean) {
    const entry = pubStats.get(pub) ?? { ok: 0, fail: 0 };
    if (success) entry.ok++;
    else entry.fail++;
    pubStats.set(pub, entry);
  }

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const entityName = src.entity?.name ?? 'Unknown';
    const slug = src.entity?.slug ?? '???';

    const prefix = `  [${i + 1}/${sources.length}]`;

    if (dryRun) {
      console.log(`${prefix} [dry] ${slug} — ${src.publicationName} — ${src.wordCount} words`);
      skipped++;
      continue;
    }

    console.log(`${prefix} Extracting: ${slug} — ${src.publicationName} (${src.wordCount} words)`);

    if (!src.fetchedContent) {
      console.log(`    ⊘ No content — skipping`);
      skipped++;
      continue;
    }

    try {
      const msg = await claude!.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildExtractionUserMessage(
            entityName,
            src.publicationName,
            src.articleTitle,
            src.fetchedContent,
          ),
        }],
      });

      const raw = msg.content.find((b) => b.type === 'text')?.text ?? '';
      const extraction = parseExtractionResponse(raw);

      if (!extraction) {
        console.log(`    ✗ Parse failed — raw: ${raw.slice(0, 150)}`);
        failed++;
        trackPub(src.publicationName, false);
        continue;
      }

      if (verbose) {
        console.log(`    People:       ${extraction.people.length}`);
        console.log(`    Food:         ${extraction.foodEvidence.cuisinePosture ?? 'none'}`);
        console.log(`    Beverage:     ${JSON.stringify(Object.keys(extraction.beverageEvidence).filter(k => k !== 'rawMentions' && (extraction.beverageEvidence as any)[k]?.mentioned))}`);
        console.log(`    Service:      ${extraction.serviceEvidence.serviceModel ?? 'none'}`);
        console.log(`    Origin:       ${extraction.originStory ? extraction.originStory.type : 'none'}`);
        console.log(`    Accolades:    ${extraction.accolades.length}`);
        console.log(`    Pull quotes:  ${extraction.pullQuotes.length}`);
        console.log(`    Sentiment:    ${extraction.sentiment}`);
        console.log(`    Type:         ${extraction.articleType}`);
        console.log(`    Relevance:    ${extraction.relevanceScore}`);
      }

      // ── Write extraction ───────────────────────────────────────────────

      // Mark any previous extractions as not current
      await db.coverage_source_extractions.updateMany({
        where: { coverageSourceId: src.id, isCurrent: true },
        data: { isCurrent: false },
      });

      // Write new extraction
      await db.coverage_source_extractions.create({
        data: {
          coverageSourceId: src.id,
          entityId: src.entityId,
          extractionVersion: EXTRACTION_VERSION,
          isCurrent: true,
          people: extraction.people as any,
          foodEvidence: extraction.foodEvidence as any,
          beverageEvidence: extraction.beverageEvidence as any,
          serviceEvidence: extraction.serviceEvidence as any,
          atmosphereSignals: extraction.atmosphereSignals as any,
          originStory: extraction.originStory as any,
          accolades: extraction.accolades as any,
          pullQuotes: extraction.pullQuotes as any,
          sentiment: extraction.sentiment,
          articleType: extraction.articleType,
          relevanceScore: extraction.relevanceScore,
        },
      });

      // Advance enrichment stage
      await db.coverage_sources.update({
        where: { id: src.id },
        data: {
          enrichmentStage: 'EXTRACTED',
          extractionVersion: EXTRACTION_VERSION,
          extractedAt: new Date(),
        },
      });

      const peopleSummary = extraction.people.length > 0
        ? extraction.people.map(p => `${p.name} (${p.role})`).join(', ')
        : 'none';
      console.log(`    ✓ ${extraction.articleType} — relevance ${extraction.relevanceScore} — people: ${peopleSummary}`);
      extracted++;
      trackPub(src.publicationName, true);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`    ✗ Error: ${errMsg.slice(0, 150)}`);
      failed++;
      trackPub(src.publicationName, false);
    }

    // Rate limit
    if (i < sources.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(40));
  console.log(dryRun ? '  DRY RUN SUMMARY' : '  EXTRACTION SUMMARY');
  console.log('═'.repeat(40));
  console.log(`  Total processed:  ${sources.length}`);
  console.log(`  Extracted (OK):   ${extracted}`);
  console.log(`  Failed:           ${failed}`);
  if (skipped > 0) console.log(`  Skipped:          ${skipped}`);

  if (pubStats.size > 0) {
    console.log('\n  Per-publication:');
    for (const [pub, stats] of Array.from(pubStats.entries()).sort((a, b) => (b[1].ok + b[1].fail) - (a[1].ok + a[1].fail))) {
      const okStr = `✓ ${stats.ok}`.padEnd(5);
      const failStr = stats.fail > 0 ? `  ✗ ${stats.fail}` : '';
      console.log(`    ${pub.padEnd(28)} ${okStr}${failStr}`);
    }
  }

  // Count remaining
  const remaining = await db.coverage_sources.count({
    where: { enrichmentStage: 'FETCHED', wordCount: { gte: minWords } },
  });
  console.log(`\n  Still FETCHED (≥${minWords} words):   ${remaining}`);
  console.log('');
}

main()
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
