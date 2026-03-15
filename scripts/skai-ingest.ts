#!/usr/bin/env tsx
/**
 * SKAI Ingestion Script
 *
 * Reads docs/registry.json, chunks each document, embeds via OpenAI,
 * and upserts into the skai_chunks table in Neon (pgvector).
 *
 * Usage:
 *   npx tsx scripts/skai-ingest.ts              # ingest all docs
 *   npx tsx scripts/skai-ingest.ts --doc SKI/OPS-001   # single doc
 *   npx tsx scripts/skai-ingest.ts --dry-run     # preview only
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegistryEntry {
  doc_id: string;
  path: string;
  category?: string;
  systems?: string[];
  tags?: string[];
  source: string;
  source_url?: string;
  last_updated?: string;
}

interface Chunk {
  doc_id: string;
  chunk_index: number;
  content: string;
  embedding_text: string; // content with context header (for embedding only)
  category: string | null;
  systems: string[];
  tags: string[];
  source: string;
  source_url: string | null;
  file_path: string | null;
  updated_at: Date | null;
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const docFlagIdx = args.indexOf('--doc');
const singleDocId = docFlagIdx !== -1 ? args[docFlagIdx + 1] : null;

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

/**
 * Rough token count — ~4 chars per token for English prose.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks of ~targetTokens with overlap,
 * preferring paragraph boundaries.
 */
function chunkText(text: string, targetTokens = 500, overlapTokens = 50): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);

    // If a single paragraph exceeds target, split it by sentences
    if (paraTokens > targetTokens && current === '') {
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);
        if (currentTokens + sentenceTokens > targetTokens && current !== '') {
          chunks.push(current.trim());
          // Overlap: keep tail of current chunk
          const overlapChars = overlapTokens * 4;
          current = current.slice(-overlapChars) + '\n\n' + sentence;
          currentTokens = estimateTokens(current);
        } else {
          current += (current ? ' ' : '') + sentence;
          currentTokens += sentenceTokens;
        }
      }
      continue;
    }

    if (currentTokens + paraTokens > targetTokens && current !== '') {
      chunks.push(current.trim());
      // Overlap: keep tail of current chunk
      const overlapChars = overlapTokens * 4;
      current = current.slice(-overlapChars) + '\n\n' + para;
      currentTokens = estimateTokens(current);
    } else {
      current += (current ? '\n\n' : '') + para;
      currentTokens += paraTokens;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

async function embedBatch(texts: string[]): Promise<number[][]> {
  const resp = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return resp.data.map((d) => d.embedding);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();
  const registryPath = path.join(process.cwd(), 'docs', 'registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  let entries: RegistryEntry[] = registry.docs;

  // Filter to single doc if requested
  if (singleDocId) {
    entries = entries.filter((e) => e.doc_id === singleDocId);
    if (entries.length === 0) {
      console.error(`Doc "${singleDocId}" not found in registry.`);
      process.exit(1);
    }
  }

  // Skip external sources (no local file to read)
  const external = entries.filter((e) => e.source === 'external');
  entries = entries.filter((e) => e.source !== 'external');

  // Skip entries missing a path
  const noPath = entries.filter((e) => !e.path);
  if (noPath.length > 0) {
    console.log(`Skipping ${noPath.length} docs without path:`);
    noPath.forEach((e) => console.log(`  ${e.doc_id}`));
    entries = entries.filter((e) => !!e.path);
  }

  console.log(`\nSKAI Ingest ${dryRun ? '(DRY RUN)' : ''}`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Registry entries: ${registry.docs.length}`);
  console.log(`To process: ${entries.length}`);
  console.log(`Skipped (external): ${external.length}`);
  if (noPath.length > 0) console.log(`Skipped (no path): ${noPath.length}`);
  console.log('');

  let totalChunks = 0;
  let docsProcessed = 0;
  let docsSkipped = 0;

  // Build all chunks first
  const allDocChunks: { entry: RegistryEntry; chunks: Chunk[] }[] = [];

  for (const entry of entries) {
    const filePath = path.join(process.cwd(), entry.path);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP ${entry.doc_id} — file not found: ${entry.path}`);
      docsSkipped++;
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const textChunks = chunkText(content);
    const chunks: Chunk[] = textChunks.map((text, i) => {
      const systemsStr = (entry.systems || []).join(', ');
      const header = `Doc: ${entry.doc_id} | Category: ${entry.category || 'unknown'} | Systems: ${systemsStr}\n---\n`;
      return {
        doc_id: entry.doc_id,
        chunk_index: i,
        content: text,
        embedding_text: header + text,
        category: entry.category || null,
        systems: entry.systems || [],
        tags: entry.tags || [],
        source: entry.source,
        source_url: entry.source_url || null,
        file_path: entry.path,
        updated_at: entry.last_updated ? new Date(entry.last_updated) : null,
      };
    });

    allDocChunks.push({ entry, chunks });
    totalChunks += chunks.length;
    docsProcessed++;

    if (dryRun) {
      console.log(`  ${entry.doc_id} → ${chunks.length} chunks (${entry.path})`);
    }
  }

  if (dryRun) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`SKAI ingest dry run complete`);
    console.log(`Docs to process: ${docsProcessed}`);
    console.log(`Chunks to create: ${totalChunks}`);
    console.log(`Skipped (external): ${external.length}`);
    console.log(`Skipped (missing file): ${docsSkipped}`);
    await prisma.$disconnect();
    return;
  }

  // Embed and insert
  console.log(`Embedding ${totalChunks} chunks...\n`);

  for (const { entry, chunks } of allDocChunks) {
    // Delete existing chunks for this doc
    await prisma.$executeRaw`DELETE FROM skai_chunks WHERE doc_id = ${entry.doc_id}`;

    // Embed in batches of 20
    const batchSize = 20;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await embedBatch(batch.map((c) => c.embedding_text));

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embeddingStr = `[${embeddings[j].join(',')}]`;

        await prisma.$executeRaw`
          INSERT INTO skai_chunks (doc_id, chunk_index, content, embedding, category, systems, tags, source, source_url, file_path, updated_at)
          VALUES (
            ${chunk.doc_id},
            ${chunk.chunk_index},
            ${chunk.content},
            ${embeddingStr}::vector,
            ${chunk.category},
            ${chunk.systems},
            ${chunk.tags},
            ${chunk.source},
            ${chunk.source_url},
            ${chunk.file_path},
            ${chunk.updated_at}
          )
        `;
      }

      // Rate limit: 100ms between batches
      if (i + batchSize < chunks.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    console.log(`  ✓ ${entry.doc_id} — ${chunks.length} chunks`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`SKAI ingest complete`);
  console.log(`Docs processed: ${docsProcessed}`);
  console.log(`Chunks created: ${totalChunks}`);
  console.log(`Skipped (external): ${external.length}`);
  console.log(`Skipped (missing file): ${docsSkipped}`);
  console.log(`Duration: ${duration}s`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Ingest failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
