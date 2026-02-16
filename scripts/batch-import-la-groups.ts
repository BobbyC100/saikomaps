#!/usr/bin/env node
/**
 * Batch Import LA Hospitality Groups
 * Source: Saiko Maps — Small Hospitality Groups (LA) doc
 * Criteria: ≤25 locations, operator-led, context not destination
 */

import { db } from '@/lib/db'
import { createSource, createSlug, validateRestaurantGroup } from '@/lib/people-groups'

const SOURCE_DOC = 'Saiko Maps — Small Hospitality Groups (LA) internal doc'
const DATE = '2026-02-07'

// Groups from CSV (excluding already created: Last Word Hospitality, Rustic Canyon Family)
const groups = [
  {
    name: 'Gjelina Group',
    restaurants: ['Gjelina', 'Gjusta', 'Gjelina Take Away'],
    locationEstimate: 3,
    neighborhoods: 'Venice',
    notes: 'Ingredient-driven + bakery',
    website: 'https://gjelina.com/',
  },
  {
    name: 'Pine & Crane Group',
    restaurants: ['Pine & Crane', 'Joy', 'Dan Modern Chinese'],
    locationEstimate: 3,
    neighborhoods: 'Silver Lake / DTLA / Westside',
    notes: 'Taiwanese-forward casual dining',
  },
  {
    name: 'Jon & Vinny\'s / Animal Group',
    restaurants: ['Animal', 'Son of a Gun', 'Jon & Vinny\'s', 'Helen\'s Wines'],
    locationEstimate: 5,
    neighborhoods: 'Fairfax / Brentwood / WeHo',
    notes: 'New LA classics',
  },
  {
    name: 'Ludo Lefebvre Restaurants',
    restaurants: ['Petit Trois', 'Trois Mec', 'LudoBird'],
    locationEstimate: 3,
    neighborhoods: 'Hollywood / Sherman Oaks',
    notes: 'French-American',
  },
  {
    name: 'Hippo / All Time Group',
    restaurants: ['Hippo', 'All Time', 'All Time Pizza'],
    locationEstimate: 3,
    neighborhoods: 'Highland Park',
    notes: 'Neighborhood-driven',
  },
  {
    name: 'Broken Spanish Group',
    restaurants: ['Broken Spanish', 'Pig\'s Ears'],
    locationEstimate: 2,
    neighborhoods: 'DTLA / Mid-City',
    notes: 'Modern Mexican',
  },
  {
    name: 'Kismet Group',
    restaurants: ['Kismet', 'Kismet Rotisserie'],
    locationEstimate: 2,
    neighborhoods: 'Los Feliz / West Hollywood',
    notes: 'Eastern Mediterranean',
    website: 'https://kismetlosfeliz.com/',
  },
  {
    name: 'République Group',
    restaurants: ['République', 'Massilia'],
    locationEstimate: 2,
    neighborhoods: 'La Brea / South Bay',
    notes: 'French bakery lineage',
  },
  {
    name: 'Bestia Group',
    restaurants: ['Bestia', 'Bavel'],
    locationEstimate: 2,
    neighborhoods: 'Arts District',
    notes: 'Modern Italian & Middle Eastern',
  },
  {
    name: 'Majordomo Group',
    restaurants: ['Majordōmo', 'Majordōmo Meat & Fish'],
    locationEstimate: 2,
    neighborhoods: 'DTLA',
    notes: 'Korean-influenced',
  },
  {
    name: 'Pijja Palace Group',
    restaurants: ['Pijja Palace', 'Pijja Palace West'],
    locationEstimate: 2,
    neighborhoods: 'Silver Lake / Westside',
    notes: 'Indian-Italian crossover',
  },
  {
    name: 'Manuela Group',
    restaurants: ['Manuela', 'Manuela Bar'],
    locationEstimate: 2,
    neighborhoods: 'Arts District',
    notes: 'Farm-to-table',
  },
  {
    name: 'Hayato Family',
    restaurants: ['Hayato', 'Go\'s Mart'],
    locationEstimate: 2,
    neighborhoods: 'DTLA / Mid-City',
    notes: 'Japanese',
  },
  {
    name: 'Yangban Society',
    restaurants: ['Yangban', 'Baroo'],
    locationEstimate: 2,
    neighborhoods: 'Arts District',
    notes: 'Korean modern',
  },
  {
    name: 'Sugarfish Group',
    restaurants: ['Sugarfish', 'KazuNori'],
    locationEstimate: 25,
    neighborhoods: 'Citywide',
    notes: 'Upper bound allowed (≤25 locations)',
  },
]

async function main() {
  console.log('\n🏢 BATCH IMPORT LA HOSPITALITY GROUPS\n')
  console.log('═'.repeat(80))
  console.log(`\nSource: ${SOURCE_DOC}`)
  console.log(`Criteria: ≤25 locations, operator-led, context not destination`)
  console.log(`Groups to import: ${groups.length}\n`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const groupData of groups) {
    console.log(`\n[${created + skipped + errors + 1}/${groups.length}] ${groupData.name}`)

    // Generate slug
    const slug = createSlug(groupData.name)

    // Check if already exists
    const existing = await db.restaurant_groups.findUnique({
      where: { slug }
    })

    if (existing) {
      console.log(`   ⤷ Already exists`)
      skipped++
      continue
    }

    // Build description
    const description = `${groupData.notes}. Known concepts: ${groupData.restaurants.join(', ')}`

    // Create source
    const source = createSource({
      type: 'manual',
      description: `${SOURCE_DOC} - Verified as ≤25 locations, operator-led group`,
      url: groupData.website,
    })

    // Build group object
    const group = {
      name: groupData.name,
      slug,
      visibility: 'VERIFIED' as any,
      description,
      anchorCity: 'Los Angeles, CA',
      website: groupData.website,
      locationCountEstimate: groupData.locationEstimate,
      sources: [source],
    }

    // Validate
    const validation = validateRestaurantGroup(group as any)
    if (!validation.valid) {
      console.log(`   ❌ Validation failed:`)
      validation.errors.forEach(err => console.log(`      ${err}`))
      errors++
      continue
    }

    // Create group
    try {
      const createdGroup = await db.restaurant_groups.create({
        data: group
      })
      console.log(`   ✅ Created - ${createdGroup.locationEstimate} locations`)
      console.log(`      ${groupData.restaurants.join(', ')}`)
      created++
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`)
      errors++
    }
  }

  console.log('\n═'.repeat(80))
  console.log('\n📊 SUMMARY\n')
  console.log(`Total groups: ${groups.length}`)
  console.log(`✅ Created: ${created}`)
  console.log(`⤷ Skipped (already exists): ${skipped}`)
  console.log(`❌ Errors: ${errors}`)

  console.log('\n═'.repeat(80))
  console.log('\nNext steps:')
  console.log('1. Run: npx tsx scripts/link-groups-to-places.ts')
  console.log('2. View any group: npx tsx scripts/view-restaurant-group.ts "<group-name>"')
  console.log('3. See all groups with place counts\n')
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => {
    db.$disconnect()
  })
