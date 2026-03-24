import { describe, it, expect } from 'vitest'
import { parseGoldenIdentifier } from './parseGoldenIdentifier'

describe('parseGoldenIdentifier', () => {
  it('parses Instagram profile URLs into handles', () => {
    const parsed = parseGoldenIdentifier('https://www.instagram.com/donlencho/')
    expect(parsed.type).toBe('instagram')
    expect(parsed.intakeFields.instagram).toBe('donlencho')
  })

  it('rejects Instagram location explore URLs', () => {
    const parsed = parseGoldenIdentifier(
      'https://www.instagram.com/explore/locations/7408720/don-lencho-restaurant/'
    )
    expect(parsed.type).toBe('unknown')
    expect(parsed.intakeFields.instagram).toBeUndefined()
  })

  it('rejects Instagram reel URLs', () => {
    const parsed = parseGoldenIdentifier('https://www.instagram.com/reel/C9abc12345/')
    expect(parsed.type).toBe('unknown')
    expect(parsed.intakeFields.instagram).toBeUndefined()
  })
})
