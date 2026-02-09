#!/usr/bin/env node
/**
 * Bulk Instagram Handle Update Script
 * 
 * Usage:
 *   node scripts/update-instagram.js --list              # List places missing Instagram
 *   node scripts/update-instagram.js --update data.json  # Bulk update from JSON file
 *   node scripts/update-instagram.js --add "slug" "handle"  # Add single handle
 * 
 * JSON format for bulk update:
 * [
 *   { "slug": "place-slug", "instagram": "handle" },
 *   { "slug": "another-place", "instagram": "anotherhandle" }
 * ]
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function listMissingInstagram() {
  console.log('\n🔍 Finding places without Instagram handles...\n');
  
  const places = await prisma.place.findMany({
    where: {
      OR: [
        { instagram: null },
        { instagram: '' }
      ]
    },
    select: {
      slug: true,
      name: true,
      website: true,
      instagram: true
    },
    orderBy: { name: 'asc' }
  });

  if (places.length === 0) {
    console.log('✅ All places have Instagram handles!\n');
    return;
  }

  console.log(`Found ${places.length} places without Instagram:\n`);
  console.log('SLUG                          | NAME');
  console.log('------------------------------|--------------------------------');
  
  places.forEach(place => {
    const slug = place.slug.padEnd(30);
    console.log(`${slug}| ${place.name}`);
  });

  console.log('\n💡 Tip: Create a JSON file with updates:');
  console.log('   [');
  console.log('     { "slug": "place-slug", "instagram": "handle" },');
  console.log('     { "slug": "another-place", "instagram": "handle" }');
  console.log('   ]\n');
  console.log('   Then run: node scripts/update-instagram.js --update data.json\n');
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
    const { slug, instagram } = item;

    if (!slug || !instagram) {
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
        data: { instagram }
      });

      console.log(`✅ ${place.name.padEnd(30)} → @${instagram}`);
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

async function addSingle(slug, instagram) {
  console.log(`\n📝 Adding Instagram handle for ${slug}...\n`);

  try {
    const place = await prisma.place.findUnique({
      where: { slug },
      select: { name: true, instagram: true }
    });

    if (!place) {
      console.error(`❌ Place not found: ${slug}\n`);
      process.exit(1);
    }

    if (place.instagram) {
      console.log(`⚠️  ${place.name} already has Instagram: @${place.instagram}`);
      console.log(`   Do you want to overwrite it? (This script doesn't confirm, so be careful!)`);
    }

    await prisma.place.update({
      where: { slug },
      data: { instagram }
    });

    console.log(`✅ Updated ${place.name}`);
    console.log(`   Instagram: @${instagram}`);
    console.log(`   URL: https://instagram.com/${instagram}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
📸 Instagram Handle Update Script

Usage:
  node scripts/update-instagram.js --list
    List all places missing Instagram handles

  node scripts/update-instagram.js --update data.json
    Bulk update from JSON file

  node scripts/update-instagram.js --add "slug" "handle"
    Add Instagram handle for a single place

Examples:
  node scripts/update-instagram.js --list
  node scripts/update-instagram.js --add "seco" "seco.silverlake"
  node scripts/update-instagram.js --update instagram-updates.json

JSON Format:
  [
    { "slug": "place-slug", "instagram": "handle" },
    { "slug": "another-place", "instagram": "handle" }
  ]
`);
    await prisma.$disconnect();
    process.exit(0);
  }

  const command = args[0];

  try {
    if (command === '--list' || command === '-l') {
      await listMissingInstagram();
    } else if (command === '--update' || command === '-u') {
      if (!args[1]) {
        console.error('❌ Please specify a JSON file\n');
        console.error('   Usage: node scripts/update-instagram.js --update data.json\n');
        process.exit(1);
      }
      await bulkUpdate(args[1]);
    } else if (command === '--add' || command === '-a') {
      if (!args[1] || !args[2]) {
        console.error('❌ Please specify both slug and Instagram handle\n');
        console.error('   Usage: node scripts/update-instagram.js --add "place-slug" "handle"\n');
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
