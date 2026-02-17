import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isAdminEmailEdge, getUserEmailEdge } from '@/lib/auth/guards.edge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Protected routes requiring authentication
  const creatorRoutes = [
    '/dashboard',
    '/create',
    '/import',
    '/maps/new',
    '/profile',
  ]

  // Routes with dynamic segments requiring auth
  const creatorDynamicPrefixes = [
    '/maps/',
    '/create/',
  ]

  // Admin routes requiring admin role
  const adminRoutes = ['/admin']
  const adminApiRoutes = ['/api/admin']

  // Check if route requires authentication
  const requiresAuth = 
    creatorRoutes.some(route => pathname.startsWith(route)) ||
    creatorDynamicPrefixes.some(prefix => {
      if (pathname.startsWith(prefix)) {
        // Exclude public map viewing route
        return !pathname.match(/^\/map\/[^/]+$/)
      }
      return false
    })

  // Allow /admin/coverage to pass through (handles redirect internally)
  if (pathname.startsWith('/admin/coverage')) {
    return NextResponse.next()
  }

  // Check if route requires admin
  const requiresAdmin = 
    adminRoutes.some(route => pathname.startsWith(route)) ||
    adminApiRoutes.some(route => pathname.startsWith(route))

  // Redirect to login if auth required but no token
  if (requiresAuth && !token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Check admin access
  if (requiresAdmin) {
    if (!token) {
      // Not authenticated - redirect to login
      const url = new URL('/login', request.url)
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }

    const userEmail = await getUserEmailEdge(request)

    if (!userEmail || !isAdminEmailEdge(userEmail)) {
      // Authenticated but not admin - return 403
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  // Check write methods on API routes requiring auth
  const writeApiPrefixes = [
    '/api/maps',
    '/api/import',
    '/api/locations',
    '/api/map-places',
    '/api/spots',
  ]

  const isWriteApi = 
    writeApiPrefixes.some(prefix => pathname.startsWith(prefix)) &&
    request.method !== 'GET'

  if (isWriteApi && !token) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
