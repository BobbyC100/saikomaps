import { describe, expect, it } from 'vitest'
import {
  COLLECTION_DEFINITIONS,
  LOCKED_COLLECTION_COUNT,
  LOCKED_REGION_COUNT,
  LOCKED_VERTICAL_COUNT,
  REGION_DEFINITIONS,
  VERTICAL_DEFINITIONS,
} from '@/lib/collections/config'

describe('collections config', () => {
  it('keeps locked region, vertical, and collection counts', () => {
    expect(REGION_DEFINITIONS).toHaveLength(LOCKED_REGION_COUNT)
    expect(VERTICAL_DEFINITIONS).toHaveLength(LOCKED_VERTICAL_COUNT)
    expect(COLLECTION_DEFINITIONS).toHaveLength(LOCKED_COLLECTION_COUNT)
  })

  it('has unique slugs and keys', () => {
    const slugSet = new Set(COLLECTION_DEFINITIONS.map((item) => item.slug))
    const keySet = new Set(COLLECTION_DEFINITIONS.map((item) => item.key))
    expect(slugSet.size).toBe(COLLECTION_DEFINITIONS.length)
    expect(keySet.size).toBe(COLLECTION_DEFINITIONS.length)
  })
})
