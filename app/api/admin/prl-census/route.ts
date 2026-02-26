/**
 * GET /api/admin/prl-census
 * PRL distribution + blockers. Same materialization path as API + evaluator.
 * Gated by ADMIN_DEBUG=true. Returns 404 otherwise (no advertising).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPlaceForPRLBatch,
  computePRL,
  type PRLRequirement,
} from '@/lib/scenesense';

export async function GET(request: NextRequest) {
  if (process.env.ADMIN_DEBUG !== 'true') {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const limitParam = searchParams.get('limit');
    const limitRaw = limitParam ? parseInt(limitParam, 10) : 200;
    const limit = Math.min(Math.max(1, Number.isNaN(limitRaw) ? 200 : limitRaw), 1000);
    const laOnly =
      searchParams.get('laOnly') === '1' || searchParams.get('laOnly') === 'true';

    const places = await fetchPlaceForPRLBatch({ limit, laOnly });

    const countsByPRL: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const blockedFromPRL3: Partial<Record<PRLRequirement, number>> = {};
    let overriddenCount = 0;
    const slugsByPRL: Record<string, string[]> = { 1: [], 2: [], 3: [], 4: [] };

    const results = places.map((p) => ({
      slug: p.slug,
      prlResult: computePRL(p, p.prlOverride),
    }));

    for (const { slug, prlResult } of results) {
      const effective = prlResult.prl as 1 | 2 | 3 | 4;
      countsByPRL[effective]++;

      if (prlResult.hasOverride) {
        overriddenCount++;
      }

      const blocked =
        prlResult.computed_prl < 3 && prlResult.prl < 3;
      if (blocked) {
        for (const req of prlResult.unmetRequirements) {
          blockedFromPRL3[req] = (blockedFromPRL3[req] ?? 0) + 1;
        }
      }

      const arr = slugsByPRL[effective];
      if (arr.length < 5) {
        arr.push(slug);
      }
    }

    // Deterministic sample order: sort by slug
    const sampleSlugsByPRL: Record<string, string[]> = {};
    for (const k of ['1', '2', '3', '4'] as const) {
      sampleSlugsByPRL[k] = slugsByPRL[k].slice().sort();
    }

    const generatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      data: {
        countsByPRL,
        blockedFromPRL3,
        overriddenCount,
        sampleSlugsByPRL,
        generatedAt,
        limit,
        laOnly,
      },
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? 'Unknown error',
        code: err?.code,
      },
      { status: 500 }
    );
  }
}
