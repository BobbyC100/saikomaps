import { describe, expect, it } from 'vitest'
import { buildCollectionWhere, normalizePositiveInt } from '@/lib/collections/queries'

describe('collections query helpers', () => {
  it('normalizes positive ints', () => {
    expect(normalizePositiveInt('5', 1)).toBe(5)
    expect(normalizePositiveInt('0', 1)).toBe(1)
    expect(normalizePositiveInt('-3', 1)).toBe(1)
    expect(normalizePositiveInt('abc', 1)).toBe(1)
    expect(normalizePositiveInt(null, 1)).toBe(1)
  })

  it('builds where filters additively', () => {
    expect(
      buildCollectionWhere({
        scope: 'region',
        vertical: 'coffee',
        region: 'westside',
        neighborhood: 'Venice',
      })
    ).toMatchObject({
      published: true,
      isEditorialCollection: true,
      collectionScope: 'region',
      collectionVerticalKey: 'coffee',
      collectionRegionKey: 'westside',
      collectionNeighborhood: 'Venice',
    })
  })
})
