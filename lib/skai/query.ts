import { db } from '@/lib/db';

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

function normalizeTopK(topK?: number): number {
  if (!topK || Number.isNaN(topK)) return 5;
  return Math.min(Math.max(Math.trunc(topK), 1), 12);
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
  const rows = await db.$queryRawUnsafe<RawChunkRow[]>(sql, ...bindings);

  if (rows.length > 0) {
    return rows.map((row) => ({
      doc_id: row.doc_id,
      content: row.content,
      similarity: Number(row.similarity) || 0,
    }));
  }

  // Fallback: token-wise lexical match when full-text returns no rows.
  const tokens = question
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 8);

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
}
