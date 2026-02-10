#!/usr/bin/env node
/**
 * Count places by status and data quality
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 SAIKO MAPS - Place Count Summary\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Total count
  const total = await prisma.places.count();
  console.log(`Total places: ${total}`);

  // By status
  const open = await prisma.places.count({ where: { status: 'OPEN' } });
  const closed = await prisma.places.count({ where: { status: 'CLOSED' } });
  const permClosed = await prisma.places.count({ where: { status: 'PERMANENTLY_CLOSED' } });

  console.log(`\nBy Status:`);
  console.log(`  OPEN:                ${open} (${((open / total) * 100).toFixed(1)}%)`);
  console.log(`  CLOSED:              ${closed} (${((closed / total) * 100).toFixed(1)}%)`);
  console.log(`  PERMANENTLY_CLOSED:  ${permClosed} (${((permClosed / total) * 100).toFixed(1)}%)`);

  // With websites
  const withWebsite = await prisma.places.count({ where: { website: { not: null } } });
  const withoutWebsite = total - withWebsite;

  console.log(`\nBy Website:`);
  console.log(`  With website:    ${withWebsite} (${((withWebsite / total) * 100).toFixed(1)}%)`);
  console.log(`  Without website: ${withoutWebsite} (${((withoutWebsite / total) * 100).toFixed(1)}%)`);

  // With coordinates
  const withCoords = await prisma.places.count({
    where: {
      AND: [
        { latitude: { not: null } },
        { longitude: { not: null } },
        { latitude: { not: 0 } },
        { longitude: { not: 0 } },
      ],
    },
  });
  const withoutCoords = total - withCoords;

  console.log(`\nBy Coordinates:`);
  console.log(`  Valid coords (not 0,0): ${withCoords} (${((withCoords / total) * 100).toFixed(1)}%)`);
  console.log(`  Missing/0,0 coords:     ${withoutCoords} (${((withoutCoords / total) * 100).toFixed(1)}%)`);

  // Launch-ready count
  const launchReady = await prisma.places.count({
    where: {
      AND: [
        { status: 'OPEN' },
        { latitude: { not: null } },
        { longitude: { not: null } },
        { latitude: { not: 0 } },
        { longitude: { not: 0 } },
      ],
    },
  });

  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`🚀 LAUNCH-READY PLACES`);
  console.log(`════════════════════════════════════════════════════════════`);
  console.log(`\n  ${launchReady} places`);
  console.log(`  (OPEN status + valid coordinates)\n`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
