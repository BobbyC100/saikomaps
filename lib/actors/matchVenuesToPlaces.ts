/**
 * Conservative venue → place matching for operator ingestion.
 * Same-origin URL slug match → ~0.85; else name token overlap vs small place set.
 * Only set place_id when score >= 0.70 and best match clearly beats runner-up.
 */

import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import type { VenueFound } from "@/lib/website-enrichment/operator-extract";

const SAME_ORIGIN_SLUG_SCORE = 0.85;
const MIN_SCORE_TO_LINK = 0.7;
const NAME_QUERY_LIMIT = 5;
const MIN_GAP_TO_DECIDE = 0.15;

export interface MatchResult {
  placeId: string | null;
  matchScore: number;
  matchReason: string;
}

function getOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Extract slug-like token from path (e.g. /gjelina or /restaurants/gjelina → gjelina) */
function slugFromSameOriginUrl(venueUrl: string, actorWebsiteOrigin: string): string | null {
  try {
    const u = new URL(venueUrl);
    if (u.origin !== actorWebsiteOrigin) return null;
    const path = u.pathname.replace(/^\/+|\/+$/g, "").split("/");
    const last = path[path.length - 1];
    if (!last || last.length < 2) return null;
    const slugLike = last.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    return slugLike || null;
  } catch {
    return null;
  }
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B| */
function jaccardScore(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Match a single venue to places. Returns placeId only when confident.
 * @param client - Optional Prisma client (use when db from static import is undefined in runtime)
 */
export async function matchVenueToPlaces(
  venue: VenueFound,
  actorWebsite: string,
  client?: PrismaClient
): Promise<MatchResult> {
  const prisma = client ?? db;
  const placesDelegate = prisma?.entities;
  if (!placesDelegate?.findFirst) {
    throw new Error("Prisma client not initialized: places delegate missing");
  }
  const actorOrigin = getOrigin(actorWebsite);
  if (!actorOrigin) {
    return { placeId: null, matchScore: 0, matchReason: "no_actor_origin" };
  }

  // 1) Same-origin URL → slug match (places.slug contains token)
  if (venue.url) {
    const slugToken = slugFromSameOriginUrl(venue.url, actorOrigin);
    if (slugToken) {
      const exact = await placesDelegate.findFirst({
        where: { slug: slugToken },
        select: { id: true },
      });
      if (exact) {
        return {
          placeId: exact.id,
          matchScore: SAME_ORIGIN_SLUG_SCORE,
          matchReason: "same_origin_url_slug_match",
        };
      }
      const contains = await placesDelegate.findMany({
        where: { slug: { contains: slugToken, mode: "insensitive" } },
        select: { id: true },
        take: 2,
      });
      if (contains.length === 1) {
        return {
          placeId: contains[0].id,
          matchScore: SAME_ORIGIN_SLUG_SCORE,
          matchReason: "same_origin_url_slug_match",
        };
      }
    }
  }

  // 2) Name similarity vs small place set (by name search)
  const name = venue.name.trim();
  if (!name) {
    return { placeId: null, matchScore: 0, matchReason: "no_match_found" };
  }

  const candidates = await placesDelegate.findMany({
    where: {
      name: { contains: name.split(/\s+/)[0], mode: "insensitive" },
    },
    take: NAME_QUERY_LIMIT,
    select: { id: true, name: true, slug: true },
  });

  if (candidates.length === 0) {
    return { placeId: null, matchScore: 0, matchReason: "no_match_found" };
  }

  const scored = candidates.map((p) => ({
    id: p.id,
    score: jaccardScore(name, p.name),
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const second = scored[1];

  if (best.score < MIN_SCORE_TO_LINK) {
    return { placeId: null, matchScore: best.score, matchReason: "no_match_found" };
  }
  if (second && best.score - second.score < MIN_GAP_TO_DECIDE) {
    return { placeId: null, matchScore: best.score, matchReason: "ambiguous" };
  }

  return {
    placeId: best.id,
    matchScore: best.score,
    matchReason: "jaccard",
  };
}

export interface CandidateRow {
  candidateName: string;
  candidateUrl: string | null;
  candidateAddress: string | null;
  sourceUrl: string;
  placeId: string | null;
  matchScore: number;
  matchReason: string;
}

/**
 * Match all venues to places; return candidate rows for persistence.
 * @param client - Optional Prisma client (use when db from static import is undefined in runtime)
 */
export async function matchVenuesToPlaces(
  venues: VenueFound[],
  actorWebsite: string,
  client?: PrismaClient
): Promise<CandidateRow[]> {
  const rows: CandidateRow[] = [];
  for (const venue of venues) {
    const result = await matchVenueToPlaces(venue, actorWebsite, client);
    rows.push({
      candidateName: venue.name,
      candidateUrl: venue.url ?? null,
      candidateAddress: venue.address ?? null,
      sourceUrl: venue.source_url,
      placeId: result.placeId,
      matchScore: result.matchScore,
      matchReason: result.matchReason,
    });
  }
  return rows;
}
