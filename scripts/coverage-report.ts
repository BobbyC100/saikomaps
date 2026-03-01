/**
 * Script: Generate Coverage Report
 * Analyzes all maps and places to provide comprehensive coverage statistics
 */

import { db } from '@/lib/db'

async function main() {
  console.log('📊 COVERAGE REPORT\n')
  console.log('═'.repeat(80))
  
  // Get all lists
  const lists = await db.lists.findMany({
    where: { userId: 'demo-user-id' },
    include: {
      _count: {
        select: { mapPlaces: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Get all places
  const allPlaces = await db.entities.findMany({
    include: {
      mapPlaces: {
        include: {
          map: true
        }
      }
    }
  })

  // Get all unique places (no duplicates)
  const uniquePlaces = allPlaces.length

  // Maps Overview
  console.log('\n📍 MAPS OVERVIEW\n')
  lists.forEach((list, index) => {
    console.log(`${index + 1}. ${list.title}`)
    console.log(`   Places: ${list._count.mapPlaces}`)
    console.log(`   Slug: ${list.slug}`)
    console.log(`   URL: http://localhost:3000/${list.slug}`)
    console.log('')
  })

  console.log(`Total Maps: ${lists.length}`)
  console.log(`Total Place Entries: ${lists.reduce((sum, l) => sum + l._count.mapPlaces, 0)}`)
  console.log(`Unique Places: ${uniquePlaces}`)

  // Geographic Coverage
  console.log('\n\n🗺️  GEOGRAPHIC COVERAGE\n')
  const neighborhoodCounts = new Map<string, number>()
  allPlaces.forEach(place => {
    if (place.neighborhood) {
      neighborhoodCounts.set(place.neighborhood, (neighborhoodCounts.get(place.neighborhood) || 0) + 1)
    }
  })
  
  const topNeighborhoods = Array.from(neighborhoodCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
  
  topNeighborhoods.forEach(([neighborhood, count]) => {
    console.log(`   ${neighborhood.padEnd(25)} ${count} places`)
  })
  
  console.log(`\nTotal Neighborhoods: ${neighborhoodCounts.size}`)

  // Category Breakdown
  console.log('\n\n🍽️  CATEGORY BREAKDOWN\n')
  const categoryCounts = new Map<string, number>()
  allPlaces.forEach(place => {
    if (place.category) {
      categoryCounts.set(place.category, (categoryCounts.get(place.category) || 0) + 1)
    }
  })
  
  Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`   ${category.padEnd(20)} ${count} places`)
    })

  // Cuisine Type Breakdown
  console.log('\n\n🥢 CUISINE TYPE BREAKDOWN\n')
  const cuisineCounts = new Map<string, number>()
  allPlaces.forEach(place => {
    if (place.cuisineType) {
      cuisineCounts.set(place.cuisineType, (cuisineCounts.get(place.cuisineType) || 0) + 1)
    }
  })
  
  const topCuisines = Array.from(cuisineCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  
  if (topCuisines.length > 0) {
    topCuisines.forEach(([cuisine, count]) => {
      console.log(`   ${cuisine.padEnd(20)} ${count} places`)
    })
  } else {
    console.log('   No cuisine types detected')
  }

  // Editorial Sources
  console.log('\n\n📰 EDITORIAL SOURCES\n')
  const sourceCounts = new Map<string, number>()
  allPlaces.forEach(place => {
    const sources = place.sources as any[]
    if (sources && Array.isArray(sources)) {
      sources.forEach(source => {
        if (source.name) {
          sourceCounts.set(source.name, (sourceCounts.get(source.name) || 0) + 1)
        }
      })
    }
  })
  
  Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`   ${source.padEnd(25)} ${count} citations`)
    })
  
  if (sourceCounts.size === 0) {
    console.log('   No editorial sources found')
  }

  // Data Quality Metrics
  console.log('\n\n✅ DATA QUALITY METRICS\n')
  const withCoordinates = allPlaces.filter(p => p.latitude && p.longitude).length
  const withPhotos = allPlaces.filter(p => p.googlePhotos).length
  const withHours = allPlaces.filter(p => p.hours).length
  const withPhone = allPlaces.filter(p => p.phone).length
  const withWebsite = allPlaces.filter(p => p.website).length
  const withNeighborhood = allPlaces.filter(p => p.neighborhood).length
  const withGooglePlaceId = allPlaces.filter(p => p.googlePlaceId).length
  const withSources = allPlaces.filter(p => {
    const sources = p.sources as any[]
    return sources && Array.isArray(sources) && sources.length > 0
  }).length

  console.log(`   Coordinates:        ${withCoordinates}/${uniquePlaces} (${Math.round(withCoordinates/uniquePlaces*100)}%)`)
  console.log(`   Google Place ID:    ${withGooglePlaceId}/${uniquePlaces} (${Math.round(withGooglePlaceId/uniquePlaces*100)}%)`)
  console.log(`   Photos:             ${withPhotos}/${uniquePlaces} (${Math.round(withPhotos/uniquePlaces*100)}%)`)
  console.log(`   Hours:              ${withHours}/${uniquePlaces} (${Math.round(withHours/uniquePlaces*100)}%)`)
  console.log(`   Phone:              ${withPhone}/${uniquePlaces} (${Math.round(withPhone/uniquePlaces*100)}%)`)
  console.log(`   Website:            ${withWebsite}/${uniquePlaces} (${Math.round(withWebsite/uniquePlaces*100)}%)`)
  console.log(`   Neighborhood:       ${withNeighborhood}/${uniquePlaces} (${Math.round(withNeighborhood/uniquePlaces*100)}%)`)
  console.log(`   Editorial Sources:  ${withSources}/${uniquePlaces} (${Math.round(withSources/uniquePlaces*100)}%)`)

  // Map Cross-Reference
  console.log('\n\n🔗 PLACES APPEARING ON MULTIPLE MAPS\n')
  const placesOnMultipleMaps = allPlaces.filter(p => p.mapPlaces.length > 1)
  
  if (placesOnMultipleMaps.length > 0) {
    placesOnMultipleMaps
      .sort((a, b) => b.mapPlaces.length - a.mapPlaces.length)
      .slice(0, 10)
      .forEach(place => {
        console.log(`   ${place.name}`)
        console.log(`   → Appears on ${place.mapPlaces.length} maps:`)
        place.mapPlaces.forEach(mp => {
          console.log(`      • ${mp.map.title}`)
        })
        console.log('')
      })
  } else {
    console.log('   No places appear on multiple maps')
  }

  console.log('\n═'.repeat(80))
  console.log('\n✅ Coverage report complete!\n')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
