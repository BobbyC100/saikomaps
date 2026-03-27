/**
 * Auto-Resolve Ambiguous Intake Row
 * POST /api/admin/intake/resolve
 *
 * Takes an ambiguous place name, searches Google Places API,
 * and resolves it by either matching to an existing entity or
 * creating a new one with the GPID + details attached.
 *
 * This replaces the manual "Google the name → copy link → paste" workflow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchPlace, getPlaceDetails } from '@/lib/google-places';
import { jaroWinklerSimilarity, normalizeName } from '@/lib/similarity';
import slugify from 'slugify';
import { randomUUID } from 'crypto';

const LA_CENTER = { latitude: 34.0522, longitude: -118.2437 };
const NAME_SIMILARITY_THRESHOLD = 0.60;

async function generateUniqueSlug(name: string, neighborhood?: string): Promise<string> {
  let base = slugify(name, { lower: true, strict: true });
  if (neighborhood) {
    base = `${base}-${slugify(neighborhood, { lower: true, strict: true })}`;
  }
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await db.entities.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

/** Extract bare domain from a URL */
function websiteDomain(url: string): string {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, neighborhood } = body as { name: string; neighborhood?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // 1. Search Google Places
    const searchQuery = neighborhood
      ? `${name}, ${neighborhood}, Los Angeles`
      : `${name}, Los Angeles`;

    let results;
    try {
      results = await searchPlace(searchQuery, {
        maxResults: 3,
        locationBias: LA_CENTER,
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Google Places search failed', message: err.message },
        { status: 502 },
      );
    }

    if (results.length === 0) {
      return NextResponse.json({
        result: {
          input: name,
          outcome: 'no_results',
          message: 'No Google Places results found.',
        },
      });
    }

    // 2. Find the best result with acceptable name similarity
    let bestResult = null;
    let bestDetails = null;

    for (const r of results) {
      const similarity = jaroWinklerSimilarity(
        normalizeName(name),
        normalizeName(r.name),
      );
      if (similarity >= NAME_SIMILARITY_THRESHOLD) {
        bestResult = r;
        break;
      }
    }

    if (!bestResult) {
      // Top results all had low name similarity
      return NextResponse.json({
        result: {
          input: name,
          outcome: 'no_results',
          message: `Google returned results but none matched the name closely enough (best: "${results[0].name}").`,
        },
      });
    }

    // 3. Get full details for the best result
    try {
      bestDetails = await getPlaceDetails(bestResult.placeId);
    } catch {
      // Fall through with just the search result data
    }

    const gpid = bestResult.placeId;
    const website = bestDetails?.website || undefined;
    const resolvedNeighborhood = neighborhood || undefined;

    // 4. Dedup: check if this GPID already exists in the DB
    const byGpid = await db.entities.findUnique({
      where: { googlePlaceId: gpid },
      select: { id: true, slug: true, name: true, status: true, googlePlaceId: true },
    });

    if (byGpid) {
      return NextResponse.json({
        result: {
          input: name,
          outcome: 'matched',
          entity: { ...byGpid, status: byGpid.status as string },
          resolvedVia: 'gpid',
          googleName: bestResult.name,
        },
      });
    }

    // 5. Dedup: check if the website domain matches an existing entity
    if (website) {
      const domain = websiteDomain(website);
      const allWithWebsite = await db.entities.findMany({
        where: { website: { not: null } },
        select: { id: true, slug: true, name: true, status: true, googlePlaceId: true, website: true },
      });
      const websiteMatch = allWithWebsite.find(
        (e) => e.website && websiteDomain(e.website) === domain,
      );
      if (websiteMatch) {
        // Update the existing entity's GPID if it doesn't have one
        if (!websiteMatch.googlePlaceId) {
          await db.entities.update({
            where: { id: websiteMatch.id },
            data: { googlePlaceId: gpid },
          });
        }
        return NextResponse.json({
          result: {
            input: name,
            outcome: 'matched',
            entity: {
              id: websiteMatch.id,
              slug: websiteMatch.slug,
              name: websiteMatch.name,
              status: websiteMatch.status as string,
              googlePlaceId: websiteMatch.googlePlaceId || gpid,
            },
            resolvedVia: 'website',
            googleName: bestResult.name,
          },
        });
      }
    }

    // 6. No existing entity matched — create a new CANDIDATE with GPID + details
    const slug = await generateUniqueSlug(name, resolvedNeighborhood);
    const entity = await db.entities.create({
      data: {
        id: randomUUID(),
        slug,
        name,
        googlePlaceId: gpid,
        website: website || undefined,
        neighborhood: resolvedNeighborhood,
        primaryVertical: 'EAT',
        status: 'CANDIDATE',
        enrichmentStatus: 'INGESTED',
        publicationStatus: 'UNPUBLISHED',
      },
      select: { id: true, slug: true, name: true, status: true, googlePlaceId: true },
    });

    return NextResponse.json({
      result: {
        input: name,
        outcome: 'created',
        entity: { ...entity, status: entity.status as string },
        resolvedVia: 'google_places_new',
        googleName: bestResult.name,
      },
    });
  } catch (error: any) {
    console.error('[Intake Resolve] Error:', error);
    return NextResponse.json(
      { error: 'Resolve failed', message: error.message },
      { status: 500 },
    );
  }
}
