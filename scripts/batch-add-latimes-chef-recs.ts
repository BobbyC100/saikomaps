#!/usr/bin/env node
/**
 * Batch Add Chef Recs from LA Times Article
 * "These 13 standout restaurants are where L.A. chefs eat on their nights off"
 * Nov. 26, 2024
 */

import { db } from '@/lib/db'
import { createChefRec, validateChefRec } from '@/lib/chef-recs'

const SOURCE_URL = 'https://www.latimes.com/food/list/los-angeles-chefs-share-favorite-local-restaurants'
const ARTICLE_TITLE = 'These 13 standout restaurants are where L.A. chefs eat on their nights off'
const PUBLICATION = 'LA Times'
const DATE = '2024-11-26'

// Chef recommendations from the article
const recommendations = [
  // Jeff Strauss (Jeff's Table)
  { place: 'Anajak Thai', chef: 'Jeff Strauss', from: "Jeff's Table" },
  { place: 'Bridgetown Roti', chef: 'Jeff Strauss', from: "Jeff's Table" },
  
  // Tiana Gee (Soulphil)
  { place: 'Anajak Thai', chef: 'Tiana Gee', from: 'Soulphil' },
  { place: 'Bridgetown Roti', chef: 'Tiana Gee', from: 'Soulphil' },
  
  // Andrew & Michelle Muñoz (Moo's Craft BBQ)
  { place: 'Anajak Thai', chef: 'Andrew Muñoz', from: "Moo's Craft BBQ" },
  { place: 'Anajak Thai', chef: 'Michelle Muñoz', from: "Moo's Craft BBQ" },
  { place: 'Bestia', chef: 'Andrew Muñoz', from: "Moo's Craft BBQ" },
  { place: 'Bestia', chef: 'Michelle Muñoz', from: "Moo's Craft BBQ" },
  { place: 'Bavel', chef: 'Andrew Muñoz', from: "Moo's Craft BBQ" },
  { place: 'Bavel', chef: 'Michelle Muñoz', from: "Moo's Craft BBQ" },
  
  // Sarah Hymanson (Kismet)
  { place: 'Baja Subs Market & Deli', chef: 'Sarah Hymanson', from: 'Kismet' },
  { place: 'Ototo', chef: 'Sarah Hymanson', from: 'Kismet' },
  { place: 'Tsubaki', chef: 'Sarah Hymanson', from: 'Kismet' },
  
  // Sara Kramer (Kismet)
  { place: 'Ototo', chef: 'Sara Kramer', from: 'Kismet' },
  { place: 'Tsubaki', chef: 'Sara Kramer', from: 'Kismet' },
  
  // Victor Villa (Villa's Tacos)
  { place: 'Bavel', chef: 'Victor Villa', from: "Villa's Tacos" },
  { place: 'Bestia', chef: 'Victor Villa', from: "Villa's Tacos" },
  
  // Nancy Silverton
  { place: 'Jar', chef: 'Nancy Silverton', from: undefined },
  
  // Owen Han (Stacked cookbook)
  { place: 'Great White', chef: 'Owen Han', from: 'Stacked (cookbook author)' },
  { place: 'Night + Market', chef: 'Owen Han', from: 'Stacked (cookbook author)' },
  
  // Josh Scherer (The Mythical Cookbook)
  { place: 'Burritos La Palma', chef: 'Josh Scherer', from: 'The Mythical Cookbook (author)' },
  { place: 'Oc & Lau', chef: 'Josh Scherer', from: 'The Mythical Cookbook (author)' },
]

async function main() {
  console.log('\n🎯 BATCH ADD CHEF RECS: LA Times Article\n')
  console.log('═'.repeat(80))
  console.log(`\nSource: ${ARTICLE_TITLE}`)
  console.log(`URL: ${SOURCE_URL}`)
  console.log(`Date: ${DATE}\n`)

  let added = 0
  let skipped = 0
  let errors = 0
  let newPlaces: string[] = []

  for (const rec of recommendations) {
    console.log(`\n[${added + skipped + errors + 1}/${recommendations.length}] ${rec.place} ← ${rec.chef}`)

    // Find place
    const place = await db.entities.findFirst({
      where: {
        name: {
          contains: rec.place,
          mode: 'insensitive'
        }
      }
    })

    if (!place) {
      console.log(`   ⚠️  Place not found: "${rec.place}" (needs to be added first)`)
      newPlaces.push(rec.place)
      skipped++
      continue
    }

    // Check if this chef already has a rec for this place
    const existingRecs = (place.chefRecs as any[]) || []
    const alreadyExists = existingRecs.some(existing => 
      existing.personName === rec.chef && 
      existing.reference.sourceURL === SOURCE_URL
    )

    if (alreadyExists) {
      console.log(`   ⤷ Already has Chef Rec from ${rec.chef}`)
      skipped++
      continue
    }

    // Create Chef Rec
    const chefRec = createChefRec({
      type: 'explicit-recommendation',
      personName: rec.chef,
      fromRestaurant: rec.from,
      publication: PUBLICATION,
      referenceType: 'editorial',
      referenceDescription: `Named as favorite restaurant by ${rec.chef} in LA Times article: "${ARTICLE_TITLE}"`,
      sourceURL: SOURCE_URL,
      confidence: 'high',
    })

    // Validate
    const validation = validateChefRec(chefRec)
    if (!validation.valid) {
      console.log(`   ❌ Validation failed:`)
      validation.errors.forEach(err => console.log(`      ${err}`))
      errors++
      continue
    }

    // Add to place
    const updatedRecs = [...existingRecs, chefRec]
    await db.entities.update({
      where: { id: place.id },
      data: { chefRecs: updatedRecs }
    })

    console.log(`   ✅ Added Chef Rec from ${rec.chef}${rec.from ? ` (${rec.from})` : ''}`)
    added++
  }

  console.log('\n═'.repeat(80))
  console.log('\n📊 SUMMARY\n')
  console.log(`Total recommendations in article: ${recommendations.length}`)
  console.log(`✅ Added: ${added}`)
  console.log(`⤷ Skipped (already exists): ${skipped - newPlaces.length}`)
  console.log(`⚠️  Places not in database: ${newPlaces.length}`)
  console.log(`❌ Errors: ${errors}`)

  if (newPlaces.length > 0) {
    console.log('\n⚠️  PLACES TO ADD FIRST:\n')
    const uniquePlaces = [...new Set(newPlaces)]
    uniquePlaces.forEach(p => console.log(`   • ${p}`))
    console.log('\nAdd these places to your database first, then re-run this script.\n')
  }

  console.log('═'.repeat(80))
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => {
    db.$disconnect()
  })
