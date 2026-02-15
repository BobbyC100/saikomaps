import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GetActiveOverlaysParams {
  placeId: string;
  now?: Date;
}

/**
 * Queries active overlays for a place at a given time.
 * Returns overlays where startsAt <= now AND endsAt > now.
 * 
 * @param params - Query parameters
 * @returns Array of active operational overlays
 */
export async function getActiveOverlays(params: GetActiveOverlaysParams) {
  const { placeId, now = new Date() } = params;

  const activeOverlays = await prisma.operational_overlays.findMany({
    where: {
      placeId,
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
