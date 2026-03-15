---
doc_id: SKAI/RETRIEVAL-LAYER-V1
doc_type: architecture
title: SKAI Retrieval Layer v1
version: "1.0"
status: active
owner: Bobby Ciccaglione
created: 2026-03-14
last_updated: 2026-03-14
project_id: KNOWLEDGE-SYSTEM
summary: >-
  Architecture spec for the SKAI retrieval layer — ingestion pipeline, chunking strategy,
  pgvector storage, and semantic query function. Covers skai_chunks table, OpenAI
  text-embedding-3-small embeddings, and the queryKnowledge API.
systems:
  - knowledge-system
related_docs:
  - docs/skai/research-ai-knowledge-architecture-v1.md
  - docs/skai/decision-index-spec-v1.md
  - docs/system/document-registry-audit.md
category: operations
tags: [skai, retrieval, embeddings, pgvector, rag]
source: repo
---

# SKAI Retrieval Layer v1

## 1. Purpose

This document specifies the retrieval layer that sits between the SKAI document
registry (`docs/registry.json`) and any downstream consumer (bot, UI, CLI). It
converts registered documents into embedded chunks stored in Neon pgvector and
exposes a typed query function for semantic search.

Everything downstream calls `queryKnowledge()`. This is the knowledge API.

---

## 2. System Position

```
docs/registry.json        document-level index (68 entries, M1)
     ↓
scripts/skai-ingest.ts    ingestion: read → chunk → embed → upsert
     ↓
skai_chunks (pgvector)    269 chunks, 1536-dim embeddings
     ↓
lib/skai/query.ts         queryKnowledge() — semantic search API
     ↓
[consumers]               bot, UI, CLI (future milestones)
```

---

## 3. Storage — `skai_chunks` Table

Created via Prisma migration `20260314000000_add_skai_chunks`.

| Column       | Type              | Notes                                    |
|-------------|-------------------|------------------------------------------|
| id          | SERIAL PK         | Auto-increment                           |
| doc_id      | TEXT NOT NULL      | References registry entry                |
| chunk_index | INTEGER NOT NULL  | 0-based position within parent doc       |
| content     | TEXT NOT NULL      | Raw chunk text (no header)               |
| embedding   | vector(1536)      | OpenAI text-embedding-3-small            |
| category    | TEXT              | From registry entry                      |
| systems     | TEXT[]            | From registry entry                      |
| tags        | TEXT[]            | From registry entry                      |
| source      | TEXT DEFAULT 'repo' | repo or external                       |
| source_url  | TEXT              | For external sources                     |
| file_path   | TEXT              | Relative path from repo root             |
| updated_at  | TIMESTAMPTZ       | From registry last_updated               |
| created_at  | TIMESTAMPTZ       | Row creation time                        |

### Indexes

- **IVFFlat** on `embedding` with `vector_cosine_ops` (lists = 100) — fast approximate nearest-neighbor
- **B-tree** on `doc_id` — enables efficient delete-then-insert during re-ingestion
- **B-tree** on `category` — pre-filter before vector search

---

## 4. Ingestion Pipeline

**Script:** `scripts/skai-ingest.ts`

### Flow

1. Read `docs/registry.json`
2. For each entry, read the file from `path` (resolved relative to repo root)
3. Skip entries where `source: "external"` (no local file)
4. Chunk the content (see §5)
5. Prepend a context header for embedding only (not stored in `content`)
6. Embed chunks in batches of 20 via OpenAI `text-embedding-3-small`
7. Delete existing chunks for this `doc_id`, then insert fresh (idempotent upsert)

### Context Header (embedding only)

```
Doc: {doc_id} | Category: {category} | Systems: {systems}
---
{chunk_content}
```

The header improves retrieval accuracy by giving the embedding model document-level
context. It is **not** stored in the `content` column — only the raw chunk text is stored.

### CLI

```bash
npx tsx scripts/skai-ingest.ts              # ingest all docs
npx tsx scripts/skai-ingest.ts --doc SKI/OPS-001   # single doc
npx tsx scripts/skai-ingest.ts --dry-run     # preview only
```

