import { ProposedSignalType } from '@prisma/client';
import { createProposedSignal } from '../signals/createProposedSignal';

interface ProcessNewsletterToSignalParams {
  placeId: string;
  newsletterId: string;
  extractedTemporalData: {
    startsAt?: string;
    endsAt?: string;
    [key: string]: any;
  };
  signalType: ProposedSignalType;
  evidenceExcerpt?: string;
  confidenceScore?: number;
}

/**
 * Processes extracted newsletter data into a proposed signal.
 * 
 * Phase 1: Extraction stub — no parsing logic.
 * This function assumes extraction has already happened upstream.
 * 
 * Behavior:
 * - Validates place exists (via createProposedSignal)
 * - Creates proposed signal with status='proposed'
 * - sourceType = 'newsletter_email'
 * - sourceId = newsletterId
 * - NO auto-approval
 * 
 * @param params - Newsletter extraction parameters
 * @returns The created proposed signal
 * @throws Error if place doesn't exist or validation fails
 */
export async function processNewsletterToSignal(params: ProcessNewsletterToSignalParams) {
  const {
    placeId,
    newsletterId,
    extractedTemporalData,
    signalType,
    evidenceExcerpt,
    confidenceScore,
  } = params;

  // Validate required fields
  if (!placeId || !newsletterId || !signalType) {
    throw new Error('placeId, newsletterId, and signalType are required');
  }

  // Call createProposedSignal (which validates place existence)
  const signal = await createProposedSignal({
    placeId,
    sourceId: newsletterId,
    signalType,
    extractedData: extractedTemporalData,
    evidenceExcerpt,
    confidenceScore,
  });

  return signal;
}
