-- CreateTable
CREATE TABLE "skai_chunks" (
    "id" SERIAL PRIMARY KEY,
    "doc_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "category" TEXT,
    "systems" TEXT[],
    "tags" TEXT[],
    "source" TEXT NOT NULL DEFAULT 'repo',
    "source_url" TEXT,
    "file_path" TEXT,
    "updated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CreateIndex (IVFFlat for fast approximate nearest-neighbor)
CREATE INDEX ON "skai_chunks" USING ivfflat ("embedding" vector_cosine_ops)
    WITH (lists = 100);

-- CreateIndex
CREATE INDEX "skai_chunks_doc_id_idx" ON "skai_chunks"("doc_id");

-- CreateIndex
CREATE INDEX "skai_chunks_category_idx" ON "skai_chunks"("category");
