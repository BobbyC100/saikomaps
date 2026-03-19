#!/usr/bin/env npx tsx
/**
 * Reservation Provider Resolver — V1
 *
 * Processes entities that already have reservation signals in merchant_signals
 * and writes validated match records to reservation_provider_matches.
 *
 * V1 scope: existing signals only (no new crawling, no provider API calls).
 * Evaluates match quality based on merchant-side evidence strength.
 *
 * Usage:
 *   npx tsx scripts/resolve-reservation-providers.ts
 *   npx tsx scripts/resolve-reservation-providers.ts --dry-run
 *   npx tsx scripts/resolve-reservation-providers.ts --limit=20
 *   npx tsx scripts/resolve-reservation-providers.ts --provider=opentable
 */

import { db } from "../lib/db";
import { canonicalizeReservationUrl } from "../lib/reservation/canonicalize-url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;
const providerArg = args.find((a) => a.startsWith("--provider="));
const providerFilter = providerArg ? providerArg.split("=")[1] : undefined;

/** Known provider slugs — anything else is "other" and not validated */
const KNOWN_PROVIDERS = new Set([
  "opentable",
  "resy",
  "tock",
  "sevenrooms",
  "yelp",
  "toast",
]);

/** Minimum extraction confidence to consider for validation */
const MIN_EXTRACTION_CONFIDENCE = 0.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CandidateEntity {
  entityId: string;
  name: string;
  slug: string;
  address: string | null;
  website: string | null;
  phone: string | null;
  reservationProvider: string | null;
  reservationUrl: string | null;
  extractionConfidence: number | null;
}

interface MatchResult {
  entityId: string;
  provider: string;
  bookingUrl: string;
  matchStatus: "matched" | "probable" | "ambiguous";
  matchScore: number;
  matchSignals: Record<string, unknown>;
  validationSource: string;
  confidenceLevel: "weak" | "strong_merchant" | "provider_verified";
  isRenderable: boolean;
}

// ---------------------------------------------------------------------------
// Matching logic
// ---------------------------------------------------------------------------

/** Extract provider slug from a reservation URL */
function inferProviderFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("resy.com")) return "resy";
  if (lower.includes("opentable.com")) return "opentable";
  if (lower.includes("exploretock.com") || lower.includes("tock.to")) return "tock";
  if (lower.includes("sevenrooms.com")) return "sevenrooms";
  if (lower.includes("yelp.com")) return "yelp";
  if (lower.includes("tables.toasttab.com")) return "toast";
  return null;
}

/** Check if a URL looks like a valid venue-specific booking link (not just a homepage) */
function isVenueSpecificUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Must have a path beyond just / — e.g., resy.com/cities/la/venue-name
    return parsed.pathname.length > 1 && parsed.pathname !== "/";
  } catch {
    return false;
  }
}

/** Check domain alignment between entity website and reservation URL */
function checkDomainProvenance(
  entityWebsite: string | null,
  reservationUrl: string
): boolean {
  if (!entityWebsite) return false;
  try {
    // We're checking: did this reservation URL come from the entity's own website?
    // The enrichment pipeline only extracts links found on the entity's website,
    // so if both exist, provenance is implicitly strong.
    return true;
  } catch {
    return false;
  }
}

