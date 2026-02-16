import { PrismaClient, OverlayType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface ApproveSignalToOverlayParams {
  proposedSignalId: string;
  startsAt: Date;
  endsAt: Date;
  overlayType: OverlayType;
  overrideData?: Record<string, any>;
}

/**
 * Approves a proposed signal and creates an operational overlay.
 * Phase 1: Manual approval only.
 * 
 * Defensive checks:
 * - Signal must be in 'proposed' status
 * - No overlapping overlays for the same place
 * - endsAt must be after startsAt
 * 
 * @param params - Approval parameters
 * @returns The created operational overlay
 */
export async function approveSignalToOverlay(params: ApproveSignalToOverlayParams) {
  const { proposedSignalId, startsAt, endsAt, overlayType, overrideData } = params;

  // Validate required params
  if (!startsAt || !endsAt) {
    throw new Error('startsAt and endsAt are required');
  }

  if (!(startsAt instanceof Date) || !(endsAt instanceof Date)) {
    throw new Error('startsAt and endsAt must be Date objects');
  }

  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
    throw new Error('startsAt and endsAt must be valid Date objects');
  }

  // Validate time bounds
  if (endsAt <= startsAt) {
    throw new Error('endsAt must be after startsAt');
  }

  // Load the proposed signal
  const signal = await prisma.proposed_signals.findUnique({
    where: { id: proposedSignalId },
  });

  if (!signal) {
    throw new Error(`Proposed signal ${proposedSignalId} not found`);
  }

  if (signal.status !== 'proposed') {
    throw new Error(
      `Signal ${proposedSignalId} cannot be approved (status: ${signal.status})`
    );
  }

  // Check for overlapping overlays (defensive overlap check)
  // Blocks ANY overlap for same place (safest strategy for Phase 1)
  const overlappingOverlays = await prisma.operational_overlays.findMany({
    where: {
      placeId: signal.placeId,
      OR: [
        // New overlay starts during existing overlay
        {
          AND: [
            { startsAt: { lte: startsAt } },
            { endsAt: { gt: startsAt } },
          ],
        },
        // New overlay ends during existing overlay
        {
          AND: [
            { startsAt: { lt: endsAt } },
            { endsAt: { gte: endsAt } },
          ],
        },
        // New overlay completely contains existing overlay
        {
          AND: [
            { startsAt: { gte: startsAt } },
            { endsAt: { lte: endsAt } },
          ],
        },
        // Existing overlay completely contains new overlay
        {
          AND: [
            { startsAt: { lte: startsAt } },
            { endsAt: { gte: endsAt } },
          ],
        },
      ],
    },
  });

  if (overlappingOverlays.length > 0) {
    const overlayDetails = overlappingOverlays
      .map((o) => `${o.overlayType} [${o.startsAt.toISOString()} → ${o.endsAt.toISOString()}]`)
      .join(', ');
    throw new Error(
      `Cannot approve: ${overlappingOverlays.length} overlapping overlay(s) exist for place ${signal.placeId} ` +
        `in time range [${startsAt.toISOString()}, ${endsAt.toISOString()}]. ` +
        `Existing: ${overlayDetails}`
    );
  }

  // Create overlay and update signal status in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const overlay = await tx.operational_overlays.create({
      data: {
        placeId: signal.placeId,
        sourceSignalId: proposedSignalId,
        overlayType,
        startsAt,
        endsAt,
        overrideData: overrideData || Prisma.JsonNull,
        approvalMethod: 'manual',
      },
    });

    await tx.proposed_signals.update({
      where: { id: proposedSignalId },
      data: { status: 'approved' },
    });

    return overlay;
  });

  return result;
}
