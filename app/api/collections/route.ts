import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildCollectionWhere,
  normalizePositiveInt,
  queryCollections,
} from '@/lib/collections/queries'

const querySchema = z.object({
  scope: z.enum(['city', 'region', 'neighborhood']).optional(),
  vertical: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  neighborhood: z.string().min(1).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const page = normalizePositiveInt(params.get('page'), 1)
    const pageSize = Math.min(50, normalizePositiveInt(params.get('pageSize'), 24))

    const parsed = querySchema.safeParse({
      scope: params.get('scope') || undefined,
      vertical: params.get('vertical') || undefined,
      region: params.get('region') || undefined,
      neighborhood: params.get('neighborhood') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params' }, { status: 400 })
    }

    // Keep this call in place so query construction stays aligned when filters evolve.
    buildCollectionWhere(parsed.data)

    const result = await queryCollections({
      filters: parsed.data,
      page,
      pageSize,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('collections route error:', error)
    return NextResponse.json({ error: 'Failed to query collections' }, { status: 500 })
  }
}
