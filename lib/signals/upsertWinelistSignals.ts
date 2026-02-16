import { PrismaClient, signal_status } from "@prisma/client";

const prisma = new PrismaClient();

export type AnalyzeResult = {
  status: "ok" | "partial" | "failed";
  payload?: unknown;     // JSON-serializable
  evidence?: unknown;    // JSON-serializable
  confidence?: number;   // 0..1
  error?: string;
};

function sameTimestamp(a?: Date | null, b?: Date | null) {
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

/**
 * Upsert winelist signals for a golden record.
 * 
 * Core rules:
 * - Skip if existing signal has source_scraped_at === golden_record.scraped_at and status === "ok"
 * - Otherwise recompute and upsert
 * - If no winelist_raw_text, record a "failed" row so we don't keep re-trying blindly
 * 
 * @param args - Configuration for upsert
 * @returns Result indicating if skipped or status
 */
export async function upsertWinelistSignalsV1(args: {
  goldenRecordId: string;
  modelVersion?: string;
  forceReprocess?: boolean;
  analyze: (input: { winelistRawText: string; winelistUrl?: string | null }) => Promise<AnalyzeResult>;
}) {
  const { goldenRecordId, modelVersion, forceReprocess = false, analyze } = args;

  const gr = await prisma.golden_records.findUnique({
    where: { canonical_id: goldenRecordId },
    select: {
      canonical_id: true,
      scraped_at: true,
      winelist_raw_text: true,
      winelist_url: true,
    },
  });

  if (!gr) throw new Error(`golden_records not found: ${goldenRecordId}`);

  // If no raw text, record a "failed" (or "partial") row so we don't keep re-trying blindly.
  if (!gr.winelist_raw_text || gr.winelist_raw_text.trim().length === 0) {
    await prisma.winelist_signals.upsert({
      where: { golden_record_id: gr.canonical_id },
      create: {
        golden_record_id: gr.canonical_id,
        schema_version: 1,
        model_version: modelVersion ?? null,
        source_scraped_at: gr.scraped_at ?? null,
        analyzed_at: new Date(),
        status: signal_status.failed,
        error: "No winelist_raw_text available to analyze",
        payload: null,
        evidence: null,
        confidence: null,
      },
      update: {
        schema_version: 1,
        model_version: modelVersion ?? null,
        source_scraped_at: gr.scraped_at ?? null,
        analyzed_at: new Date(),
        status: signal_status.failed,
        error: "No winelist_raw_text available to analyze",
        payload: null,
        evidence: null,
        confidence: null,
        updated_at: new Date(),
      },
    });

    return { skipped: false, status: "failed" as const, reason: "missing_raw_text" as const };
  }

  // Freshness check (skip if --reprocess not set)
  if (!forceReprocess) {
    const existing = await prisma.winelist_signals.findUnique({
      where: { golden_record_id: gr.canonical_id },
      select: { source_scraped_at: true, status: true },
    });

    const isFreshOk =
      existing?.status === signal_status.ok &&
      sameTimestamp(existing?.source_scraped_at, gr.scraped_at);

    if (isFreshOk) {
      return { skipped: true, status: "ok" as const, reason: "fresh" as const };
    }
  }

  // Analyze + write
  let result: AnalyzeResult;
  try {
    result = await analyze({ winelistRawText: gr.winelist_raw_text, winelistUrl: gr.winelist_url });
  } catch (e: any) {
    result = {
      status: "failed",
      error: e?.message ?? "Unknown analysis error",
    };
  }

  const mappedStatus =
    result.status === "ok"
      ? signal_status.ok
      : result.status === "partial"
      ? signal_status.partial
      : signal_status.failed;

  await prisma.winelist_signals.upsert({
    where: { golden_record_id: gr.canonical_id },
    create: {
      golden_record_id: gr.canonical_id,
      schema_version: 1,
      model_version: modelVersion ?? null,
      source_scraped_at: gr.scraped_at ?? null,
      analyzed_at: new Date(),
      status: mappedStatus,
      error: result.error ?? null,
      payload: (result.payload as any) ?? null,
      evidence: (result.evidence as any) ?? null,
      confidence: typeof result.confidence === "number" ? result.confidence : null,
    },
    update: {
      schema_version: 1,
      model_version: modelVersion ?? null,
      source_scraped_at: gr.scraped_at ?? null,
      analyzed_at: new Date(),
      status: mappedStatus,
      error: result.error ?? null,
      payload: (result.payload as any) ?? null,
      evidence: (result.evidence as any) ?? null,
      confidence: typeof result.confidence === "number" ? result.confidence : null,
      updated_at: new Date(),
    },
  });

  return { skipped: false, status: result.status as "ok" | "partial" | "failed" };
}
