/**
 * Chef Recs Type Definitions
 * Internal signal capturing chef/owner associations with places
 */

export type ChefRecType =
  | 'lineage'
  | 'editorial-mention'
  | 'explicit-recommendation'
  | 'ownership-network'
  | 'manual-note'

export type ChefRecReferenceType = 'editorial' | 'lineage' | 'ownership' | 'manual'

export type ChefRecConfidence = 'high' | 'medium' | 'low'

export interface ChefRecReference {
  type: ChefRecReferenceType
  description: string
  sourceURL?: string
  addedBy: string
  addedAt: string // ISO date string
}

export interface ChefRec {
  type: ChefRecType
  personName: string
  fromRestaurant?: string
  quote?: string
  publication?: string
  reference: ChefRecReference
  confidence: ChefRecConfidence
  featured?: boolean // Ad-unit worthy quotes for Restaurant Ad Units
}

/**
 * Validate a Chef Rec object
 * Enforces non-negotiable rule: every Chef Rec must have a reference
 */
export function validateChefRec(rec: ChefRec): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Non-negotiable: must have reference
  if (!rec.reference) {
    errors.push('Chef Rec must have a reference')
  } else {
    if (!rec.reference.description || rec.reference.description.trim() === '') {
      errors.push('Reference must have a description explaining why this signal exists')
    }
    if (!rec.reference.addedBy || rec.reference.addedBy.trim() === '') {
      errors.push('Reference must specify who added it')
    }
    if (!rec.reference.addedAt) {
      errors.push('Reference must have addedAt timestamp')
    }
  }

  // Person name required
  if (!rec.personName || rec.personName.trim() === '') {
    errors.push('Chef Rec must specify personName')
  }

  // Type validation
  const validTypes: ChefRecType[] = [
    'lineage',
    'editorial-mention',
    'explicit-recommendation',
    'ownership-network',
    'manual-note',
  ]
  if (!validTypes.includes(rec.type)) {
    errors.push(`Invalid type: ${rec.type}`)
  }

  // Confidence validation
  const validConfidence: ChefRecConfidence[] = ['high', 'medium', 'low']
  if (!validConfidence.includes(rec.confidence)) {
    errors.push(`Invalid confidence: ${rec.confidence}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Create a Chef Rec with defaults
 */
export function createChefRec(params: {
  type: ChefRecType
  personName: string
  fromRestaurant?: string
  quote?: string
  publication?: string
  referenceType: ChefRecReferenceType
  referenceDescription: string
  sourceURL?: string
  confidence?: ChefRecConfidence
  featured?: boolean
}): ChefRec {
  return {
    type: params.type,
    personName: params.personName,
    fromRestaurant: params.fromRestaurant,
    quote: params.quote,
    publication: params.publication,
    reference: {
      type: params.referenceType,
      description: params.referenceDescription,
      sourceURL: params.sourceURL,
      addedBy: 'Saiko',
      addedAt: new Date().toISOString(),
    },
    confidence: params.confidence || 'medium',
    featured: params.featured,
  }
}
