/**
 * Write rules (SAIKO spec §9): append run, upsert signals, update places by confidence.
 */

import { db } from "../db";
import type { EnrichmentPayload } from "./types";

const CONFIDENCE_HIGH = 0.75;
const CONFIDENCE_MEDIUM = 0.5;

export async function applyWriteRules(payload: EnrichmentPayload): Promise<void> {
  const { place_id, source_url, final_url, http_status, signals, confidence, notes } = payload;
  const extractionJson = {
    place_id,
    source_url,
    final_url,
    http_status,
    schema_types: payload.schema_types,
    signals: payload.signals,
    confidence: payload.confidence,
    notes: payload.notes,
    raw: payload.raw,
  };

  await db.merchant_enrichment_runs.create({
    data: {
      place_id,
      source_url,
      final_url: final_url ?? undefined,
      fetched_at: new Date(),
      http_status: http_status ?? undefined,
      extraction_json: extractionJson as object,
      confidence,
      cost_usd: 0,
    },
  });

  if (confidence >= CONFIDENCE_MEDIUM) {
    await db.merchant_signals.upsert({
      where: { place_id },
      create: {
        place_id,
        inferred_category: signals.inferred_category ?? undefined,
        inferred_cuisine: signals.inferred_cuisine ?? undefined,
        reservation_provider: signals.reservation_provider ?? undefined,
        reservation_url: signals.reservation_url ?? undefined,
        ordering_provider: signals.ordering_provider ?? undefined,
        ordering_url: signals.ordering_url ?? undefined,
        menu_url: signals.menu_url ?? undefined,
        social_links: signals.social_links ?? undefined,
        extraction_confidence: confidence,
      },
      update: {
        inferred_category: signals.inferred_category ?? undefined,
        inferred_cuisine: signals.inferred_cuisine ?? undefined,
        reservation_provider: signals.reservation_provider ?? undefined,
        reservation_url: signals.reservation_url ?? undefined,
        ordering_provider: signals.ordering_provider ?? undefined,
        ordering_url: signals.ordering_url ?? undefined,
        menu_url: signals.menu_url ?? undefined,
        social_links: signals.social_links ?? undefined,
        extraction_confidence: confidence,
      },
    });
  }

  const place = await db.entities.findUnique({
    where: { id: place_id },
    select: { category: true },
  });

  const status = http_status ?? 0;
  const isBlocked = status === 403;
  const isLowConf = confidence < CONFIDENCE_HIGH;
  const enrichmentStage = isBlocked ? "BLOCKED" : isLowConf ? "LOW_CONF" : "OK";
  const needsReview = isBlocked || isLowConf;

  await db.entities.update({
    where: { id: place_id },
    data: {
      last_enriched_at: new Date(),
      needs_human_review: needsReview,
      enrichment_stage: enrichmentStage,
      ...(confidence >= CONFIDENCE_HIGH &&
        place &&
        (!place.category || place.category.trim() === "")
        ? { category: payload.signals.inferred_category ?? undefined }
        : {}),
    },
  });
}

const CATEGORY_WRITE_CONF = 0.65;
const CATEGORY_ALLOWLIST = new Set([
  "Restaurant",
  "Cafe",
  "Bar",
  "Bakery",
  "Shop",
]);

type CategoryWriteReason =
  | "WRITE_CATEGORY_CONF_0_65_ALLOWLIST"
  | "SKIP_LOW_CONF"
  | "SKIP_NOT_ALLOWLIST"
  | "SKIP_NO_CATEGORY_PREDICTION"
  | "SKIP_VERTICAL_GUARD"
  | "SKIP_CATEGORY_ALREADY_SET";

export type ApplyWriteRulesCategoryOnlyResult = {
  wouldWriteCategory: boolean;
  didWriteCategory: boolean;
};

/** Category-only mode: only write category when missing; set attempt throttle; do NOT touch last_enriched_at/needs_human_review/enrichment_stage. */
export async function applyWriteRulesCategoryOnly(
  payload: EnrichmentPayload,
  options?: { dryRun?: boolean }
): Promise<ApplyWriteRulesCategoryOnlyResult> {
  const dryRun = options?.dryRun ?? false;
  const { place_id, source_url, final_url, http_status, signals, confidence } =
    payload;
  const predictedCategory = signals.inferred_category ?? null;

  const place = await db.entities.findUnique({
    where: { id: place_id },
    select: { category: true, primary_vertical: true },
  });

  let reason: CategoryWriteReason;
  let shouldWriteCategory = false;

  if (confidence < CATEGORY_WRITE_CONF) {
    reason = "SKIP_LOW_CONF";
  } else if (!predictedCategory || !predictedCategory.trim()) {
    reason = "SKIP_NO_CATEGORY_PREDICTION";
  } else if (!CATEGORY_ALLOWLIST.has(predictedCategory)) {
    reason = "SKIP_NOT_ALLOWLIST";
  } else if (place?.primary_vertical === "STAY") {
    reason = "SKIP_VERTICAL_GUARD";
  } else if (!place || place.category?.trim()) {
    reason = "SKIP_CATEGORY_ALREADY_SET";
  } else {
    reason = "WRITE_CATEGORY_CONF_0_65_ALLOWLIST";
    shouldWriteCategory = true;
  }

  const extractionJson = {
    place_id,
    source_url,
    final_url,
    http_status,
    schema_types: payload.schema_types,
    signals: payload.signals,
    confidence: payload.confidence,
    notes: payload.notes,
    raw: payload.raw,
    category_write_reason: reason,
  };

  if (!dryRun) {
  await db.merchant_enrichment_runs.create({
    data: {
      place_id,
      source_url,
      final_url: final_url ?? undefined,
      fetched_at: new Date(),
      http_status: http_status ?? undefined,
      extraction_json: extractionJson as object,
      confidence,
      cost_usd: 0,
    },
  });

  if (confidence >= CONFIDENCE_MEDIUM) {
    await db.merchant_signals.upsert({
      where: { place_id },
      create: {
        place_id,
        inferred_category: signals.inferred_category ?? undefined,
        inferred_cuisine: signals.inferred_cuisine ?? undefined,
        reservation_provider: signals.reservation_provider ?? undefined,
        reservation_url: signals.reservation_url ?? undefined,
        ordering_provider: signals.ordering_provider ?? undefined,
        ordering_url: signals.ordering_url ?? undefined,
        menu_url: signals.menu_url ?? undefined,
        social_links: signals.social_links ?? undefined,
        extraction_confidence: confidence,
      },
      update: {
        inferred_category: signals.inferred_category ?? undefined,
        inferred_cuisine: signals.inferred_cuisine ?? undefined,
        reservation_provider: signals.reservation_provider ?? undefined,
        reservation_url: signals.reservation_url ?? undefined,
        ordering_provider: signals.ordering_provider ?? undefined,
        ordering_url: signals.ordering_url ?? undefined,
        menu_url: signals.menu_url ?? undefined,
        social_links: signals.social_links ?? undefined,
        extraction_confidence: confidence,
      },
    });
  }

  await db.entities.update({
    where: { id: place_id },
    data: {
      category_enrich_attempted_at: new Date(),
      ...(shouldWriteCategory && predictedCategory
        ? { category: predictedCategory }
        : {}),
    },
  });
  }

  return {
    wouldWriteCategory: shouldWriteCategory,
    didWriteCategory: !dryRun && shouldWriteCategory,
  };
}
