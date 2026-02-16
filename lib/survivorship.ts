/**
 * Survivorship Rules
 * 
 * Determines which source "wins" for each field when multiple sources provide
 * conflicting data. Implements the data quality hierarchy for Saiko Maps.
 * 
 * V2: Phase 1 fields (hours, phone, address, website) use confidence-based survivorship
 * with provenance tracking. Other fields use legacy priority-based system.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import slugify from 'slugify';
import { pickBestValue, Candidate } from '@/lib/survivorship-v2';

const prisma = new PrismaClient();

/**
 * Source priority hierarchy by field
 * Higher index = higher priority
 */
const SOURCE_PRIORITY: Record<string, string[]> = {
  // Location: Google > Foursquare > Editorial
  location: ['saiko_seed', 'editorial_infatuation', 'editorial_eater', 'foursquare', 'google_places'],
  address: ['saiko_seed', 'editorial_infatuation', 'editorial_eater', 'foursquare', 'google_places'],
  
  // Name: Editorial > Google > Foursquare
  name: ['saiko_seed', 'foursquare', 'google_places', 'editorial_eater', 'editorial_infatuation'],
  
  // Hours: Google > Foursquare > Editorial (Google has highest refresh rate)
  hours: ['saiko_seed', 'editorial_infatuation', 'editorial_eater', 'foursquare', 'google_places'],
  
  // Contact: Google > Editorial > Foursquare
  phone: ['saiko_seed', 'foursquare', 'editorial_infatuation', 'editorial_eater', 'google_places'],
  
  // Website: Editorial > Google > Foursquare
  website: ['saiko_seed', 'foursquare', 'google_places', 'editorial_eater', 'editorial_infatuation'],
  
  // Instagram: Editorial > SaikoAI (never Google)
  instagram_handle: ['google_places', 'foursquare', 'saiko_ai', 'editorial_eater', 'editorial_infatuation', 'saiko_seed'],
  
  // Description: Editorial > SaikoAI > Google
  description: ['google_places', 'foursquare', 'saiko_ai', 'editorial_eater', 'editorial_infatuation', 'saiko_seed'],
  
  // Vibe tags: Editorial > SaikoAI (never Google)
  vibe_tags: ['google_places', 'foursquare', 'saiko_ai', 'editorial_eater', 'editorial_infatuation', 'saiko_seed'],
  
  // Category: Editorial > Google > Foursquare
  category: ['saiko_seed', 'foursquare', 'google_places', 'editorial_eater', 'editorial_infatuation'],
  
  // Price level: Google > Foursquare > Editorial
  price_level: ['saiko_seed', 'editorial_infatuation', 'editorial_eater', 'foursquare', 'google_places'],
  
  // Business status: Google > Foursquare
  business_status: ['saiko_seed', 'editorial_infatuation', 'editorial_eater', 'foursquare', 'google_places'],
  
  // Neighborhood: Editorial > Google > Foursquare
  neighborhood: ['saiko_seed', 'foursquare', 'google_places', 'editorial_eater', 'editorial_infatuation'],
};

/**
 * Get winning value for a field based on survivorship rules
 */
function getWinningValue(
  field: string,
  bySource: Record<string, any[]>
): { value: any; source: string } | null {
  const priorityOrder = SOURCE_PRIORITY[field] || SOURCE_PRIORITY.name;
  
  // Iterate through sources in priority order (highest priority last)
  for (let i = priorityOrder.length - 1; i >= 0; i--) {
    const source = priorityOrder[i];
    if (bySource[source] && bySource[source].length > 0) {
      const record = bySource[source][0];
      const value = extractFieldFromRawJson(record.raw_json, field);
      if (value !== null && value !== undefined && value !== '') {
        return { value, source };
      }
    }
  }
  
  return null;
}

/**
 * Extract a specific field from raw_json based on field name
 */
function extractFieldFromRawJson(rawJson: any, field: string): any {
  const mapping: Record<string, string> = {
    name: 'name',
    location: 'lat', // For location, we'll handle lat/lng together
    address: 'address_street',
    hours: 'hours',
    phone: 'phone',
    website: 'website',
    instagram_handle: 'instagram_handle',
    description: 'description',
    vibe_tags: 'vibe_tags',
    category: 'category',
    price_level: 'price_level',
    business_status: 'business_status',
    neighborhood: 'neighborhood',
    cuisines: 'cuisines',
    signature_dishes: 'signature_dishes',
    pro_tips: 'pro_tips',
    pull_quote: 'pull_quote',
  };
  
  const key = mapping[field] || field;
  return rawJson[key];
}

/**
 * Generate a collision-safe slug
 */
