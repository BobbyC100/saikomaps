/**
 * Test script to create a sample list for testing
 * Run: node --loader ts-node/esm scripts/create-test-list.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test user and list...');

  // Create or find test user
  const user = await prisma.user.upsert({
    where: { email: 'test@saikomaps.com' },
    update: {},
    create: {
      email: 'test@saikomaps.com',
      name: 'Test User',
      passwordHash: 'test-hash-not-real',
    },
  });

  console.log('✓ User created:', user.email);

  // Create test list
  const list = await prisma.lists.upsert({
    where: { slug: 'test-guide' },
    update: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      title: 'Test Guide',
      subtitle: 'A test guide for development',
      slug: 'test-guide',
      introText: 'This is a test guide for development purposes.',
      templateType: 'field-notes',
      published: true,
    },
  });

  console.log('✓ List created:', list.slug);
  console.log('\n✅ Test data created successfully!');
  console.log(`\nYou can now test the Add Location feature at:`);
  console.log(`http://localhost:3000/test-add-location`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
