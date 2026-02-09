#!/usr/bin/env node
/**
 * Bulk Phone Number Update Script
 * 
 * Usage:
 *   node scripts/update-phone.js --list              # List places missing phone
 *   node scripts/update-phone.js --update data.json  # Bulk update from JSON file
 *   node scripts/update-phone.js --add "slug" "phone"  # Add single phone
 * 
 * JSON format:
 * [
 *   { "slug": "place-slug", "phone": "+1 (555) 123-4567" },
 *   { "slug": "another-place", "phone": "(555) 987-6543" }
 * ]
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function listMissingPhone() {
  console.log('\n🔍 Finding places without phone numbers...\n');
  
  const places = await prisma.place.findMany({
    where: {
      OR: [
        { phone: null },
        { phone: '' }
      ]
    },
    select: {
      slug: true,
      name: true,
      address: true,
      website: true,
      phone: true
    },
    orderBy: { name: 'asc' }
  });

  if (places.length === 0) {
    console.log('✅ All places have phone numbers!\n');
    return;
  }

  console.log(`Found ${places.length} places without phone numbers:\n`);
  console.log('SLUG                          | NAME                          | ADDRESS');
  console.log('------------------------------|-------------------------------|------------------');
  
  places.forEach(place => {
    const slug = place.slug.padEnd(30);
    const name = place.name.padEnd(30).substring(0, 30);
    const address = place.address ? place.address.split(',')[0].substring(0, 18) : '—';
    console.log(`${slug}| ${name}| ${address}`);
  });

  console.log('\n💡 Tip: Create a JSON file with updates:');
  console.log('   [');
  console.log('     { "slug": "place-slug", "phone": "(555) 123-4567" },');
  console.log('     { "slug": "another-place", "phone": "(555) 987-6543" }');
  console.log('   ]\n');
  console.log('   Then run: node scripts/update-phone.js --update data.json\n');
}

async function bulkUpdate(filePath) {
  console.log(`\n📥 Loading updates from ${filePath}...\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}\n`);
    process.exit(1);
  }

  let updates;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    updates = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Invalid JSON file: ${error.message}\n`);
    process.exit(1);
  }

  if (!Array.isArray(updates)) {
    console.error('❌ JSON must be an array of objects\n');
    process.exit(1);
  }

  console.log(`Found ${updates.length} updates to process...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const item of updates) {
    const { slug, phone } = item;

    if (!slug || !phone) {
      console.log(`⚠️  Skipping invalid entry: ${JSON.stringify(item)}`);
      errorCount++;
      continue;
    }

    try {
      const place = await prisma.place.findUnique({
        where: { slug },
        select: { name: true }
      });

      if (!place) {
        console.log(`❌ Place not found: ${slug}`);
        errorCount++;
        continue;
      }

      await prisma.place.update({
        where: { slug },
        data: { phone }
      });

      console.log(`✅ ${place.name.padEnd(30)} → ${phone}`);
      successCount++;
    } catch (error) {
      console.log(`❌ Error updating ${slug}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors:  ${errorCount}`);
  console.log(`   📝 Total:   ${updates.length}\n`);
}

async function addSingle(slug, phone) {
  console.log(`\n📝 Adding phone number for ${slug}...\n`);

  try {
    const place = await prisma.place.findUnique({
      where: { slug },
      select: { name: true, phone: true }
    });

    if (!place) {
      console.error(`❌ Place not found: ${slug}\n`);
      process.exit(1);
    }

    if (place.phone) {
      console.log(`⚠️  ${place.name} already has phone: ${place.phone}`);
      console.log(`   Overwriting with: ${phone}`);
    }

    await prisma.place.update({
      where: { slug },
      data: { phone }
    });

    console.log(`✅ Updated ${place.name}`);
    console.log(`   Phone: ${phone}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
📞 Phone Number Update Script

Usage:
  node scripts/update-phone.js --list
    List all places missing phone numbers

  node scripts/update-phone.js --update data.json
    Bulk update from JSON file

  node scripts/update-phone.js --add "slug" "phone"
    Add phone number for a single place

Examples:
  node scripts/update-phone.js --list
  node scripts/update-phone.js --add "seco" "(323) 123-4567"
  node scripts/update-phone.js --update phone-updates.json

JSON Format:
  [
    { "slug": "place-slug", "phone": "(555) 123-4567" },
    { "slug": "another-place", "phone": "+1 (555) 987-6543" }
  ]

Note: Phone format is flexible - the script stores exactly what you provide.
`);
    await prisma.$disconnect();
    process.exit(0);
  }

  const command = args[0];

  try {
    if (command === '--list' || command === '-l') {
      await listMissingPhone();
    } else if (command === '--update' || command === '-u') {
      if (!args[1]) {
        console.error('❌ Please specify a JSON file\n');
        console.error('   Usage: node scripts/update-phone.js --update data.json\n');
        process.exit(1);
      }
      await bulkUpdate(args[1]);
    } else if (command === '--add' || command === '-a') {
      if (!args[1] || !args[2]) {
        console.error('❌ Please specify both slug and phone number\n');
        console.error('   Usage: node scripts/update-phone.js --add "place-slug" "(555) 123-4567"\n');
        process.exit(1);
      }
      await addSingle(args[1], args[2]);
    } else {
      console.error(`❌ Unknown command: ${command}\n`);
      console.error('   Run with --help for usage information\n');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}\n`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