### Rate Limiting

- Batches of 20 chunks
- 100ms delay between batches
- Cost: ~$0.00002/1k tokens (text-embedding-3-small)

### Re-ingestion Safety

Re-running the script is always safe. For each doc:
1. `DELETE FROM skai_chunks WHERE doc_id = ?`
2. Insert all new chunks

No duplicates, no stale data.

---

## 5. Chunking Strategy

| Parameter    | Value       |
|-------------|-------------|
| Target size | 500 tokens (~400 words) |
| Overlap     | 50 tokens between adjacent chunks |
| Boundary    | Paragraph-aware; falls back to sentence splitting |
| Token estimate | ~4 chars per token (English prose heuristic) |

### Rules

- Split at paragraph boundaries (`\n\n+`) where possible
- If a single paragraph exceeds target, split by sentence boundaries
- Never split mid-sentence
- Each chunk carries its parent doc's metadata (doc_id, category, systems, tags, source, file_path, updated_at)

### Current Stats (M3 initial ingest)

- **68 docs** processed
- **269 chunks** created
- **0 external** docs skipped
- Duration: ~52 seconds

---

## 6. Query Function

**Module:** `lib/skai/query.ts`

### Signature

```typescript
interface SKAIQueryOptions {
  question: string;
  topK?: number;        // default: 5
  category?: string;    // filter by category before vector search
  systems?: string[];   // filter by systems overlap
}

interface SKAIChunk {
  doc_id: string;
  content: string;
  category: string;
  systems: string[];
  tags: string[];
  file_path: string;
  similarity: number;   // cosine similarity score 0–1
}

export async function queryKnowledge(
  options: SKAIQueryOptions
): Promise<SKAIChunk[]>
```

### Implementation

1. Embed the question using `text-embedding-3-small`
2. Apply optional `category` and `systems` WHERE clauses
3. Run cosine similarity search via `1 - (embedding <=> query::vector)`
4. Return top-k results ordered by similarity descending
5. Filter out results below similarity threshold

Uses `prisma.$queryRawUnsafe` — Prisma's ORM doesn't support vector operations natively.

---

## 7. Similarity Threshold

**Current threshold: 0.20**

### Why not 0.70?

The original spec called for 0.70, calibrated for `text-embedding-ada-002`. OpenAI's
`text-embedding-3-small` produces lower raw cosine similarity scores — top matches
for well-matched queries come in at 0.25–0.35.

This is a known property of the model, not a quality issue. The embeddings are
more uniformly distributed across the unit sphere, which compresses the similarity
score range.

### Tuning guidance

- **0.20**: Current default. Permissive — returns loosely related content.
- **0.25–0.30**: Good for production use. Filters noise, keeps relevant hits.
- **0.35+**: Strict. Only very close semantic matches. May miss useful context.

The threshold should be tuned based on real query patterns once consumers are built.

---

## 8. Embedding Model

| Property    | Value                     |
|------------|---------------------------|
| Model      | `text-embedding-3-small`  |
| Dimensions | 1536                      |
| Cost       | ~$0.00002 / 1k tokens     |
| Provider   | OpenAI                    |

**Do not use** `text-embedding-ada-002` — it's the previous generation model.

The API key is read from `process.env.OPENAI_API_KEY`. Never hardcoded.

---

## 9. Dependencies

- `openai` npm package (v6.29+)
- pgvector 0.8.0 extension (installed on Neon)
- Prisma Client (for `$queryRaw` / `$executeRaw`)

---

## 10. Open Items

- **Consumers not yet built** — bot, UI, and CLI will call `queryKnowledge()` in future milestones
- **Threshold tuning** — 0.20 is a starting point; tune with real query patterns
- **Decision Index integration** — `decision_index.json` (SKAI/DECISION-INDEX-SPEC-V1) is a separate retrieval layer for atomic decisions; future work may unify or cross-reference
- **Incremental re-ingestion** — currently re-ingests all docs or one doc; no change-detection (compare file hash to skip unchanged docs)
- **Chunk size tuning** — 500-token target may need adjustment based on retrieval quality
