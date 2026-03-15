/**
 * SKAI Knowledge Query — stub module
 *
 * This module is referenced by app/api/skai/ask/route.ts but was not
 * previously checked in. Provides the queryKnowledge function signature
 * so the build compiles. Implementation TBD.
 */

export interface KnowledgeChunk {
  doc_id: string;
  content: string;
  similarity: number;
}

export interface QueryKnowledgeParams {
  question: string;
  topK?: number;
  category?: string;
  systems?: string[];
}

export async function queryKnowledge(
  _params: QueryKnowledgeParams,
): Promise<KnowledgeChunk[]> {
  // Stub — returns empty until SKAI retrieval layer is wired
  return [];
}
