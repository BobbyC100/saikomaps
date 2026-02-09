#!/usr/bin/env node
/**
 * Auto-Link Places to Restaurant Groups
 * Finds places in database and links them to their groups
 */

import { db } from '@/lib/db'

// Map of place names to group names (from the doc)
const placeToGroup: Record<string, string> = {
  // Last Word Hospitality (already linked)
  'Found Oyster': 'Last Word Hospitality',
  'Rasarumah': 'Last Word Hospitality',
  'The Copper Room': 'Last Word Hospitality',
  
  // Rustic Canyon Family (already linked)
  'Rustic Canyon': 'Rustic Canyon Family',
  'Milo & Olive': 'Rustic Canyon Family',
  'Birdie G\'s': 'Rustic Canyon Family',
  'Sweet Rose Creamery': 'Rustic Canyon Family',
  
  // Gjelina Group
  'Gjelina': 'Gjelina Group',
  'Gjusta': 'Gjelina Group',
  'Gjelina Take Away': 'Gjelina Group',
  
  // Pine & Crane Group
  'Pine & Crane': 'Pine & Crane Group',
  'Joy': 'Pine & Crane Group',
  'Dan Modern Chinese': 'Pine & Crane Group',
  
  // Jon & Vinny's / Animal Group
  'Animal': 'Jon & Vinny\'s / Animal Group',
  'Son of a Gun': 'Jon & Vinny\'s / Animal Group',
  'Jon & Vinny\'s': 'Jon & Vinny\'s / Animal Group',
  'Helen\'s Wines': 'Jon & Vinny\'s / Animal Group',
  
  // Ludo Lefebvre Restaurants
  'Petit Trois': 'Ludo Lefebvre Restaurants',
  'Trois Mec': 'Ludo Lefebvre Restaurants',
  'LudoBird': 'Ludo Lefebvre Restaurants',
  
  // Hippo / All Time Group
  'Hippo': 'Hippo / All Time Group',
  'All Time': 'Hippo / All Time Group',
  'All Time Pizza': 'Hippo / All Time Group',
  
  // Broken Spanish Group
  'Broken Spanish': 'Broken Spanish Group',
  'Pig\'s Ears': 'Broken Spanish Group',
  
  // Kismet Group
  'Kismet': 'Kismet Group',
  'Kismet Rotisserie': 'Kismet Group',
  
  // République Group
  'République': 'République Group',
  'Massilia': 'République Group',
  
  // Bestia Group
  'Bestia': 'Bestia Group',
  'Bavel': 'Bestia Group',
  
  // Majordomo Group
  'Majordōmo': 'Majordomo Group',
  'Majordōmo Meat & Fish': 'Majordomo Group',
  
  // Pijja Palace Group
  'Pijja Palace': 'Pijja Palace Group',
  'Pijja Palace West': 'Pijja Palace Group',
  
  // Manuela Group
  'Manuela': 'Manuela Group',
  'Manuela Bar': 'Manuela Group',
  
  // Hayato Family
  'Hayato': 'Hayato Family',
  'Go\'s Mart': 'Hayato Family',
  
  // Yangban Society
  'Yangban': 'Yangban Society',
  'Baroo': 'Yangban Society',
  
  // Sugarfish Group
  'Sugarfish': 'Sugarfish Group',
  'KazuNori': 'Sugarfish Group',
}

async function main() {
  console.log('\n🔗 AUTO-LINK PLACES TO RESTAURANT GROUPS\n')
  console.log('═'.repeat(80))
  console.log(`\nAttempting to link ${Object.keys(placeToGroup).length} place-group pairs\n`)

  let linked = 0
  let alreadyLinked = 0
  let placeNotFound = 0
  let groupNotFound = 0

  for (const [placeName, groupName] of Object.entries(placeToGroup)) {
    console.log(`\n[${linked + alreadyLinked + placeNotFound + groupNotFound + 1}/${Object.keys(placeToGroup).length}] ${placeName} → ${groupName}`)

    // Find place
    const place = await db.place.findFirst({
      where: {
        name: {
          contains: placeName,
          mode: 'insensitive'
        }
      },
      include: {
        restaurantGroup: true
      }
    })

    if (!place) {
      console.log(`   ⚠️  Place not found`)
      placeNotFound++
      continue
    }

    if (place.restaurantGroup) {
      console.log(`   ⤷ Already linked to: ${place.restaurantGroup.name}`)
      alreadyLinked++
      continue
    }

    // Find group
    const group = await db.restaurantGroup.findFirst({
      where: {
        name: {
          contains: groupName,
          mode: 'insensitive'
        }
      }
    })

    if (!group) {
      console.log(`   ⚠️  Group not found`)
      groupNotFound++
      continue
    }

    // Link
    await db.place.update({
      where: { id: place.id },
      data: { restaurantGroupId: group.id }
    })

    console.log(`   ✅ Linked to ${group.name}`)
    linked++
  }

  console.log('\n═'.repeat(80))
  console.log('\n📊 SUMMARY\n')
  console.log(`Total place-group pairs: ${Object.keys(placeToGroup).length}`)
  console.log(`✅ Newly linked: ${linked}`)
  console.log(`⤷ Already linked: ${alreadyLinked}`)
  console.log(`⚠️  Place not found: ${placeNotFound}`)
  console.log(`⚠️  Group not found: ${groupNotFound}`)

  console.log('\n═'.repeat(80))
  console.log('\nNext steps:')
  console.log('1. View groups: npx tsx scripts/view-restaurant-group.ts "<group-name>"')
  console.log('2. See all groups with counts')
  console.log('3. Add missing places that have groups\n')
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => {
    db.$disconnect()
  })
