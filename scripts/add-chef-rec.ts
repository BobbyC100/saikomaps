#!/usr/bin/env node
/**
 * Quick CLI: Add Chef Rec
 * Usage: tsx scripts/add-chef-rec.ts <place-name> --person "Chef Name" --from "Their Restaurant" --quote "..." --url "..." --type editorial-mention
 */

import { db } from '@/lib/db'
import { createChefRec, validateChefRec, ChefRecType, ChefRecConfidence } from '@/lib/chef-recs'

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
🎯 Add Chef Rec — Quick Entry During Coverage Mining

Usage:
  tsx scripts/add-chef-rec.ts "<place-name>" [options]

Required:
  <place-name>           Name of the place getting the Chef Rec
  --person "Name"        Chef or owner name
  --desc "..."           Reference description (why this signal exists)

Optional:
  --from "Restaurant"    Their restaurant (if relevant)
  --quote "..."          Direct quote (if explicit recommendation)
  --pub "Publication"    Publication name
  --url "..."            Source URL
  --type <type>          lineage | editorial-mention | explicit-recommendation | ownership-network | manual-note
                         (default: editorial-mention)
  --confidence <level>   high | medium | low (default: medium)
  --featured             Mark as featured (ad-unit worthy quote for Restaurant Ad Units)

Examples:

  # During coverage scan — found chef mention
  tsx scripts/add-chef-rec.ts "Sichuan Impression" \\
    --person "Tony Xu" \\
    --from "MIAN" \\
    --desc "Mentioned in Eater LA profile of Chef Tony" \\
    --url "https://la.eater.com/..." \\
    --pub "Eater LA"

  # Explicit recommendation
  tsx scripts/add-chef-rec.ts "Holbox" \\
    --person "Niki Nakayama" \\
    --from "n/naka" \\
    --quote "Best Mexican seafood in LA" \\
    --desc "Quoted in LA Times chef roundup" \\
    --url "https://latimes.com/..." \\
    --type explicit-recommendation \\
    --confidence high \\
    --featured

  # Lineage
  tsx scripts/add-chef-rec.ts "RVR" \\
    --person "Travis Lett" \\
    --from "Gjelina" \\
    --desc "Former Gjelina chef opened RVR" \\
    --type lineage \\
    --confidence high
`)
    process.exit(0)
  }

  const placeName = args[0]
  
  const getArg = (flag: string): string | undefined => {
    const index = args.indexOf(flag)
    return index !== -1 && args[index + 1] ? args[index + 1] : undefined
  }

  const hasFlag = (flag: string): boolean => {
    return args.includes(flag)
  }

  const person = getArg('--person')
  const fromRestaurant = getArg('--from')
  const quote = getArg('--quote')
  const publication = getArg('--pub')
  const url = getArg('--url')
  const type = (getArg('--type') as ChefRecType) || 'editorial-mention'
  const confidence = (getArg('--confidence') as ChefRecConfidence) || 'medium'
  const desc = getArg('--desc')
  const featured = hasFlag('--featured')

  if (!person) {
    console.error('❌ Error: --person is required')
    process.exit(1)
  }

  if (!desc) {
    console.error('❌ Error: --desc is required (reference description)')
    process.exit(1)
  }

  console.log(`\n🔍 Looking for place: "${placeName}"...\n`)

  // Find place
  const place = await db.entities.findFirst({
    where: {
      name: {
        contains: placeName,
        mode: 'insensitive'
      }
    }
  })

  if (!place) {
    console.error(`❌ Place not found: "${placeName}"`)
    console.log('\n💡 Try searching with a partial name')
    process.exit(1)
  }

  console.log(`✅ Found: ${place.name}`)
  console.log(`   ID: ${place.id}`)
  console.log(`   Address: ${place.address}\n`)

  // Create Chef Rec
  const chefRec = createChefRec({
    type,
    personName: person,
    fromRestaurant,
    quote,
    publication,
    referenceType: 'editorial',
    referenceDescription: desc,
    sourceURL: url,
    confidence,
    featured,
  })

  // Validate
  const validation = validateChefRec(chefRec)
  if (!validation.valid) {
    console.error('❌ Invalid Chef Rec:')
    validation.errors.forEach(err => console.error(`   • ${err}`))
    process.exit(1)
  }

  // Get existing Chef Recs
  const existingRecs = (place.chefRecs as any[]) || []

  // Add new rec
  const updatedRecs = [...existingRecs, chefRec]

  // Update place
  await db.entities.update({
    where: { id: place.id },
    data: {
      chefRecs: updatedRecs
    }
  })

  console.log('✅ Chef Rec added!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`👨‍🍳 ${person}${fromRestaurant ? ` (${fromRestaurant})` : ''}`)
  console.log(`   Type: ${type}`)
  console.log(`   Confidence: ${confidence}`)
  if (quote) console.log(`   Quote: "${quote}"`)
  if (publication) console.log(`   Publication: ${publication}`)
  if (url) console.log(`   URL: ${url}`)
  if (featured) console.log(`   Featured: ⭐️ Yes (ad-unit worthy)`)
  console.log(`   Reference: ${desc}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log(`Total Chef Recs for ${place.name}: ${updatedRecs.length}\n`)
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => {
    db.$disconnect()
  })
