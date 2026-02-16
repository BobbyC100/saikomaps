#!/usr/bin/env node
/**
 * Add Person
 * Creates a new person (chef, owner, operator) with attribution
 */

import { db } from '@/lib/db'
import { 
  createSource, 
  createSlug, 
  validatePerson,
  type PersonRole,
  type Visibility 
} from '@/lib/people-groups'

interface Args {
  name: string
  role?: PersonRole
  visibility?: Visibility
  bio?: string
  imageUrl?: string
  sourceUrl?: string
  sourceDesc?: string
  sourceType?: 'restaurant-website' | 'editorial' | 'award' | 'manual'
  restaurantGroup?: string
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0].startsWith('--')) {
    console.error('\nUsage: npx tsx scripts/add-person.ts "<name>" [options]')
    console.error('\nOptions:')
    console.error('  --role <role>              chef | owner | operator | founder | partner (default: chef)')
    console.error('  --visibility <visibility>  internal | verified (default: internal)')
    console.error('  --bio "<text>"             Brief biography')
    console.error('  --image-url "<url>"        Headshot URL')
    console.error('  --source-url "<url>"       Attribution source URL')
    console.error('  --source-desc "<text>"     Source description')
    console.error('  --source-type <type>       restaurant-website | editorial | award | manual')
    console.error('  --restaurant-group "<name>" Associated restaurant group')
    console.error('\nExample:')
    console.error('  npx tsx scripts/add-person.ts "Nancy Silverton" \\')
    console.error('    --role chef \\')
    console.error('    --visibility verified \\')
    console.error('    --source-url "https://www.latimes.com/..." \\')
    console.error('    --source-desc "LA Times profile" \\')
    console.error('    --source-type editorial\n')
    process.exit(1)
  }

  const result: Args = {
    name: args[0],
    role: 'chef',
    visibility: 'internal',
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    const value = args[i + 1]

    switch (arg) {
      case '--role':
        result.role = value as PersonRole
        i++
        break
      case '--visibility':
        result.visibility = value as Visibility
        i++
        break
      case '--bio':
        result.bio = value
        i++
        break
      case '--image-url':
        result.imageUrl = value
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
      case '--restaurant-group':
        result.restaurantGroup = value
        i++
        break
    }
  }

  return result
}

async function main() {
  const args = parseArgs()

  console.log('\n👤 ADD PERSON\n')
  console.log('═'.repeat(80))
  console.log(`\nName: ${args.name}`)
  console.log(`Role: ${args.role}`)
  console.log(`Visibility: ${args.visibility}`)
  if (args.bio) console.log(`Bio: ${args.bio}`)
  if (args.restaurantGroup) console.log(`Restaurant Group: ${args.restaurantGroup}`)

  // Generate slug
  const slug = createSlug(args.name)
  console.log(`Slug: ${slug}`)

  // Check if person already exists
  const existing = await db.people.findUnique({
    where: { slug }
  })

  if (existing) {
    console.log('\n❌ Person with this slug already exists')
    console.log(`   ID: ${existing.id}`)
    console.log(`   Name: ${existing.name}`)
    console.log('\nUse view-person.ts to see details or choose a different name\n')
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

  // Find restaurant group if specified
  let restaurantGroupId: string | undefined
  if (args.restaurantGroup) {
    const group = await db.restaurant_groups.findFirst({
      where: {
        OR: [
          { name: { contains: args.restaurantGroup, mode: 'insensitive' } },
          { slug: args.restaurantGroup.toLowerCase() }
        ]
      }
    })

    if (!group) {
      console.log(`\n⚠️  Restaurant group "${args.restaurantGroup}" not found`)
      console.log('   Person will be created without group association')
    } else {
      restaurantGroupId = group.id
      console.log(`   Linked to: ${group.name}`)
    }
  }

  // Build person object
  const person = {
    name: args.name,
    slug,
    role: args.role!.toUpperCase() as any,
    visibility: args.visibility!.toUpperCase() as any,
    bio: args.bio,
    imageUrl: args.imageUrl,
    sources: [source],
    restaurantGroupId,
  }

  // Validate
  const validation = validatePerson(person as any)
  if (!validation.valid) {
    console.log('\n❌ Validation failed:')
    validation.errors.forEach(err => console.log(`   ${err}`))
    console.log()
    process.exit(1)
  }

  // Create person
  const created = await db.people.create({
    data: person as any
  })

  console.log('\n✅ Person created successfully!')
  console.log(`\n   ID: ${created.id}`)
  console.log(`   Slug: ${created.slug}`)
  console.log(`   Role: ${created.role}`)
  console.log(`   Visibility: ${created.visibility}`)
  console.log(`   Sources: ${(created.sources as any[]).length}`)
  
  console.log('\n═'.repeat(80))
  console.log('\nNext steps:')
  console.log(`1. Link to places: npx tsx scripts/link-person-place.ts "${args.name}" "<place-name>"`)
  console.log(`2. View details: npx tsx scripts/view-person.ts "${args.name}"`)
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
