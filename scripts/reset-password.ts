/**
 * Reset password for admin user
 * Usage: npx tsx scripts/reset-password.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash, compare } from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'rjcicc@gmail.com';
  const password = 'NewStrongPassword123'; // WITHOUT the exclamation mark

  console.log('Generating fresh hash for password:', password);
  
  // Generate hash with same settings as auth
  const passwordHash = await hash(password, 10);
  
  console.log('Generated hash:', passwordHash);
  
  // Verify hash immediately
  const isValid = await compare(password, passwordHash);
  console.log('Hash verification:', isValid);
  
  if (!isValid) {
    console.error('Hash generation failed validation!');
    process.exit(1);
  }
  
  // Update user
  const user = await prisma.users.update({
    where: { email },
    data: { passwordHash }
  });
  
  console.log('\n✅ Password updated for:', user.email);
  console.log('Password:', password);
  
  await prisma.$disconnect();
}

resetPassword().catch(console.error);
