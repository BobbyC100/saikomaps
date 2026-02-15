#!/usr/bin/env node
/**
 * View Chef Recs
 * Quick viewer to see all Chef Recs or Chef Recs for a specific place
 */

import { db } from '@/lib/db'
import type { ChefRec } from '@/lib/chef-recs'

async function main() {
  const args = process.argv.slice(2)
  
  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
🎯 View Chef Recs

Usage:
  tsx scripts/view-chef-recs.ts              # Show all places with Chef Recs
  tsx scripts/view-chef-recs.ts "<place>"    # Show Chef Recs for specific place
  tsx scripts/view-chef-recs.ts --stats      # Show stats
`)
    process.exit(0)
  }

  if (args[0] === '--stats') {
    await showStats()
  } else if (args[0]) {
    await showPlaceRecs(args[0])
  } else {
    await showAll()
  }
}

async function showStats() {
  const placesWithRecs = await db.places.findMany({
    where: {
      chefRecs: {
        not: null
      }
    },
    select: {
      name: true,
      chefRecs: true
    }
  })

  console.log('\n📊 CHEF RECS STATISTICS\n')
  console.log('═'.repeat(80))
  console.log(`\nPlaces with Chef Recs: ${placesWithRecs.length}`)
  
  let totalRecs = 0
  const typeCount = new Map<string, number>()
  const confidenceCount = new Map<string, number>()
  const chefCount = new Map<string, number>()
  let featuredCount = 0

  placesWithRecs.forEach(place => {
    const recs = (place.chefRecs as ChefRec[]) || []
    totalRecs += recs.length

    recs.forEach(rec => {
      typeCount.set(rec.type, (typeCount.get(rec.type) || 0) + 1)
      confidenceCount.set(rec.confidence, (confidenceCount.get(rec.confidence) || 0) + 1)
      if (rec.featured) featuredCount++
      
      const key = rec.fromRestaurant ? `${rec.personName} (${rec.fromRestaurant})` : rec.personName
      chefCount.set(key, (chefCount.get(key) || 0) + 1)
    })
  })

  console.log(`Total Chef Recs: ${totalRecs}`)
  console.log(`Featured (Ad-Unit Worthy): ${featuredCount}\n`)

  console.log('By Type:')
  Array.from(typeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(30)} ${count}`)
    })

  console.log('\nBy Confidence:')
  Array.from(confidenceCount.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([conf, count]) => {
      console.log(`  ${conf.padEnd(30)} ${count}`)
    })

  console.log('\nTop Chefs/Owners:')
  Array.from(chefCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([chef, count]) => {
      console.log(`  ${chef.padEnd(40)} ${count} recommendation${count > 1 ? 's' : ''}`)
    })

  console.log('\n═'.repeat(80))
}

async function showAll() {
  const places = await db.places.findMany({
    where: {
      chefRecs: {
        not: null
      }
    },
    select: {
      name: true,
      neighborhood: true,
      chefRecs: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  console.log('\n🎯 ALL PLACES WITH CHEF RECS\n')
  console.log('═'.repeat(80))
  console.log(`\nFound ${places.length} places\n`)

  places.forEach(place => {
    const recs = (place.chefRecs as ChefRec[]) || []
    console.log(`\n${place.name}`)
    if (place.neighborhood) console.log(`  ${place.neighborhood}`)
    console.log(`  ${recs.length} Chef Rec${recs.length > 1 ? 's' : ''}:`)
    
    recs.forEach((rec, i) => {
      console.log(`\n  ${i + 1}. ${rec.personName}${rec.fromRestaurant ? ` (${rec.fromRestaurant})` : ''}`)
      console.log(`     Type: ${rec.type} | Confidence: ${rec.confidence}${rec.featured ? ' | ⭐️ FEATURED' : ''}`)
      if (rec.quote) console.log(`     "${rec.quote}"`)
      console.log(`     Ref: ${rec.reference.description}`)
      if (rec.reference.sourceURL) console.log(`     URL: ${rec.reference.sourceURL}`)
    })
  })

  console.log('\n═'.repeat(80))
}

async function showPlaceRecs(searchTerm: string) {
  const place = await db.places.findFirst({
    where: {
      name: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    },
    include: {
      map_places: {
        include: {
          map: true
        }
      }
    }
  })

  if (!place) {
    console.error(`\n❌ Place not found: "${searchTerm}"`)
    process.exit(1)
  }

  console.log('\n🎯 CHEF RECS\n')
  console.log('═'.repeat(80))
  console.log(`\n${place.name}`)
  if (place.neighborhood) console.log(`${place.neighborhood}`)
  if (place.address) console.log(`${place.address}`)

  const recs = (place.chefRecs as ChefRec[]) || []

  if (recs.length === 0) {
    console.log('\n❌ No Chef Recs for this place yet.\n')
    console.log('Add one with:')
    console.log(`tsx scripts/add-chef-rec.ts "${place.name}" --person "Chef Name" --desc "..."\n`)
    return
  }

  console.log(`\n${recs.length} Chef Rec${recs.length > 1 ? 's' : ''}:\n`)

  recs.forEach((rec, i) => {
    console.log(`${i + 1}. 👨‍🍳 ${rec.personName}${rec.fromRestaurant ? ` from ${rec.fromRestaurant}` : ''}`)
    console.log(`   Type: ${rec.type}`)
    console.log(`   Confidence: ${rec.confidence}`)
    if (rec.featured) console.log(`   Featured: ⭐️ Yes (ad-unit worthy)`)
    if (rec.publication) console.log(`   Publication: ${rec.publication}`)
    if (rec.quote) console.log(`   Quote: "${rec.quote}"`)
    console.log(`   Reference: ${rec.reference.description}`)
    if (rec.reference.sourceURL) console.log(`   URL: ${rec.reference.sourceURL}`)
    console.log(`   Added: ${new Date(rec.reference.addedAt).toLocaleDateString()}\n`)
  })

  console.log('═'.repeat(80))
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => {
    db.$disconnect()
  })
