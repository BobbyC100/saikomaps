/**
 * Script: Mine Chef/Owner Recommendations
 * Analyzes editorial sources and comments for recommendations
 */

import { db } from '@/lib/db'

async function main() {
  console.log('👨‍🍳 MINING CHEF & OWNER RECOMMENDATIONS\n')
  console.log('═'.repeat(80))

  const allPlaces = await db.entities.findMany({
    include: {
      mapPlaces: true,
    }
  })

  console.log(`\n📊 Analyzing ${allPlaces.length} places...\n`)

  // Patterns to look for
  const patterns = [
    /chef\s+(\w+\s+\w+)'s?\s+(favorite|pick|recommendation|loves|goes\s+to)/i,
    /owner\s+(\w+\s+\w+)'s?\s+(favorite|pick|recommendation|loves|goes\s+to)/i,
    /(\w+\s+\w+)\s+from\s+(\w+)\s+recommends/i,
    /where\s+chefs?\s+(eat|go)/i,
    /(\w+\s+\w+)\s+\(chef\s+at\s+([^)]+)\)/i,
    /chef\s+(\w+\s+\w+)\s+of\s+([^,]+)\s+(loves|recommends|frequents)/i,
  ]

  const recommendations: Array<{
    place: string
    recommendation: string
    source?: string
    context: string
  }> = []

  const chefConnections: Map<string, string[]> = new Map()

  // Analyze each place
  for (const place of allPlaces) {
    const sources = (place.sources as any[]) || []
    
    // Check sources
    for (const source of sources) {
      const excerpt = source.excerpt || ''
      const comment = excerpt.toLowerCase()
      
      // Look for chef/owner recommendation patterns
      for (const pattern of patterns) {
        const matches = excerpt.match(pattern)
        if (matches) {
          recommendations.push({
            place: place.name,
            recommendation: excerpt,
            source: source.name,
            context: 'editorial source'
          })
        }
      }

      // Look for mentions of other restaurants in our database
      for (const otherPlace of allPlaces) {
        if (otherPlace.id === place.id) continue
        
        const otherNameLower = otherPlace.name.toLowerCase()
        if (comment.includes(otherNameLower)) {
          recommendations.push({
            place: place.name,
            recommendation: `Mentions "${otherPlace.name}" in editorial: ${excerpt}`,
            source: source.name,
            context: 'cross-reference'
          })
        }
      }
    }

    // Check user notes from map places
    for (const mapPlace of place.mapPlaces) {
      const note = mapPlace.userNote || ''
      
      for (const pattern of patterns) {
        const matches = note.match(pattern)
        if (matches) {
          recommendations.push({
            place: place.name,
            recommendation: note,
            context: 'user note'
          })
        }
      }
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('RECOMMENDATIONS FOUND')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (recommendations.length === 0) {
    console.log('❌ No chef/owner recommendations found in current data.\n')
    console.log('💡 Suggestions:')
    console.log('   • Add editorial sources with chef/owner quotes')
    console.log('   • Include "where chefs eat" type guides')
    console.log('   • Add user notes with chef recommendations\n')
  } else {
    console.log(`✅ Found ${recommendations.length} potential recommendations:\n`)
    
    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.place}`)
      console.log(`   Context: ${rec.context}`)
      if (rec.source) console.log(`   Source: ${rec.source}`)
      console.log(`   "${rec.recommendation}"\n`)
    })
  }

  // Analyze for keyword density
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('KEYWORD ANALYSIS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const keywords = [
    'chef', 'owner', 'founded by', 'by chef', 'michelin',
    'james beard', 'award', 'star', 'favorite', 'legendary',
    'iconic', 'institution', 'landmark', 'essential'
  ]

  const keywordCounts = new Map<string, Array<{ place: string; excerpt: string }>>()

  for (const place of allPlaces) {
    const sources = (place.sources as any[]) || []
    
    for (const source of sources) {
      const excerpt = (source.excerpt || '').toLowerCase()
      
      for (const keyword of keywords) {
        if (excerpt.includes(keyword)) {
          if (!keywordCounts.has(keyword)) {
            keywordCounts.set(keyword, [])
          }
          keywordCounts.get(keyword)!.push({
            place: place.name,
            excerpt: source.excerpt || ''
          })
        }
      }
    }
  }

  console.log('Keyword frequency:\n')
  Array.from(keywordCounts.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([keyword, places]) => {
      console.log(`  "${keyword}": ${places.length} mentions`)
    })

  // Show examples of chef mentions
  const chefKeyword = keywordCounts.get('chef')
  if (chefKeyword && chefKeyword.length > 0) {
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('CHEF MENTIONS (Sample)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    chefKeyword.slice(0, 15).forEach(item => {
      console.log(`• ${item.place}`)
      console.log(`  "${item.excerpt}"\n`)
    })
    
    if (chefKeyword.length > 15) {
      console.log(`... and ${chefKeyword.length - 15} more\n`)
    }
  }

  // Potential chef connections
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('POTENTIAL CHEF NETWORK')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Extract chef names and their restaurants
  const chefRestaurants = new Map<string, string[]>()
  const chefPattern = /(chef|by)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g

  for (const place of allPlaces) {
    const sources = (place.sources as any[]) || []
    
    for (const source of sources) {
      const excerpt = source.excerpt || ''
      let match
      
      while ((match = chefPattern.exec(excerpt)) !== null) {
        const chefName = match[2]
        if (!chefRestaurants.has(chefName)) {
          chefRestaurants.set(chefName, [])
        }
        if (!chefRestaurants.get(chefName)!.includes(place.name)) {
          chefRestaurants.get(chefName)!.push(place.name)
        }
      }
    }
  }

  const multiRestaurantChefs = Array.from(chefRestaurants.entries())
    .filter(([_, restaurants]) => restaurants.length > 1)
    .sort((a, b) => b[1].length - a[1].length)

  if (multiRestaurantChefs.length > 0) {
    console.log('Chefs with multiple restaurants in database:\n')
    multiRestaurantChefs.forEach(([chef, restaurants]) => {
      console.log(`👨‍🍳 ${chef}`)
      restaurants.forEach(r => console.log(`   • ${r}`))
      console.log('')
    })
  } else {
    console.log('No multi-restaurant chef connections found yet.\n')
  }

  console.log('═'.repeat(80))
  console.log('\n✅ Analysis complete!\n')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
