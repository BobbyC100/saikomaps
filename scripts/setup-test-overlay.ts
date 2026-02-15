/**
 * Test read path: Create an active overlay and verify it's logged in place API
 */

import { PrismaClient } from '@prisma/client';
import { processNewsletterToSignal } from '../lib/newsletters/processNewsletterToSignal';
import { approveSignalToOverlay } from '../lib/overlays/approveSignalToOverlay';

const prisma = new PrismaClient();

async function setupTestOverlay() {
  console.log('🔧 Setting up test overlay for read-path verification\n');

  const place = await prisma.places.findFirst({
    select: { id: true, name: true, slug: true },
  });

  if (!place) {
    throw new Error('No places found');
  }

  console.log(`Place: ${place.name} (${place.slug})`);
  console.log(`Slug for API: /api/places/${place.slug}\n`);

  // Create a signal that's ACTIVE NOW
  const now = new Date();
  const in30Min = new Date(now.getTime() + 30 * 60 * 1000);

  const signal = await processNewsletterToSignal({
    placeId: place.id,
    newsletterId: 'test-read-path-001',
    extractedTemporalData: {
      startsAt: now.toISOString(),
      endsAt: in30Min.toISOString(),
      reason: 'Temporarily closed for staff meeting',
    },
    signalType: 'hours_override',
    evidenceExcerpt: 'We will be closed for 30 minutes for a staff meeting.',
    confidenceScore: 0.95,
  });

  const overlay = await approveSignalToOverlay({
    proposedSignalId: signal.id,
    startsAt: now,
    endsAt: in30Min,
    overlayType: 'hours_override',
    overrideData: { temporarilyClosed: true, reason: 'staff_meeting' },
  });

  console.log('✅ Active overlay created:');
  console.log(`   Signal ID: ${signal.id}`);
  console.log(`   Overlay ID: ${overlay.id}`);
  console.log(`   Active: NOW → ${in30Min.toISOString()}\n`);

  console.log('📡 Test the read path:');
  console.log(`   curl http://localhost:3000/api/places/${place.slug}`);
  console.log(`   OR visit in browser and check console logs\n`);

  console.log('🧹 To cleanup:');
  console.log(`   psql $DATABASE_URL -c "DELETE FROM operational_overlays WHERE id = '${overlay.id}'; DELETE FROM proposed_signals WHERE id = '${signal.id}';"\n`);
}

setupTestOverlay()
  .catch((error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
