/**
 * Script: LA County Coverage Report
 * Counts places specifically in LA County
 */

import { db } from '@/lib/db'

// LA County neighborhoods/cities (not exhaustive but covers major areas)
const LA_COUNTY_AREAS = [
  // Central LA
  'Central LA', 'Downtown Los Angeles', 'Westlake', 'Koreatown', 'East Hollywood',
  'Silver Lake', 'Echo Park', 'Los Feliz', 'Atwater Village', 'Fairfax',
  'Hollywood', 'West Hollywood', 'Beverly Hills', 'Melrose', 'Central',
  
  // Westside
  'Santa Monica', 'Ocean Park', 'Wilshire Montana', 'Pico', 'Sunset Park', 'Mid-City',
  'Venice', 'Culver City', 'Culver - West', 'Mar Vista', 'Palms', 'West LA',
  'Brentwood', 'Westwood', 'Sawtelle', 'Westside Village', 'West Los Angeles',
  'Northeast', 'Pico-Robertson',
  
  // South LA
  'South Los Angeles', 'Inglewood', 'Hawthorne', 'Gardena', 'Torrance',
  'Long Beach', 'San Pedro', 'Wilmington', 'Compton', 'Watts',
  'View Park', 'Leimert Park', 'West Adams', 'Baldwin Hills', 'Jefferson Park',
  'South Park', 'South Central', 'Slauson Corridor', 'Slauson',
  'Westchester', 'Northeast Torrance', 'Five Points', 'Clarkdale',
  
  // Valley
  'Sherman Oaks', 'Studio City', 'North Hollywood', 'Burbank', 'Glendale',
  'Valley Village', 'Toluca Lake', 'Universal City', 'Encino', 'Van Nuys',
  'Winnetka',
  
  // Northeast LA
  'Northeast Los Angeles', 'Highland Park', 'Eagle Rock', 'Mount Washington',
  'Glassell Park', 'Lincoln Heights',
  
  // San Gabriel Valley (part of LA County)
  'San Gabriel', 'Alhambra', 'Monterey Park', 'Rosemead', 'Temple City',
  'Arcadia', 'Pasadena', 'South Arroyo', 'Hastings Ranch', 'El Monte',
  'Rowland Heights', 'Garvey', 'Tustin Legacy', 'San Marino', 'Altadena',
  
  // South Bay
  'Manhattan Beach', 'Hermosa Beach', 'Redondo Beach', 'El Segundo',
  'Palos Verdes', 'Marina del Rey',
  
  // East LA / Whittier area
  'East Los Angeles', 'Montebello', 'Whittier', 'Pico Rivera',
  
  // Others
  'Malibu', 'Calabasas', 'Agoura Hills', 'Thousand Oaks', 'Los Angeles',
  'Downtown',
]