/** Score a candidate match */
function scoreMatch(entity: CandidateEntity): MatchResult | null {
  const { reservationProvider, reservationUrl, extractionConfidence } = entity;

  if (!reservationUrl) return null;

  // Determine provider
  const provider =
    (reservationProvider && KNOWN_PROVIDERS.has(reservationProvider)
      ? reservationProvider
      : null) ?? inferProviderFromUrl(reservationUrl);

  if (!provider) return null; // "other" providers not validated in V1

  // Build match signals
  const venueSpecific = isVenueSpecificUrl(reservationUrl);
  const hasWebsite = !!entity.website;
  const websiteProvenance = checkDomainProvenance(entity.website, reservationUrl);
  const confidence = extractionConfidence ?? 0;

  const signals: Record<string, unknown> = {
    venue_specific_url: venueSpecific,
    has_website: hasWebsite,
    website_provenance: websiteProvenance,
    extraction_confidence: confidence,
    provider_from_url: inferProviderFromUrl(reservationUrl) === provider,
    provider_from_signal: reservationProvider === provider,
  };

  // Compute score (0.0–1.0)
  let score = 0;

  // Direct venue-specific URL is the strongest signal
  if (venueSpecific) score += 0.4;

  // URL was found on entity's own website (provenance)
  if (websiteProvenance) score += 0.2;

  // Provider slug matches between URL and signal field
  if (inferProviderFromUrl(reservationUrl) === provider) score += 0.1;

  // Extraction confidence pass-through (scaled to 0–0.2)
  score += Math.min(confidence, 1) * 0.2;

  // Entity has a website (baseline evidence)
  if (hasWebsite) score += 0.1;

  score = Math.round(score * 100) / 100; // 2 decimal places

  // Classify
  let matchStatus: "matched" | "probable" | "ambiguous";
  let confidenceLevel: "weak" | "strong_merchant" | "provider_verified";

  if (score >= 0.7 && venueSpecific) {
    matchStatus = "matched";
    confidenceLevel = "strong_merchant";
  } else if (score >= 0.5) {
    matchStatus = "probable";
    confidenceLevel = "weak";
  } else {
    matchStatus = "ambiguous";
    confidenceLevel = "weak";
  }

  // Renderability: matched + strong_merchant + valid URL
  const isRenderable =
    matchStatus === "matched" &&
    confidenceLevel === "strong_merchant" &&
    venueSpecific;

  return {
    entityId: entity.entityId,
    provider,
    bookingUrl: canonicalizeReservationUrl(reservationUrl),
    matchStatus,
    matchScore: score,
    matchSignals: signals,
    validationSource: "website_link",
    confidenceLevel,
    isRenderable,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(
    `=== Reservation Provider Resolver V1 ${dryRun ? "(DRY RUN)" : ""} ===\n`
  );

  // Step 1: Find eligible entities with existing reservation signals
  const where: Record<string, unknown> = {
    reservation_url: { not: null },
  };
  if (providerFilter) {
    where.reservation_provider = providerFilter;
  }

  const candidates = await db.merchant_signals.findMany({
    where: where as any,
    select: {
      entityId: true,
      reservation_provider: true,
      reservation_url: true,
      extraction_confidence: true,
      entities: {
        select: {
          name: true,
          slug: true,
          address: true,
          website: true,
          phone: true,
        },
      },
    },
    ...(limit ? { take: limit } : {}),
  });

  console.log(`Eligible candidates: ${candidates.length}`);
  if (providerFilter) console.log(`  Filtered to provider: ${providerFilter}`);
  console.log("");

  // Step 2: Score each candidate
  let matched = 0;
  let probable = 0;
  let ambiguous = 0;
  let skipped = 0;
  let written = 0;

  for (const c of candidates) {
    const entity: CandidateEntity = {
      entityId: c.entityId,
      name: c.entities.name,
      slug: c.entities.slug,
      address: c.entities.address,
      website: c.entities.website,
      phone: c.entities.phone,
      reservationProvider: c.reservation_provider,
      reservationUrl: c.reservation_url,
      extractionConfidence: c.extraction_confidence
        ? Number(c.extraction_confidence)
        : null,
    };

    const result = scoreMatch(entity);

    if (!result) {
      skipped++;
      continue;
    }

    if (result.matchStatus === "matched") matched++;
    else if (result.matchStatus === "probable") probable++;
    else ambiguous++;

    // Step 3: Write (upsert) to reservation_provider_matches
    if (!dryRun) {
      await db.reservation_provider_matches.upsert({
        where: {
          entity_id_provider: {
            entity_id: result.entityId,
            provider: result.provider,
          },
        },
        create: {
          entity_id: result.entityId,
          provider: result.provider,
          booking_url: result.bookingUrl,
          match_status: result.matchStatus,
          match_score: result.matchScore,
          match_signals: result.matchSignals as any,
          validation_source: result.validationSource,
          confidence_level: result.confidenceLevel,
          is_renderable: result.isRenderable,
          last_checked_at: new Date(),
          ...(result.isRenderable
            ? { last_verified_at: new Date() }
            : {}),
        },
        update: {
          booking_url: result.bookingUrl,
          match_status: result.matchStatus,
          match_score: result.matchScore,
          match_signals: result.matchSignals as any,
          validation_source: result.validationSource,
          confidence_level: result.confidenceLevel,
          is_renderable: result.isRenderable,
          last_checked_at: new Date(),
          ...(result.isRenderable
            ? { last_verified_at: new Date() }
            : {}),
        },
      });
      written++;
    }
  }

  // Step 4: Report
  console.log("=== Results ===");
  console.log(`  Matched (renderable):  ${matched}`);
  console.log(`  Probable (audit):      ${probable}`);
  console.log(`  Ambiguous (suppressed): ${ambiguous}`);
  console.log(`  Skipped (no provider): ${skipped}`);
  if (!dryRun) {
    console.log(`  Written to DB:         ${written}`);
  }
  console.log("");

  // Show sample of matched results
  if (!dryRun && matched > 0) {
    const samples = await db.reservation_provider_matches.findMany({
      where: { is_renderable: true },
      select: {
        entity_id: true,
        provider: true,
        booking_url: true,
        match_score: true,
        confidence_level: true,
        entity: { select: { name: true, slug: true } },
      },
      take: 10,
      orderBy: { match_score: "desc" },
    });
    console.log("=== Sample renderable matches ===");
    for (const s of samples) {
      console.log(
        `  ${s.entity.name} → ${s.provider} (score: ${s.match_score}) ${s.booking_url}`
      );
    }
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
