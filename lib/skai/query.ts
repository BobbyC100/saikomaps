/**
 * SKAI Knowledge Query
 *
 * Semantic search over skai_chunks using pgvector cosine similarity.
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SKAIQueryOptions {
  question: string;
  topK?: number;       // default: 5
  category?: string;   // filter by category before vector search
  systems?: string[];  // filter by systems overlap
}

export interface SKAIChunk {
  doc_id: string;
  content: string;
  category: string;
  systems: string[];
  tags: string[];
  file_path: string;
  similarity: number;  // cosine similarity score 0-1
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export async function queryKnowledge(
  options: SKAIQueryOptions
): Promise<SKAIChunk[]> {
  const { question, topK = 5, category, systems } = options;

  // Embed the question
  const resp = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });
  const embedding = resp.data[0].embedding;
  const embeddingStr = `[${embedding.join(',')}]`;

  // Build dynamic WHERE clauses
  const conditions: string[] = [
    `1 - (embedding <=> '${embeddingStr}'::vector) > 0.20`,
  ];

  if (category) {
    conditions.push(`category = '${category.replace(/'/g, "''")}'`);
  }

  if (systems && systems.length > 0) {
    // Match chunks where systems array overlaps with the requested systems
    const systemsArr = systems.map((s) => `'${s.replace(/'/g, "''")}'`).join(',');
    conditions.push(`systems && ARRAY[${systemsArr}]::text[]`);
  }

  const whereClause = conditions.join(' AND ');

  const results = await prisma.$queryRawUnsafe<
    {
      doc_id: string;
      content: string;
      category: string | null;
      systems: string[];
      tags: string[];
      file_path: string | null;
      similarity: number;
    }[]
  >(
    `SELECT
      doc_id, content, category, systems, tags, file_path,
      1 - (embedding <=> '${embeddingStr}'::vector) AS similarity
    FROM skai_chunks
    WHERE ${whereClause}
    ORDER BY embedding <=> '${embeddingStr}'::vector
    LIMIT ${topK}`
  );

  return results.map((r) => ({
    doc_id: r.doc_id,
    content: r.content,
    category: r.category || '',
    systems: r.systems || [],
    tags: r.tags || [],
    file_path: r.file_path || '',
    similarity: Number(r.similarity),
  }));
}