async function main() {
  console.log('📊 LA COUNTY COVERAGE REPORT\n')
  console.log('═'.repeat(80))
  
  // Get all places
  const allPlaces = await db.place.findMany({
    include: {
      mapPlaces: {
        include: {
          map: true
        }
      }
    }
  })

  // Filter for LA County places
  const laCountyPlaces = allPlaces.filter(place => {
    if (!place.neighborhood) return false
    
    // Check if neighborhood is in LA County
    return LA_COUNTY_AREAS.some(area => 
      place.neighborhood?.toLowerCase().includes(area.toLowerCase()) ||
      area.toLowerCase().includes(place.neighborhood!.toLowerCase())
    )
  })

  // Get LA County maps
  const lists = await db.list.findMany({
    where: { userId: 'demo-user-id' },
    include: {
      mapPlaces: {
        include: {
          place: true
        }
      }
    }
  })

  const laCountyMaps = lists.filter(list => {
    // Check if map has any LA County places
    return list.mapPlaces.some(mp => 
      mp.place.neighborhood && LA_COUNTY_AREAS.some(area => 
        mp.place.neighborhood?.toLowerCase().includes(area.toLowerCase()) ||
        area.toLowerCase().includes(mp.place.neighborhood!.toLowerCase())
      )
    )
  })

  console.log('\n📍 LA COUNTY MAPS\n')
  laCountyMaps
    .filter(m => m.mapPlaces.length > 0)
    .sort((a, b) => b.mapPlaces.length - a.mapPlaces.length)
    .forEach((map, index) => {
      const laPlacesInMap = map.mapPlaces.filter(mp => 
        mp.place.neighborhood && LA_COUNTY_AREAS.some(area => 
          mp.place.neighborhood?.toLowerCase().includes(area.toLowerCase()) ||
          area.toLowerCase().includes(mp.place.neighborhood!.toLowerCase())
        )
      ).length
      
      if (laPlacesInMap > 0) {
        console.log(`${index + 1}. ${map.title || 'Untitled Map'}`)
        console.log(`   LA County Places: ${laPlacesInMap}`)
        console.log(`   URL: http://localhost:3000/${map.slug}`)
        console.log('')
      }
    })

  console.log(`\n🎯 SUMMARY\n`)
  console.log(`Total Unique Places in LA County: ${laCountyPlaces.length}`)
  console.log(`Total Maps with LA County Coverage: ${laCountyMaps.filter(m => m.mapPlaces.length > 0).length}`)

  // Breakdown by region
  console.log('\n\n🗺️  REGIONAL BREAKDOWN\n')
  
  const regions = {
    'San Gabriel Valley': ['San Gabriel', 'Alhambra', 'Monterey Park', 'Rosemead', 'Temple City', 'Arcadia', 'Pasadena', 'South Arroyo', 'Hastings Ranch', 'El Monte', 'Rowland Heights', 'Garvey', 'Altadena'],
    'Central LA': ['Central LA', 'Downtown Los Angeles', 'Westlake', 'Koreatown', 'East Hollywood', 'Melrose', 'Central', 'Downtown'],
    'Eastside': ['Silver Lake', 'Echo Park', 'Los Feliz', 'Atwater Village', 'Highland Park', 'Eagle Rock', 'Northeast Los Angeles'],
    'Westside': ['Santa Monica', 'Ocean Park', 'Wilshire Montana', 'Pico', 'Sunset Park', 'Mid-City', 'Venice', 'Culver City', 'Culver - West', 'West LA', 'Mar Vista', 'Brentwood', 'Westwood', 'Sawtelle', 'Westside Village', 'West Los Angeles', 'Northeast', 'Pico-Robertson'],
    'South LA & South Bay': ['South Los Angeles', 'Inglewood', 'Hawthorne', 'Gardena', 'Torrance', 'Compton', 'Watts', 'View Park', 'Leimert Park', 'West Adams', 'Baldwin Hills', 'Jefferson Park', 'South Park', 'South Central', 'Slauson Corridor', 'Slauson', 'Westchester', 'Manhattan Beach', 'Hermosa Beach', 'Redondo Beach', 'Marina del Rey', 'Northeast Torrance', 'Five Points', 'Clarkdale'],
    'San Fernando Valley': ['Sherman Oaks', 'Studio City', 'Encino', 'Van Nuys', 'Winnetka'],
  }

  Object.entries(regions).forEach(([regionName, areas]) => {
    const regionPlaces = laCountyPlaces.filter(place => 
      areas.some(area => 
        place.neighborhood?.toLowerCase().includes(area.toLowerCase()) ||
        area.toLowerCase().includes(place.neighborhood!.toLowerCase())
      )
    )
    console.log(`   ${regionName.padEnd(25)} ${regionPlaces.length} places`)
  })

  // Top neighborhoods
  console.log('\n\n📍 TOP LA COUNTY NEIGHBORHOODS\n')
  const neighborhoodCounts = new Map<string, number>()
  laCountyPlaces.forEach(place => {
    if (place.neighborhood) {
      neighborhoodCounts.set(place.neighborhood, (neighborhoodCounts.get(place.neighborhood) || 0) + 1)
    }
  })
  
  Array.from(neighborhoodCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([neighborhood, count]) => {
      console.log(`   ${neighborhood.padEnd(30)} ${count} places`)
    })

  // Data quality for LA County
  console.log('\n\n✅ LA COUNTY DATA QUALITY\n')
  const withCoordinates = laCountyPlaces.filter(p => p.latitude && p.longitude).length
  const withPhotos = laCountyPlaces.filter(p => p.googlePhotos).length
  const withHours = laCountyPlaces.filter(p => p.hours).length
  const withPhone = laCountyPlaces.filter(p => p.phone).length
  const withWebsite = laCountyPlaces.filter(p => p.website).length
  const withSources = laCountyPlaces.filter(p => {
    const sources = p.sources as any[]
    return sources && Array.isArray(sources) && sources.length > 0
  }).length

  console.log(`   Coordinates:        ${withCoordinates}/${laCountyPlaces.length} (${Math.round(withCoordinates/laCountyPlaces.length*100)}%)`)
  console.log(`   Photos:             ${withPhotos}/${laCountyPlaces.length} (${Math.round(withPhotos/laCountyPlaces.length*100)}%)`)
  console.log(`   Hours:              ${withHours}/${laCountyPlaces.length} (${Math.round(withHours/laCountyPlaces.length*100)}%)`)
  console.log(`   Phone:              ${withPhone}/${laCountyPlaces.length} (${Math.round(withPhone/laCountyPlaces.length*100)}%)`)
  console.log(`   Website:            ${withWebsite}/${laCountyPlaces.length} (${Math.round(withWebsite/laCountyPlaces.length*100)}%)`)
  console.log(`   Editorial Sources:  ${withSources}/${laCountyPlaces.length} (${Math.round(withSources/laCountyPlaces.length*100)}%)`)

  console.log('\n═'.repeat(80))
  console.log('\n✅ LA County coverage report complete!\n')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
