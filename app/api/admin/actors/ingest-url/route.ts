/**
 * POST /api/admin/actors/ingest-url
 * Admin-only. Submit URL to scrape, extract operator signals, upsert Actor(kind=operator).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { fetchWithLimits } from "@/lib/website-enrichment/fetch";
import {
  extractOperatorSignals,
  extractVenueNamesFromVisibleText,
  extractVenuesFromIndexPageLinks,
  findIndexPageUrl,
} from "@/lib/website-enrichment/operator-extract";
import { parseHtml } from "@/lib/website-enrichment/parse";
import { normalizeUrl } from "@/lib/website-enrichment/url";
import { upsertOperatorActor } from "@/lib/actors/upsertOperatorActor";
import { upsertOperatorPlaceCandidates } from "@/lib/actors/upsertOperatorPlaceCandidates";
import { logPlaceJob } from "@/lib/place-job-log";

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) throw err;
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const { db } = await import("@/lib/db");
    if (!db?.actor || !db?.places || !db?.operatorPlaceCandidate) {
      return NextResponse.json(
        {
          error: "Prisma client not ready",
          success: false,
          message: "Database client missing required delegates",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const urlRaw = typeof body?.url === "string" ? body.url.trim() : null;

    if (!urlRaw) {
      return NextResponse.json(
        { error: "url is required", success: false },
        { status: 400 }
      );
    }

    const url = normalizeUrl(urlRaw);
    if (!isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "url must be http or https" },
        { status: 400 }
      );
    }

    const fetchResult = await fetchWithLimits(url, { respectRobots: true });

    if (fetchResult.status !== 200 || !fetchResult.html) {
      return NextResponse.json(
        {
          error: "Fetch failed",
          status: fetchResult.status,
          success: false,
        },
        { status: 422 }
      );
    }

    const finalUrl = fetchResult.finalUrl ?? url;
    const extraction = extractOperatorSignals({
      url: finalUrl,
      html: fetchResult.html,
    });

    let pagesFetched = 1;
    let venuesMerged = extraction.venues_found;

    const parsed = parseHtml(fetchResult.html);
    const indexPageUrl = findIndexPageUrl(parsed.links, finalUrl);
    if (process.env.NODE_ENV === "development") {
      console.log("[ingest-url] homepage links:", parsed.links.length);
      console.log("[ingest-url] indexPageUrl:", indexPageUrl ?? "(none)");
    }
    if (indexPageUrl) {
      const indexFetch = await fetchWithLimits(indexPageUrl, {
        respectRobots: true,
      });
      if (
        indexFetch.status === 200 &&
        indexFetch.html &&
        indexFetch.html.length > 0
      ) {
        const indexExtraction = extractOperatorSignals({
          url: indexFetch.finalUrl ?? indexPageUrl,
          html: indexFetch.html,
        });
        const linkVenues = extractVenuesFromIndexPageLinks(
          indexFetch.html,
          indexFetch.finalUrl ?? indexPageUrl,
          finalUrl
        );
        const textVenues = extractVenueNamesFromVisibleText(
          indexFetch.html,
          indexFetch.finalUrl ?? indexPageUrl,
          finalUrl
        );
        const byName = new Map<string, (typeof indexExtraction.venues_found)[0]>();
        for (const v of indexExtraction.venues_found) {
          byName.set(v.name.toLowerCase(), v);
        }
        for (const v of linkVenues) {
          const key = v.name.toLowerCase();
          const existing = byName.get(key);
          if (!existing || (v.url && !existing.url)) {
            byName.set(key, v);
          }
        }
        for (const v of textVenues) {
          if (!byName.has(v.name.toLowerCase())) {
            byName.set(v.name.toLowerCase(), v);
          }
        }
        const indexVenues = Array.from(byName.values());
        if (process.env.NODE_ENV === "development") {
          console.log("[ingest-url] indexPageUrl:", indexFetch.finalUrl ?? indexPageUrl);
          console.log("[ingest-url] indexHtmlLength:", indexFetch.html.length);
          console.log("[ingest-url] indexLinkVenuesCount:", linkVenues.length);
          console.log("[ingest-url] indexTextVenuesCount:", textVenues.length);
          console.log("[ingest-url] indexExtraction.venues_found:", indexExtraction.venues_found.length);
          console.log("[ingest-url] mergedVenuesCount:", indexVenues.length);
        }
        const seen = new Set(
          venuesMerged.map((v) => `${v.name}|${v.url ?? ""}`)
        );
        for (const v of indexVenues) {
          const key = `${v.name}|${v.url ?? ""}`;
          if (!seen.has(key)) {
            seen.add(key);
            venuesMerged = [...venuesMerged, v];
          }
        }
        pagesFetched = 2;
      }
    }

    const { actor } = await upsertOperatorActor({
      extraction: { ...extraction, venues_found: venuesMerged },
      submittedUrl: finalUrl,
      db,
    });

    const actorWebsite = extraction.website;
    if (process.env.NODE_ENV === "development") {
      console.log("[ingest-url] venuesMerged_count_before_upsert:", venuesMerged.length);
    }
    const candidates = await upsertOperatorPlaceCandidates({
      actorId: actor.id,
      venues: venuesMerged,
      actorWebsite,
      db,
    });
    if (process.env.NODE_ENV === "development") {
      console.log("[ingest-url] candidates_upserted_count:", candidates.length);
    }

    await logPlaceJob({
      entityId: actor.id,
      entityType: "actor",
      jobType: "OPERATOR_LINK",
      pagesFetched,
      aiCalls: 0,
    });

    return NextResponse.json({
      success: true,
      data: {
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
        confidence: extraction.confidence,
        operator_name_candidates: extraction.operator_name_candidates,
        canonical_domain: extraction.canonical_domain,
        venues_found: venuesMerged,
        candidates,
        pages_fetched: pagesFetched,
      },
    });
  } catch (err) {
    console.error("[ingest-url] Error:", err);
    return NextResponse.json(
      {
        error: "Ingestion failed",
        message: err instanceof Error ? err.message : String(err),
        success: false,
      },
      { status: 500 }
    );
  }
}
