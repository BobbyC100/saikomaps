import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GetActiveOverlaysParams {
  entityId: string;
  now?: Date;
}

/**
 * Queries active overlays for an entity at a given time.
 * Returns overlays where startsAt <= now AND endsAt > now.
 * 
 * @param params - Query parameters
 * @returns Array of active operational overlays
 */
export async function getActiveOverlays(params: GetActiveOverlaysParams) {
  const { entityId, now = new Date() } = params;
  if (!entityId) {
    throw new Error('entityId is required');
  }

  const activeOverlays = await prisma.operational_overlays.findMany({
    where: {
      entityId,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    include: {
      proposed_signal: true,
    },
    orderBy: {
      startsAt: 'desc',
    },
  });

  return activeOverlays;
}
