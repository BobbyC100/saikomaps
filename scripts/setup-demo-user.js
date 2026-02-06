/**
 * Setup Demo User Script
 * Creates the demo-user-id user in the database for development/testing
 * 
 * Run with: node scripts/setup-demo-user.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupDemoUser() {
  try {
    console.log('Creating demo user...');
    
    const demoUser = await prisma.user.upsert({
      where: { id: 'demo-user-id' },
      update: {
        email: 'demo@saikomaps.com',
        name: 'Demo User',
      },
      create: {
        id: 'demo-user-id',
        email: 'demo@saikomaps.com',
        name: 'Demo User',
        passwordHash: 'demo-hash-not-for-production',
      },
    });

    console.log('✅ Demo user created/updated:', demoUser);
    console.log('   ID:', demoUser.id);
    console.log('   Email:', demoUser.email);
    
  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupDemoUser();
