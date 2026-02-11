#!/usr/bin/env node
/**
 * Add Restaurant Group
 * Creates a new restaurant group with attribution
 */

import { db } from '@/lib/db'
import { 
  createSource, 
  createSlug, 
  validateRestaurantGroup,
  type Visibility 
} from '@/lib/people-groups'

interface Args {
  name: string
  visibility?: Visibility
  description?: string
  anchorCity?: string
  website?: string
  locationEstimate?: number
  sourceUrl?: string
  sourceDesc?: string
  sourceType?: 'restaurant-website' | 'editorial' | 'award' | 'manual'
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0].startsWith('--')) {
    console.error('\nUsage: npx tsx scripts/add-restaurant-group.ts "<name>" [options]')
    console.error('\nOptions:')
    console.error('  --visibility <visibility>    internal | verified (default: internal)')
    console.error('  --description "<text>"       Brief description of group DNA/philosophy')
    console.error('  --anchor-city "<city>"       Primary city (e.g. "Los Angeles, CA")')
    console.error('  --website "<url>"            Group website')
    console.error('  --location-estimate <num>    Bootstrap location count before linking')
    console.error('  --source-url "<url>"         Attribution source URL')
    console.error('  --source-desc "<text>"       Source description (required)')
    console.error('  --source-type <type>         restaurant-website | editorial | award | manual')
    console.error('\nExample:')
    console.error('  npx tsx scripts/add-restaurant-group.ts "Last Word Hospitality" \\')
    console.error('    --anchor-city "Los Angeles, CA" \\')
    console.error('    --website "https://www.lw-h.com/" \\')
    console.error('    --visibility verified \\')
    console.error('    --location-estimate 3 \\')
    console.error('    --source-url "https://www.lw-h.com/" \\')
    console.error('    --source-desc "Official group website" \\')
    console.error('    --source-type restaurant-website\n')
    process.exit(1)
  }

  const result: Args = {
    name: args[0],
    visibility: 'internal',
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    const value = args[i + 1]

    switch (arg) {
      case '--visibility':
        result.visibility = value as Visibility
        i++
        break
      case '--description':
        result.description = value
        i++
        break
      case '--anchor-city':
        result.anchorCity = value
        i++
        break
      case '--website':
        result.website = value
        i++
        break
      case '--location-estimate':
        result.locationEstimate = parseInt(value)
        i++
        break
      case '--source-url':
        result.sourceUrl = value
        i++
        break
      case '--source-desc':
        result.sourceDesc = value
        i++
        break
      case '--source-type':
        result.sourceType = value as any
        i++
        break
    }
  }

  return result
}

async function main() {
  const args = parseArgs()

  console.log('\n🏢 ADD RESTAURANT GROUP\n')
  console.log('═'.repeat(80))
  console.log(`\nName: ${args.name}`)
  console.log(`Visibility: ${args.visibility}`)
  if (args.description) console.log(`Description: ${args.description}`)
  if (args.anchorCity) console.log(`Anchor City: ${args.anchorCity}`)
  if (args.website) console.log(`Website: ${args.website}`)
  if (args.locationEstimate) console.log(`Location Estimate: ${args.locationEstimate}`)

  // Generate slug
  const slug = createSlug(args.name)
  console.log(`Slug: ${slug}`)

  // Check if group already exists
  const existing = await db.restaurantGroup.findUnique({
    where: { slug }
  })

  if (existing) {
    console.log('\n❌ Restaurant group with this slug already exists')
    console.log(`   ID: ${existing.id}`)
    console.log(`   Name: ${existing.name}`)
    console.log('\nUse view-restaurant-group.ts to see details or choose a different name\n')
    process.exit(1)
  }

  // Create source
  if (!args.sourceDesc) {
    console.log('\n❌ Error: --source-desc is required')
    process.exit(1)
  }

  const source = createSource({
    type: args.sourceType || 'manual',
    description: args.sourceDesc,
    url: args.sourceUrl,
  })

  // Build group object
  const group = {
    name: args.name,
    slug,
    visibility: args.visibility!.toUpperCase() as any,
    description: args.description,
    anchorCity: args.anchorCity,
    website: args.website,
    locationCountEstimate: args.locationEstimate,
    sources: [source],
  }

  // Validate
  const validation = validateRestaurantGroup(group as any)
  if (!validation.valid) {
    console.log('\n❌ Validation failed:')
    validation.errors.forEach(err => console.log(`   ${err}`))
    console.log()
    process.exit(1)
  }

  // Create group
  const created = await db.restaurantGroup.create({
    data: { ...group, id: require('crypto').randomUUID(), updated_at: new Date() } as any
  })

  console.log('\n✅ Restaurant group created successfully!')
  console.log(`\n   ID: ${created.id}`)
  console.log(`   Slug: ${created.slug}`)
  console.log(`   Visibility: ${created.visibility}`)
  console.log(`   Sources: ${(created.sources as any[]).length}`)
  
  console.log('\n═'.repeat(80))
  console.log('\nNext steps:')
  console.log(`1. Link places: npx tsx scripts/link-place-group.ts "<place-name>" "${args.name}"`)
  console.log(`2. View details: npx tsx scripts/view-restaurant-group.ts "${args.name}"`)
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
