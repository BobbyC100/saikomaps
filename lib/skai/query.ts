import { db } from '@/lib/db';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

interface QueryKnowledgeParams {
  question: string;
  topK?: number;
  category?: string;
  systems?: string[];
}

interface KnowledgeChunk {
  doc_id: string;
  content: string;
  similarity: number;
}

interface RawChunkRow {
  doc_id: string;
  content: string;
  similarity: number;
}

interface RegistryDoc {
  doc_id: string;
  doc_type?: string;
  status?: string;
  title?: string;
  path?: string;
  summary?: string;
  systems?: string[];
}

interface RegistryPayload {
  docs?: RegistryDoc[];
}

let registryDocsCache: RegistryDoc[] | null = null;

function normalizeTopK(topK?: number): number {
  if (!topK || Number.isNaN(topK)) return 5;
  return Math.min(Math.max(Math.trunc(topK), 1), 12);
}

function isMissingSkaiChunksRelationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('42P01') && message.toLowerCase().includes('skai_chunks');
}

async function loadRegistryDocs(): Promise<RegistryDoc[]> {
  if (registryDocsCache) return registryDocsCache;
  const registryPath = path.join(process.cwd(), 'docs', 'registry.json');
  const raw = await readFile(registryPath, 'utf8');
  const parsed = JSON.parse(raw) as RegistryPayload;
  const docs = Array.isArray(parsed.docs) ? parsed.docs : [];
  registryDocsCache = docs;
  return docs;
}

function normalizeTokens(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 8);
}

function scoreRegistryDoc(doc: RegistryDoc, question: string, tokens: string[]): number {
  const title = (doc.title ?? '').toLowerCase();
  const summary = (doc.summary ?? '').toLowerCase();
  const id = (doc.doc_id ?? '').toLowerCase();
  const systems = (doc.systems ?? []).join(' ').toLowerCase();
  const ref = `${title}\n${summary}\n${id}\n${systems}`;
  const q = question.toLowerCase();

  let score = 0;
  if (q && ref.includes(q)) score += 6;
  for (const token of tokens) {
    if (ref.includes(token)) score += 1;
    if (title.includes(token)) score += 0.5;
    if (id.includes(token)) score += 0.5;
  }
  return score;
}

async function queryKnowledgeFromRegistry(params: QueryKnowledgeParams): Promise<KnowledgeChunk[]> {
  const question = params.question.trim();
  if (!question) return [];

  const docs = await loadRegistryDocs();
  const topK = normalizeTopK(params.topK);
  const category = params.category?.trim().toLowerCase() || null;
  const systems = (params.systems ?? []).map((s) => s.trim()).filter(Boolean);
  const tokens = normalizeTokens(question);

  const scored = docs
    .filter((doc) => {
      if (category && (doc.doc_type ?? '').toLowerCase() !== category) return false;
      if (systems.length > 0) {
        const docSystems = new Set((doc.systems ?? []).map((s) => s.trim()));
        if (!systems.some((s) => docSystems.has(s))) return false;
      }
      return true;
    })
    .map((doc) => ({
      doc,
      score: scoreRegistryDoc(doc, question, tokens),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(({ doc, score }) => ({
    doc_id: doc.doc_id,
    similarity: score,
    content: [
      `title: ${doc.title ?? ''}`,
      `path: ${doc.path ?? ''}`,
      `status: ${doc.status ?? ''}`,
      `doc_type: ${doc.doc_type ?? ''}`,
      `systems: ${(doc.systems ?? []).join(', ')}`,
      'summary:',
      doc.summary ?? '',
    ].join('\n'),
  }));
}

export async function queryKnowledge(params: QueryKnowledgeParams): Promise<KnowledgeChunk[]> {
  const question = params.question.trim();
  if (!question) return [];

  const topK = normalizeTopK(params.topK);
  const category = params.category?.trim() || null;
  const systems = (params.systems ?? []).map((s) => s.trim()).filter(Boolean);

  const systemClause =
    systems.length > 0
      ? `AND systems && ARRAY[${systems.map((_, idx) => `$${idx + 4}`).join(', ')}]::text[]`
      : '';

  const sql = `
    WITH scoped AS (
      SELECT
        doc_id,
        content,
        category,
        systems,
        (
          ts_rank_cd(
            to_tsvector('english', content),
            plainto_tsquery('english', $1)
          ) + CASE WHEN content ILIKE ('%' || $1 || '%') THEN 0.5 ELSE 0 END
        ) AS score
      FROM skai_chunks
      WHERE ($2::text IS NULL OR category = $2)
      ${systemClause}
    )
    SELECT doc_id, content, score AS similarity
    FROM scoped
    WHERE score > 0
    ORDER BY score DESC
    LIMIT $3
  `;

  const bindings: Array<string | number | null> = [question, category, topK, ...systems];
  try {
    const rows = await db.$queryRawUnsafe<RawChunkRow[]>(sql, ...bindings);

    if (rows.length > 0) {
      return rows.map((row) => ({
        doc_id: row.doc_id,
        content: row.content,
        similarity: Number(row.similarity) || 0,
      }));
    }

    // Fallback: token-wise lexical match when full-text returns no rows.
    const tokens = normalizeTokens(question);

    if (tokens.length === 0) return [];

    const whereTokenOr = tokens
      .map((_, idx) => `content ILIKE ('%' || $${idx + 4} || '%')`)
      .join(' OR ');
    const tokenBindings = [question, category, topK, ...tokens];

    const fallbackSql = `
      SELECT
        doc_id,
        content,
        (
          ${tokens
            .map((_, idx) => `CASE WHEN content ILIKE ('%' || $${idx + 4} || '%') THEN 1 ELSE 0 END`)
            .join(' + ')}
        )::float AS similarity
      FROM skai_chunks
      WHERE ($2::text IS NULL OR category = $2)
        AND (${whereTokenOr})
      ORDER BY similarity DESC
      LIMIT $3
    `;

    const fallbackRows = await db.$queryRawUnsafe<RawChunkRow[]>(fallbackSql, ...tokenBindings);
    return fallbackRows.map((row) => ({
      doc_id: row.doc_id,
      content: row.content,
      similarity: Number(row.similarity) || 0,
    }));
  } catch (error) {
    if (isMissingSkaiChunksRelationError(error)) {
      return queryKnowledgeFromRegistry(params);
    }
    throw error;
  }
}
