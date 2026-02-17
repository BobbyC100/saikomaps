/**
 * Create admin user
 * Run: npx tsx scripts/create-admin-user.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const email = 'rjcicc@gmail.com';
  const passwordHash = '$2a$10$FMwGg.Fwj3RzJvRxJljQRuwg.boMa4N.wI0FtyhALhbDFHI29Re7u';
  const name = 'Bobby';

  console.log('Creating admin user...');
  console.log('Email:', email);
  console.log('Name:', name);

  // Check if user already exists
  const existing = await prisma.users.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('⚠️  User already exists. Updating password...');
    await prisma.users.update({
      where: { email },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });
    console.log('✅ Password updated for:', email);
  } else {
    console.log('Creating new user...');
    await prisma.users.create({
      data: {
        id: randomUUID(),
        email,
        name,
        passwordHash,
        subscriptionTier: 'free',
        updatedAt: new Date(),
      },
    });
    console.log('✅ User created:', email);
  }

  console.log('\n🎉 Admin user ready!');
  console.log('\nYou can now log in at http://localhost:3001/login with:');
  console.log('  Email:', email);
  console.log('  Password: NewStrongPassword123!');
  console.log('\nThis email is in ADMIN_EMAILS, so you will have admin access.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
