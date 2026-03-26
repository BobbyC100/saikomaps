import { NextResponse } from 'next/server'
import { queryCollectionFacets } from '@/lib/collections/queries'

export async function GET() {
  try {
    const facets = await queryCollectionFacets()
    return NextResponse.json(facets)
  } catch (error) {
    console.error('collections facets route error:', error)
    return NextResponse.json({ error: 'Failed to query collection facets' }, { status: 500 })
  }
}
