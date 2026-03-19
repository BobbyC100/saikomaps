/**
 * Smart Enrich API
 * POST /api/admin/smart-enrich
 *
 * Cost-optimized entity enrichment. Takes a name, discovers identity via
 * cheap Haiku web search first, scrapes the website for free, then only
 * calls Google Places if there are actual gaps.
 *
 * Body:
 *   { name: string, city?: string, neighborhood?: string, category?: string,
 *     entityId?: string, cheapOnly?: boolean, dryRun?: boolean }
 *
 * Batch:
 *   { names: string[], city?: string, category?: string, cheapOnly?: boolean, dryRun?: boolean }
 *
 * Returns: SmartEnrichResult or SmartEnrichResult[]
 */

import { NextRequest, NextResponse } from 'next/server';
import { smartEnrich } from '@/lib/smart-enrich';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Batch mode
    if (Array.isArray(body.names)) {
      const results = [];
      for (const name of body.names) {
        try {
          const result = await smartEnrich({
            name,
            city: body.city,
            category: body.category,
            cheapOnly: body.cheapOnly,
            dryRun: body.dryRun,
          });
          results.push(result);
        } catch (e) {
          results.push({
            entityId: '',
            slug: '',
            phases: [],
            totalCostEstimate: '$0.00',
            gaps: [`Error: ${e instanceof Error ? e.message : String(e)}`],
          });
        }
      }

      const totalCost = results.reduce((sum, r) => {
        const match = r.totalCostEstimate.match(/\$([0-9.]+)/);
        return sum + (match ? parseFloat(match[1]) : 0);
      }, 0);

      return NextResponse.json({
        action: 'smart-enrich-batch',
        total: results.length,
        succeeded: results.filter((r) => r.entityId).length,
        totalCostEstimate: `$${totalCost.toFixed(2)}`,
        results,
      });
    }

    // Single entity mode
    if (!body.name && !body.entityId) {
      return NextResponse.json(
        { error: 'name or entityId is required' },
        { status: 400 },
      );
    }

    const result = await smartEnrich({
      name: body.name,
      city: body.city,
      neighborhood: body.neighborhood,
      category: body.category,
      entityId: body.entityId,
      cheapOnly: body.cheapOnly,
      dryRun: body.dryRun,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Smart Enrich] Error:', error);
    return NextResponse.json(
      { error: 'Smart enrich failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
