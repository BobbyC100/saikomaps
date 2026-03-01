/**
 * Import Missing Places from LA Times Chef Recs Article
 * Nov. 26, 2024 - "These 13 standout restaurants are where L.A. chefs eat on their nights off"
 */

import { db } from '@/lib/db'
import { searchPlace, getPlaceDetails, getNeighborhoodFromPlaceDetails, getNeighborhoodFromCoords } from '@/lib/google-places'
import { generatePlaceSlug, ensureUniqueSlug } from '@/lib/place-slug'
import { getSaikoCategory, parseCuisineType } from '@/lib/categoryMapping'

const USER_ID = 'demo-user-id'
const SOURCE_URL = 'https://www.latimes.com/food/list/los-angeles-chefs-share-favorite-local-restaurants'
const SOURCE_NAME = 'LA Times'

type PlaceInput = {
  name: string
  address: string
  comment: string
}

const placesToImport: PlaceInput[] = [
  {
    name: 'Bridgetown Roti',
    address: 'Vermont Avenue, Los Angeles, CA',
    comment: 'Eater LA–recognized Caribbean restaurant; chef Rashida Holmes\' Bajan-inspired menu includes macaroni pie, jerk chicken, roti, codfish cakes, oxtail patties | Featured in LA Times chef recommendations'
  },
  {
    name: 'Baja Subs Market & Deli',
    address: 'Chatsworth, CA',
    comment: 'Sri Lankan food destination; casual outpost with Friday/Saturday buffet; hidden gem recommended by Kismet chef-owner Sarah Hymanson | Featured in LA Times chef recommendations'
  },
  {
    name: 'Ototo',
    address: 'Echo Park, Los Angeles, CA',
    comment: 'Sake bar by Courtney Kaplan and Charles Namba; casual L-shaped bar, walk-in service, kabocha tempura, chicken karaage, beer-battered fish; recommended by Kismet chefs Sara Kramer and Sarah Hymanson | Featured in LA Times chef recommendations'
  },
  {
    name: 'Jar',
    address: 'Beverly Grove, Los Angeles, CA',
    comment: 'Modern American chophouse by Suzanne Tracht; LA Times Hall of Fame restaurant; crab-deviled eggs, char siu pork chop, kimchi Brussels sprouts, memorable martini; recommended by Nancy Silverton | Featured in LA Times chef recommendations'
  },
  {
    name: 'Great White',
    address: 'Larchmont, Los Angeles, CA',
    comment: 'Cal-Aussie cafe with breezy coastal aesthetic; breakfast burrito, Bolognese with handmade trofie, natural wines; locations in Larchmont, West Hollywood, Venice, Brentwood; recommended by Owen Han | Featured in LA Times chef recommendations'
  },
  {
    name: 'Night + Market',
    address: 'West Hollywood, CA',
    comment: 'Kris Yenbamroong\'s "L.A. Thai" cuisine; catfish tamale, pastrami pad kee mao; locations in West Hollywood, Venice, Silver Lake; recommended by Owen Han | Featured in LA Times chef recommendations'
  },
  {
    name: 'Burritos La Palma',
    address: 'El Monte, CA',
    comment: 'Mini taqueria chain from the Bañuelos Lugo family since the 80s; miniature Zacatecas-style burritos, birria de res, deshebrada, chicharrón; recommended by Josh Scherer | Featured in LA Times chef recommendations'
  },
  {
    name: 'Oc & Lau',
    address: 'Garden Grove, CA',
    comment: 'Vietnamese seafood restaurant; extensive menu of hot pot, stir fry, rice, noodles, salads; weekday happy hour; recommended by Josh Scherer | Featured in LA Times chef recommendations'
  },
]

