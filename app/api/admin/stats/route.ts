/**
 * Stats API - System health and metrics
 * GET /api/admin/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      pendingCount,
      resolvedToday,
      totalGolden,
      autoLinked,
      totalRaw,
      unprocessedRaw,
      avgDecisionTime,
      recentActivity
    ] = await Promise.all([
      // Pending review items
      prisma.review_queue.count({ 
        where: { status: 'pending' } 
      }),
      
      // Resolved today
      prisma.review_audit_log.count({
        where: {
          resolvedAt: { gte: today }
        }
      }),
      
      // Total entities
      prisma.entities.count(),

      // Auto-linked (legacy entity_links dropped — return 0)
      Promise.resolve(0),
      
      // Total raw records
      prisma.raw_records.count(),
      
      // Unprocessed raw records
      prisma.raw_records.count({
        where: { isProcessed: false }
      }),
      
      // Average decision time (last 100 decisions)
      prisma.review_audit_log.aggregate({
        _avg: { decisionTimeMs: true },
        where: {
          decisionTimeMs: { not: null }
        },
        take: 100,
        orderBy: { resolvedAt: 'desc' }
      }),
      
      // Recent activity (last 10 resolutions)
      prisma.review_audit_log.findMany({
        take: 10,
        orderBy: { resolvedAt: 'desc' },
        include: {
          review_queue: {
            include: {
              raw_record_a: {
                select: { rawJson: true }
              }
            }
          }
        }
      })
    ]);
    
    // Calculate data quality metrics from entities
    const entitiesForQuality = await prisma.entities.findMany({
      select: {
        instagram: true,
        phone: true,
        description: true,
      }
    });

    const qualityMetrics = {
      hasInstagram: entitiesForQuality.filter(e => e.instagram).length,
      hasPhone: entitiesForQuality.filter(e => e.phone).length,
      hasDescription: entitiesForQuality.filter(e => e.description).length,
    };
    
    // Get queue breakdown by conflict type
    const queueByType = await prisma.review_queue.groupBy({
      by: ['conflictType'],
      where: { status: 'pending' },
      _count: true
    });
    
    // Format recent activity
    const formattedActivity = recentActivity.map(log => {
      const rawJson = log.review_queue?.raw_record_a?.rawJson as any;
      return {
        id: log.logId,
        resolution: log.resolution,
        placeName: rawJson?.name || 'Unknown',
        decisionTimeMs: log.decisionTimeMs,
        resolvedAt: log.resolvedAt,
        resolvedBy: log.resolvedBy
      };
    });
    
    return NextResponse.json({
      // Core stats
      pending: pendingCount,
      resolvedToday,
      totalGolden,
      autoLinked,
      
      // Pipeline stats
      totalRaw,
      unprocessedRaw,
      processedPercent: totalRaw > 0 
        ? Math.round(((totalRaw - unprocessedRaw) / totalRaw) * 100) 
        : 0,
      
      // Performance
      avgDecisionTimeMs: avgDecisionTime._avg.decisionTimeMs
        ? Math.round(Number(avgDecisionTime._avg.decisionTimeMs))
        : null,

      // Breakdowns
      queueByType: queueByType.reduce((acc, item) => {
        acc[item.conflictType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      
      // Recent activity
      recentActivity: formattedActivity,
      
      // Backfill needs
      backfillNeeds: {
        missingInstagram: totalGolden - qualityMetrics.hasInstagram,
        missingPhone: totalGolden - qualityMetrics.hasPhone,
        missingDescription: totalGolden - qualityMetrics.hasDescription,
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
