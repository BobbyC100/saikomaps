/**
 * Upsert Actor(kind=operator) from URL ingestion.
 * Website is the idempotency key. Lookup by normalized website only.
 * Does NOT write to place_actor_relationships or restaurant_groups.
 */

import { ActorKind, Visibility } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeWebsite } from "@/lib/utils/normalizeWebsite";
import { resolveUniqueActorSlug } from "@/lib/utils/actorSlug";
import type { OperatorExtractResult } from "@/lib/website-enrichment/operator-extract";

export interface UpsertOperatorActorInput {
  extraction: OperatorExtractResult;
  /** Submitted URL (for audit; stored in sources.url) */
  submittedUrl: string;
  /** Optional Prisma client (use when db from static import is undefined in runtime) */
  db?: PrismaClient;
}

export interface UpsertOperatorActorResult {
  actor: {
    id: string;
    name: string;
    kind: ActorKind;
    slug: string | null;
    website: string | null;
    confidence: number | null;
    sources: unknown;
    visibility: Visibility | null;
  };
  created: boolean;
}

/** Lean Actor.sources — audit-level, includes venues_found for re-run matching */
function buildLeanSources(params: {
  submittedUrl: string;
  confidence: number;
  signals: OperatorExtractResult["signals"];
  venuesFound: OperatorExtractResult["venues_found"];
}): object {
  return {
    seed: "website_enrichment",
    url: params.submittedUrl,
    extracted_at: new Date().toISOString(),
    confidence: params.confidence,
    signals: {
      structured_schema: params.signals.structured_schema,
      locations_page_detected: params.signals.locations_page_detected,
      footer_match: params.signals.footer_match,
    },
    venues_found: params.venuesFound,
  };
}

/**
 * Upsert Actor(kind=operator). Website is the idempotency key.
 * Lookup by normalized website — do NOT lookup by slug first.
 */
export async function upsertOperatorActor(
  input: UpsertOperatorActorInput
): Promise<UpsertOperatorActorResult> {
  const { extraction, submittedUrl, db: dbOverride } = input;
  const prisma = dbOverride ?? db;
  const actorDelegate = prisma?.actor;
  if (!actorDelegate?.findFirst) {
    throw new Error("Prisma client not initialized: actor delegate missing");
  }
  const name = extraction.operator_name ?? "Unknown Operator";
  const confidence = extraction.confidence;
  const visibility = Visibility.INTERNAL;

  const website = normalizeWebsite(extraction.website);

  const leanSources = buildLeanSources({
    submittedUrl,
    confidence,
    signals: extraction.signals,
    venuesFound: extraction.venues_found,
  });

  // Lookup Actor by normalized website (idempotency key)
  const existing = await actorDelegate.findFirst({
    where: { website, kind: "operator" },
    select: { id: true, slug: true, name: true },
  });

  if (existing) {
    const actor = await actorDelegate.update({
      where: { id: existing.id },
      data: {
        name,
        confidence,
        sources: leanSources,
        updatedAt: new Date(),
      },
    });

    return {
      actor: {
        id: actor.id,
        name: actor.name,
        kind: actor.kind,
        slug: actor.slug,
        website: actor.website,
        confidence: actor.confidence,
        sources: actor.sources,
        visibility: actor.visibility,
      },
      created: false,
    };
  }

  const slug = await resolveUniqueActorSlug(name, undefined, prisma);

  const actor = await actorDelegate.create({
    data: {
      name,
      kind: ActorKind.operator,
      slug,
      website,
      confidence,
      sources: leanSources,
      visibility,
    },
  });

  return {
    actor: {
      id: actor.id,
      name: actor.name,
      kind: actor.kind,
      slug: actor.slug,
      website: actor.website,
      confidence: actor.confidence,
      sources: actor.sources,
      visibility: actor.visibility,
    },
    created: true,
  };
}
