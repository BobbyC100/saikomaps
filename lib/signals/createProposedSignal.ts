import { PrismaClient, SignalSourceType, ProposedSignalType } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateProposedSignalParams {
  placeId: string;
  sourceId: string;
  signalType: ProposedSignalType;
  extractedData: Record<string, any>;
  evidenceExcerpt?: string;
  confidenceScore?: number;
}

/**
 * Creates a proposed signal from newsletter extraction.
 * All signals start with status: 'proposed' and require manual approval in Phase 1.
 * 
 * @param params - Signal creation parameters
 * @returns The created proposed signal
 */
export async function createProposedSignal(params: CreateProposedSignalParams) {
  const {
    placeId,
    sourceId,
    signalType,
    extractedData,
    evidenceExcerpt,
    confidenceScore,
  } = params;

  // Validate place exists (service-layer enforcement)
  const placeExists = await prisma.entities.findUnique({
    where: { id: placeId },
    select: { id: true },
  });

  if (!placeExists) {
    throw new Error(`Place with id '${placeId}' does not exist`);
  }

  // Validate that extractedData has required temporal markers for operational overlays
  if (
    (signalType === 'closure' || signalType === 'hours_override' || signalType === 'event') &&
    (!extractedData.startsAt || !extractedData.endsAt)
  ) {
    throw new Error(
      `Signal type '${signalType}' requires temporal markers (startsAt/endsAt) in extractedData`
    );
  }

  const signal = await prisma.proposed_signals.create({
    data: {
      placeId,
      sourceType: 'newsletter_email' as SignalSourceType,
      sourceId,
      signalType,
      extractedData,
      evidenceExcerpt: evidenceExcerpt || null,
      confidenceScore: confidenceScore || null,
      status: 'proposed',
    },
  });

  return signal;
}