async function main() {
  console.log('\n📍 IMPORT MISSING PLACES: LA Times Chef Recs Article\n')
  console.log('═'.repeat(80))
  console.log(`\nImporting ${placesToImport.length} places...\n`)

  // Create or find the map
  let list = await db.lists.findFirst({
    where: {
      title: 'LA Times: Where Chefs Eat'
    }
  })

  if (!list) {
    const slug = `la-times-where-chefs-eat-${Date.now()}`
    list = await db.lists.create({
      data: {
        userId: USER_ID,
        title: 'LA Times: Where Chefs Eat',
        slug,
        templateType: 'field-notes',
        accessLevel: 'public',
        published: true,
        description: 'Notable Los Angeles chefs share their favorite local restaurants. Featured in LA Times Food section, Nov. 26, 2024.',
      },
    })
    console.log(`✅ Created map: ${list.title}`)
    console.log(`   URL: http://localhost:3000/${list.slug}\n`)
  } else {
    console.log(`✅ Using existing map: ${list.title}\n`)
  }

  let created = 0
  let failed = 0
  let alreadyExists = 0

  for (let i = 0; i < placesToImport.length; i++) {
    const input = placesToImport[i]
    const progress = `[${i + 1}/${placesToImport.length}]`
    
    console.log(`${progress} ${input.name}`)

    // Check if already exists
    const existing = await db.entities.findFirst({
      where: {
        name: {
          contains: input.name,
          mode: 'insensitive'
        }
      }
    })

    if (existing) {
      console.log(`   ↻ Already exists: ${existing.name}`)
      alreadyExists++
      continue
    }

    let placeDetails = null
    let googlePlaceId: string | null = null

    if (process.env.GOOGLE_PLACES_API_KEY) {
      const searchQuery = `${input.name}, ${input.address}`
      
      try {
        const results = await searchPlace(searchQuery, { maxResults: 1 })
        if (results.length > 0) {
          googlePlaceId = results[0].placeId
          placeDetails = await getPlaceDetails(googlePlaceId)
        }
      } catch (error) {
        console.log(`   ✗ Search failed: ${(error as Error).message}`)
      }
    }

    if (placeDetails) {
      const neighborhood = getNeighborhoodFromPlaceDetails(placeDetails) ??
        (!Number.isNaN(placeDetails.location?.lat) && !Number.isNaN(placeDetails.location?.lng)
          ? await getNeighborhoodFromCoords(placeDetails.location.lat, placeDetails.location.lng)
          : null)

      const finalName = placeDetails.name && !placeDetails.name.startsWith('http')
        ? placeDetails.name
        : input.name

      const baseSlug = generatePlaceSlug(finalName, neighborhood ?? undefined)
      const uniqueSlug = await ensureUniqueSlug(baseSlug, async (s) => {
        const exists = await db.entities.findUnique({ where: { slug: s } })
        return !!exists
      })

      const sources = [{
        name: SOURCE_NAME,
        url: SOURCE_URL,
        excerpt: input.comment,
      }]

      const place = await db.entities.create({
        data: {
          slug: uniqueSlug,
          googlePlaceId: googlePlaceId ?? undefined,
          name: finalName,
          address: placeDetails.formattedAddress,
          latitude: placeDetails.location.lat,
          longitude: placeDetails.location.lng,
          phone: placeDetails.formattedPhoneNumber ?? null,
          website: placeDetails.website ?? null,
          googleTypes: placeDetails.types ?? [],
          priceLevel: placeDetails.priceLevel ?? null,
          neighborhood: neighborhood ?? null,
          cuisineType: placeDetails.types ? parseCuisineType(placeDetails.types) ?? null : null,
          category: getSaikoCategory(finalName, placeDetails.types ?? []),
          googlePhotos: placeDetails.photos ? JSON.parse(JSON.stringify(placeDetails.photos)) : undefined,
          hours: placeDetails.openingHours ? JSON.parse(JSON.stringify(placeDetails.openingHours)) : null,
          placesDataCachedAt: new Date(),
          sources: sources,
        },
      })

      await db.map_places.create({
        data: {
          mapId: list.id,
          entityId: place.id,
          userNote: input.comment,
          orderIndex: i,
        },
      })

      created++
      console.log(`   ✓ Created: ${place.name}`)
      console.log(`     ${place.neighborhood || 'Location unknown'}`)
    } else {
      failed++
      console.log(`   ⚠ Failed to find via Google Places`)
    }

    await new Promise((r) => setTimeout(r, 200))
  }

  console.log('\n═'.repeat(80))
  console.log('✅ IMPORT COMPLETE!\n')
  console.log(`📊 Summary:`)
  console.log(`   New places created: ${created}`)
  console.log(`   Already existed: ${alreadyExists}`)
  console.log(`   Failed to import: ${failed}`)
  console.log(`\n🗺️  View map: http://localhost:3000/${list.slug}`)
  console.log('═'.repeat(80))
  console.log('\n💡 Next step: Run the Chef Recs batch script again to add the remaining recommendations\n')
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
