/**
 * Test script for tightened validation in approveSignalToOverlay
 */

import { PrismaClient } from '@prisma/client';
import { createProposedSignal } from '../lib/signals/createProposedSignal';
import { approveSignalToOverlay } from '../lib/overlays/approveSignalToOverlay';

const prisma = new PrismaClient();

async function testValidation() {
  console.log('🧪 Testing approveSignalToOverlay validation\n');

  // Get a place
  const place = await prisma.places.findFirst({
    select: { id: true, name: true },
  });

  if (!place) {
    throw new Error('No places found in database');
  }

  console.log(`Using place: ${place.name} (${place.id})\n`);

  // Create a test signal
  const signal = await createProposedSignal({
    placeId: place.id,
    sourceId: 'test-validation-001',
    signalType: 'hours_override',
    extractedData: {
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
    },
  });

  console.log(`✓ Created test signal: ${signal.id}\n`);

  // Test 1: Missing dates
  console.log('Test 1: Missing startsAt');
  try {
    await approveSignalToOverlay({
      proposedSignalId: signal.id,
      startsAt: null as any,
      endsAt: new Date(),
      overlayType: 'hours_override',
    });
    console.log('  ❌ FAILED: Should have thrown error\n');
  } catch (error: any) {
    console.log(`  ✓ PASSED: ${error.message}\n`);
  }

  // Test 2: Invalid Date objects
  console.log('Test 2: Invalid Date (NaN)');
  try {
    await approveSignalToOverlay({
      proposedSignalId: signal.id,
      startsAt: new Date('invalid'),
      endsAt: new Date(),
      overlayType: 'hours_override',
    });
    console.log('  ❌ FAILED: Should have thrown error\n');
  } catch (error: any) {
    console.log(`  ✓ PASSED: ${error.message}\n`);
  }

  // Test 3: endsAt <= startsAt
  console.log('Test 3: endsAt before startsAt');
  const now = new Date();
  const past = new Date(now.getTime() - 3600000);
  try {
    await approveSignalToOverlay({
      proposedSignalId: signal.id,
      startsAt: now,
      endsAt: past,
      overlayType: 'hours_override',
    });
    console.log('  ❌ FAILED: Should have thrown error\n');
  } catch (error: any) {
    console.log(`  ✓ PASSED: ${error.message}\n`);
  }

  // Test 4: Signal not in proposed status
  console.log('Test 4: Create valid overlay, then try to approve same signal again');
  const validStart = new Date(Date.now() + 1000000);
  const validEnd = new Date(Date.now() + 2000000);
  
  const overlay = await approveSignalToOverlay({
    proposedSignalId: signal.id,
    startsAt: validStart,
    endsAt: validEnd,
    overlayType: 'hours_override',
  });
  console.log(`  ✓ Created overlay: ${overlay.id}`);

  try {
    await approveSignalToOverlay({
      proposedSignalId: signal.id,
      startsAt: validStart,
      endsAt: validEnd,
      overlayType: 'hours_override',
    });
    console.log('  ❌ FAILED: Should have thrown error (status not proposed)\n');
  } catch (error: any) {
    console.log(`  ✓ PASSED: ${error.message}\n`);
  }

  // Test 5: Overlapping overlays
  console.log('Test 5: Overlapping overlay detection');
  const signal2 = await createProposedSignal({
    placeId: place.id,
    sourceId: 'test-validation-002',
    signalType: 'closure',
    extractedData: {
      startsAt: new Date(Date.now() + 1500000).toISOString(),
      endsAt: new Date(Date.now() + 1800000).toISOString(),
    },
  });

  try {
    await approveSignalToOverlay({
      proposedSignalId: signal2.id,
      startsAt: new Date(Date.now() + 1500000), // Overlaps with existing overlay
      endsAt: new Date(Date.now() + 1800000),
      overlayType: 'closure',
    });
    console.log('  ❌ FAILED: Should have detected overlap\n');
  } catch (error: any) {
    console.log(`  ✓ PASSED: ${error.message}\n`);
  }

  // Test 6: Unique constraint on sourceSignalId (double approval)
  console.log('Test 6: Unique constraint on sourceSignalId');
  const signal3 = await createProposedSignal({
    placeId: place.id,
    sourceId: 'test-validation-003',
    signalType: 'event',
    extractedData: {
      startsAt: new Date(Date.now() + 10000000).toISOString(),
      endsAt: new Date(Date.now() + 11000000).toISOString(),
    },
  });

  const overlay3 = await approveSignalToOverlay({
    proposedSignalId: signal3.id,
    startsAt: new Date(Date.now() + 10000000),
    endsAt: new Date(Date.now() + 11000000),
    overlayType: 'event',
  });
  console.log(`  ✓ Created overlay: ${overlay3.id}`);

  // Manually try to create duplicate overlay (bypassing status check)
  try {
    await prisma.operational_overlays.create({
      data: {
        placeId: place.id,
        sourceSignalId: signal3.id, // Same signal ID
        overlayType: 'event',
        startsAt: new Date(Date.now() + 12000000),
        endsAt: new Date(Date.now() + 13000000),
        approvalMethod: 'manual',
      },
    });
    console.log('  ❌ FAILED: Should have violated unique constraint\n');
  } catch (error: any) {
    console.log(`  ✓ PASSED: Unique constraint enforced (${error.code})\n`);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('All validation tests passed! ✅');
  console.log('═══════════════════════════════════════════════════════════');

  // Cleanup
  await prisma.operational_overlays.deleteMany({
    where: { id: { in: [overlay.id, overlay3.id] } },
  });
  await prisma.proposed_signals.deleteMany({
    where: { id: { in: [signal.id, signal2.id, signal3.id] } },
  });
  console.log('\n🧹 Cleaned up test data');
}

testValidation()
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
