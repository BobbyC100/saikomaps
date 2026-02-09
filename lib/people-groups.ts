/**
 * People & Restaurant Groups Type Definitions
 * Infrastructure for chef/owner lineage
 * 
 * Doctrine: We model people and groups, but we do not promote them.
 */

export type PersonRole = 'chef' | 'owner' | 'operator' | 'founder' | 'partner'

export type PersonPlaceRole = 
  | 'executive-chef' 
  | 'owner' 
  | 'founder' 
  | 'former-chef' 
  | 'partner' 
  | 'operator'

export type Visibility = 'internal' | 'verified'

export type PlaceStatus = 'open' | 'closed' | 'permanently-closed'

export type SourceType = 'restaurant-website' | 'editorial' | 'award' | 'manual'

export interface Source {
  type: SourceType
  description: string
  url?: string
  addedAt: string // ISO date string
}

/**
 * Person
 * Represents chefs, owners, operators
 */
export interface Person {
  id: string
  name: string
  slug: string
  role: PersonRole
  visibility: Visibility
  bio?: string
  imageUrl?: string
  sources: Source[]
  restaurantGroupId?: string
  createdAt: string
  updatedAt: string
}

/**
 * PersonPlace Association
 * Links people to places with role context
 */
export interface PersonPlace {
  id: string
  personId: string
  placeId: string
  role: PersonPlaceRole
  current: boolean
  startYear?: number
  endYear?: number
  source: string
  createdAt: string
  updatedAt: string
}

/**
 * Restaurant Group
 * Represents multi-unit hospitality groups
 */
export interface RestaurantGroup {
  id: string
  name: string
  slug: string
  visibility: Visibility
  description?: string
  anchorCity?: string
  website?: string
  locationCountEstimate?: number
  sources: Source[]
  createdAt: string
  updatedAt: string
}

/**
 * Validate a source object
 */
export function validateSource(source: Source): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!source.type) {
    errors.push('Source must have a type')
  }

  const validTypes: SourceType[] = ['restaurant-website', 'editorial', 'award', 'manual']
  if (source.type && !validTypes.includes(source.type)) {
    errors.push(`Invalid source type: ${source.type}`)
  }

  if (!source.description || source.description.trim() === '') {
    errors.push('Source must have a description')
  }

  if (!source.addedAt) {
    errors.push('Source must have addedAt timestamp')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Create a source with defaults
 */
export function createSource(params: {
  type: SourceType
  description: string
  url?: string
}): Source {
  return {
    type: params.type,
    description: params.description,
    url: params.url,
    addedAt: new Date().toISOString(),
  }
}

/**
 * Validate person data
 */
export function validatePerson(person: Partial<Person>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!person.name || person.name.trim() === '') {
    errors.push('Person must have a name')
  }

  if (!person.slug || person.slug.trim() === '') {
    errors.push('Person must have a slug')
  }

  if (!person.role) {
    errors.push('Person must have a role')
  }

  const validRoles: string[] = ['chef', 'owner', 'operator', 'founder', 'partner', 'CHEF', 'OWNER', 'OPERATOR', 'FOUNDER', 'PARTNER']
  if (person.role && !validRoles.includes(person.role as string)) {
    errors.push(`Invalid role: ${person.role}`)
  }

  if (!person.visibility) {
    errors.push('Person must have visibility setting')
  }

  const validVisibility: string[] = ['internal', 'verified', 'INTERNAL', 'VERIFIED']
  if (person.visibility && !validVisibility.includes(person.visibility as string)) {
    errors.push(`Invalid visibility: ${person.visibility}`)
  }

  if (!person.sources || !Array.isArray(person.sources) || person.sources.length === 0) {
    errors.push('Person must have at least one source')
  } else {
    person.sources.forEach((source, idx) => {
      const sourceValidation = validateSource(source)
      if (!sourceValidation.valid) {
        errors.push(`Source ${idx + 1}: ${sourceValidation.errors.join(', ')}`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate restaurant group data
 */
export function validateRestaurantGroup(group: Partial<RestaurantGroup>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!group.name || group.name.trim() === '') {
    errors.push('Restaurant group must have a name')
  }

  if (!group.slug || group.slug.trim() === '') {
    errors.push('Restaurant group must have a slug')
  }

  if (!group.visibility) {
    errors.push('Restaurant group must have visibility setting')
  }

  const validVisibility: string[] = ['internal', 'verified', 'INTERNAL', 'VERIFIED']
  if (group.visibility && !validVisibility.includes(group.visibility as string)) {
    errors.push(`Invalid visibility: ${group.visibility}`)
  }

  if (!group.sources || !Array.isArray(group.sources) || group.sources.length === 0) {
    errors.push('Restaurant group must have at least one source')
  } else {
    group.sources.forEach((source, idx) => {
      const sourceValidation = validateSource(source)
      if (!sourceValidation.valid) {
        errors.push(`Source ${idx + 1}: ${sourceValidation.errors.join(', ')}`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate person-place association
 */
export function validatePersonPlace(assoc: Partial<PersonPlace>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!assoc.personId) {
    errors.push('Association must have personId')
  }

  if (!assoc.placeId) {
    errors.push('Association must have placeId')
  }

  if (!assoc.role) {
    errors.push('Association must have a role')
  }

  const validRoles: PersonPlaceRole[] = [
    'executive-chef',
    'owner',
    'founder',
    'former-chef',
    'partner',
    'operator',
  ]
  if (assoc.role && !validRoles.includes(assoc.role)) {
    errors.push(`Invalid role: ${assoc.role}`)
  }

  if (assoc.current === undefined) {
    errors.push('Association must specify if current')
  }

  if (!assoc.source || assoc.source.trim() === '') {
    errors.push('Association must have a source')
  }

  if (assoc.endYear && assoc.startYear && assoc.endYear < assoc.startYear) {
    errors.push('End year cannot be before start year')
  }

  if (assoc.current && assoc.endYear) {
    errors.push('Current associations cannot have an end year')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Create a slug from a name
 */
export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

/**
 * Format person role for display
 */
export function formatPersonRole(role: PersonRole): string {
  const roleMap: Record<PersonRole, string> = {
    chef: 'Chef',
    owner: 'Owner',
    operator: 'Operator',
    founder: 'Founder',
    partner: 'Partner',
  }
  return roleMap[role] || role
}

/**
 * Format person-place role for display
 */
export function formatPersonPlaceRole(role: PersonPlaceRole): string {
  const roleMap: Record<PersonPlaceRole, string> = {
    'executive-chef': 'Executive Chef',
    owner: 'Owner',
    founder: 'Founder',
    'former-chef': 'Former Chef',
    partner: 'Partner',
    operator: 'Operator',
  }
  return roleMap[role] || role
}