async function generateUniqueSlug(name: string, neighborhood?: string): Promise<string> {
  // Base slug from name
  let base = slugify(name, { lower: true, strict: true });
  
  // Add neighborhood if available
  if (neighborhood) {
    base = `${base}-${slugify(neighborhood, { lower: true, strict: true })}`;
  }
  
  // Check for collisions
  let slug = base;
  let counter = 2;
  
  while (true) {
    const existing = await prisma.golden_records.findUnique({
      where: { slug },
    });
    
    if (!existing) break;
    
    slug = `${base}-${counter}`;
    counter++;
  }
  
  return slug;
}

/**
 * Update a golden record based on all linked raw records
 * Applies survivorship rules to determine winning values
 */
export async function updateGoldenRecord(canonicalId: string): Promise<void> {
  // Get all linked raw records
  const links = await prisma.entity_links.findMany({
    where: {
      canonical_id: canonicalId,
      is_active: true,
    },
    include: {
      raw_record: true,
    },
  });
  
  if (links.length === 0) {
    throw new Error(`No active links found for canonical_id ${canonicalId}`);
  }
  
  // Group by source
  const bySource: Record<string, any[]> = {};
  for (const link of links) {
    const source = link.raw_record.source_name;
    if (!bySource[source]) bySource[source] = [];
    bySource[source].push(link.raw_record);
  }
  
  // Apply survivorship rules per field
  const sourceAttribution: Record<string, string> = {};
  
  const nameResult = getWinningValue('name', bySource);
  const name = nameResult?.value || 'Unknown';
  if (nameResult) sourceAttribution.name = nameResult.source;
  
  const locationResult = getWinningValue('location', bySource);
  const lat = locationResult ? extractFieldFromRawJson(bySource[locationResult.source][0].raw_json, 'lat') : null;
  const lng = locationResult ? extractFieldFromRawJson(bySource[locationResult.source][0].raw_json, 'lng') : null;
  if (locationResult) sourceAttribution.location = locationResult.source;
  
  const neighborhoodResult = getWinningValue('neighborhood', bySource);
  const neighborhood = neighborhoodResult?.value;
  if (neighborhoodResult) sourceAttribution.neighborhood = neighborhoodResult.source;
  
  // Address - v2 (combining address_street field)
  const addressCandidates: Candidate<string>[] = [];
  for (const [source, records] of Object.entries(bySource)) {
    for (const record of records) {
      const value = extractFieldFromRawJson(record.raw_json, 'address');
      if (value) {
        addressCandidates.push({
          source,
          value,
          observed_at: record.created_at,
        });
      }
    }
  }
  const addressWinner = pickBestValue('address', addressCandidates);
  const addressStreet = addressWinner?.value;
  if (addressWinner) {
    provenance.address = {
      source: addressWinner.source,
      confidence: addressWinner.confidence,
      observed_at: addressWinner.observed_at,
    };
  }
  
  const categoryResult = getWinningValue('category', bySource);
  const category = categoryResult?.value;
  if (categoryResult) sourceAttribution.category = categoryResult.source;
  
  // Phase 1 fields use v2 with provenance tracking
  const provenance: Record<string, any> = {};
  
  // Phone - v2
  const phoneCandidates: Candidate<string>[] = [];
  for (const [source, records] of Object.entries(bySource)) {
    for (const record of records) {
      const value = extractFieldFromRawJson(record.raw_json, 'phone');
      if (value) {
        phoneCandidates.push({
          source,
          value,
          observed_at: record.created_at,
        });
      }
    }
  }
  const phoneWinner = pickBestValue('phone', phoneCandidates);
  const phone = phoneWinner?.value;
  if (phoneWinner) {
    sourceAttribution.phone = phoneWinner.source;
    provenance.phone = {
      source: phoneWinner.source,
      confidence: phoneWinner.confidence,
      observed_at: phoneWinner.observed_at,
    };
  }
  
  // Website - v2
  const websiteCandidates: Candidate<string>[] = [];
  for (const [source, records] of Object.entries(bySource)) {
    for (const record of records) {
      const value = extractFieldFromRawJson(record.raw_json, 'website');
      if (value) {
        websiteCandidates.push({
          source,
          value,
          observed_at: record.created_at,
        });
      }
    }
  }
  const websiteWinner = pickBestValue('website', websiteCandidates);
  const website = websiteWinner?.value;
  if (websiteWinner) {
    sourceAttribution.website = websiteWinner.source;
    provenance.website = {
      source: websiteWinner.source,
      confidence: websiteWinner.confidence,
      observed_at: websiteWinner.observed_at,
    };
  }
  
  const instagramResult = getWinningValue('instagram_handle', bySource);
  const instagramHandle = instagramResult?.value;
  if (instagramResult) sourceAttribution.instagram_handle = instagramResult.source;
  
  const descriptionResult = getWinningValue('description', bySource);
  const description = descriptionResult?.value;
  if (descriptionResult) sourceAttribution.description = descriptionResult.source;
  
  const vibeTagsResult = getWinningValue('vibe_tags', bySource);
  const vibeTags = vibeTagsResult?.value || [];
  if (vibeTagsResult) sourceAttribution.vibe_tags = vibeTagsResult.source;
  
  const priceLevelResult = getWinningValue('price_level', bySource);
  const priceLevel = priceLevelResult?.value;
  if (priceLevelResult) sourceAttribution.price_level = priceLevelResult.source;
  
  const businessStatusResult = getWinningValue('business_status', bySource);
  const businessStatus = businessStatusResult?.value || 'operational';
  if (businessStatusResult) sourceAttribution.business_status = businessStatusResult.source;
  
  // Hours - v2
  const hoursCandidates: Candidate<any>[] = [];
  for (const [source, records] of Object.entries(bySource)) {
    for (const record of records) {
      const value = extractFieldFromRawJson(record.raw_json, 'hours');
      if (value) {
        hoursCandidates.push({
          source,
          value,
          observed_at: record.created_at,
        });
      }
    }
  }
  const hoursWinner = pickBestValue('hours', hoursCandidates);
  const hoursJson = hoursWinner?.value;
  if (hoursWinner) {
    sourceAttribution.hours = hoursWinner.source;
    provenance.hours = {
      source: hoursWinner.source,
      confidence: hoursWinner.confidence,
      observed_at: hoursWinner.observed_at,
    };
  }
  
  // Generate collision-safe slug
  const slug = await generateUniqueSlug(name, neighborhood);
  
  // Get or find Placekey
  let placekey: string | null = null;
  for (const link of links) {
    if (link.raw_record.placekey) {
      placekey = link.raw_record.placekey;
      break;
    }
  }
  
  // Get Google Place ID if available
  let googlePlaceId: string | null = null;
  for (const link of links) {
    if (link.raw_record.source_name === 'google_places' && link.raw_record.external_id) {
      googlePlaceId = link.raw_record.external_id;
      break;
    }
  }
  
  // Compute data completeness
  const requiredFields = ['name', 'lat', 'lng', 'neighborhood', 'category', 'phone', 'website'];
  const filledFields = [name, lat, lng, neighborhood, category, phone, website].filter(Boolean);
  const dataCompleteness = filledFields.length / requiredFields.length;
  
  // Upsert golden record
  await prisma.golden_records.upsert({
    where: { canonical_id: canonicalId },
    create: {
      canonical_id: canonicalId,
      placekey,
      google_place_id: googlePlaceId,
      slug,
      name,
      lat: lat ? new Prisma.Decimal(lat) : new Prisma.Decimal(0),
      lng: lng ? new Prisma.Decimal(lng) : new Prisma.Decimal(0),
      neighborhood,
      address_street: addressStreet,
      category,
      phone,
      website,
      instagram_handle: instagramHandle,
      description,
      vibe_tags: vibeTags,
      price_level: priceLevel,
      business_status: businessStatus,
      hours_json: hoursJson as Prisma.JsonValue,
      source_attribution: sourceAttribution as Prisma.JsonValue,
      provenance_v2: provenance as Prisma.JsonValue,
      data_completeness: new Prisma.Decimal(dataCompleteness),
      source_count: links.length,
      last_resolved_at: new Date(),
      cuisines: [],
      signature_dishes: [],
      pro_tips: [],
    },
    update: {
      placekey,
      google_place_id: googlePlaceId,
      slug,
      name,
      lat: lat ? new Prisma.Decimal(lat) : undefined,
      lng: lng ? new Prisma.Decimal(lng) : undefined,
      neighborhood,
      address_street: addressStreet,
      category,
      phone,
      website,
      instagram_handle: instagramHandle,
      description,
      vibe_tags: vibeTags,
      price_level: priceLevel,
      business_status: businessStatus,
      hours_json: hoursJson as Prisma.JsonValue,
      source_attribution: sourceAttribution as Prisma.JsonValue,
      provenance_v2: provenance as Prisma.JsonValue,
      data_completeness: new Prisma.Decimal(dataCompleteness),
      source_count: links.length,
      last_resolved_at: new Date(),
      updated_at: new Date(),
    },
  });
}

/**
 * Batch update all golden records
 */
export async function updateAllGoldenRecords(): Promise<void> {
  const canonicalIds = await prisma.entity_links.findMany({
    where: { is_active: true },
    select: { canonical_id: true },
    distinct: ['canonical_id'],
  });
  
  console.log(`Updating ${canonicalIds.length} golden records...`);
  
  for (const { canonical_id } of canonicalIds) {
    try {
      await updateGoldenRecord(canonical_id);
      console.log(`✓ Updated ${canonical_id}`);
    } catch (error) {
      console.error(`✗ Failed to update ${canonical_id}:`, error);
    }
  }
  
  console.log('Done!');
}
