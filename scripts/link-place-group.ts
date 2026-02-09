#!/usr/bin/env node
/**
 * Link Place to Restaurant Group
 * Associates a place with a restaurant group
 */

import { db } from '@/lib/db'

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2 || args[0].startsWith('--') || args[1].startsWith('--')) {
    console.error('\nUsage: npx tsx scripts/link-place-group.ts "<place-name>" "<group-name>"')
    console.error('\nExample:')
    console.error('  npx tsx scripts/link-place-group.ts "Found Oyster" "Last Word Hospitality"\n')
    process.exit(1)
  }

  const placeName = args[0]
  const groupName = args[1]

  console.log('\n🔗 LINK PLACE TO RESTAURANT GROUP\n')
  console.log('═'.repeat(80))

  // Find place
  const place = await db.place.findFirst({
    where: {
      OR: [
        { name: { contains: placeName, mode: 'insensitive' } },
        { slug: placeName.toLowerCase() }
      ]
    },
    include: {
      restaurantGroup: true
    }
  })

  if (!place) {
    console.log(`\n❌ Place not found: "${placeName}"\n`)
    process.exit(1)
  }

  console.log(`\nPlace: ${place.name}`)
  if (place.neighborhood) {
    console.log(`Neighborhood: ${place.neighborhood}`)
  }

  if (place.restaurantGroup) {
    console.log(`\n⚠️  Already linked to: ${place.restaurantGroup.name}`)
    console.log('\nUnlink first if you want to change the group association\n')
    process.exit(1)
  }

  // Find group
  const group = await db.restaurantGroup.findFirst({
    where: {
      OR: [
        { name: { contains: groupName, mode: 'insensitive' } },
        { slug: groupName.toLowerCase() }
      ]
    }
  })

  if (!group) {
    console.log(`\n❌ Restaurant group not found: "${groupName}"`)
    console.log('   Add group first: npx tsx scripts/add-restaurant-group.ts "<name>"\n')
    process.exit(1)
  }

  console.log(`Restaurant Group: ${group.name}`)

  // Link place to group
  await db.place.update({
    where: { id: place.id },
    data: { restaurantGroupId: group.id }
  })

  console.log('\n✅ Place linked to restaurant group successfully!')
  
  console.log('\n═'.repeat(80))
  console.log('\nNext steps:')
  console.log(`1. View group: npx tsx scripts/view-restaurant-group.ts "${group.name}"`)
  console.log(`2. Link more places: npx tsx scripts/link-place-group.ts "<another-place>" "${group.name}"`)
  console.log()
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => {
    db.$disconnect()
  })
