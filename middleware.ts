/**
 * Next.js Middleware — Server-side auth guard for creator/editor routes.
 * Redirects unauthenticated users to /login.
 */

import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/setup',
  '/import',
  '/review',
  '/templates',
  '/maps/new',
  '/maps/', // /maps/[id]/edit
  '/profile',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect specific routes
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  // Check for valid session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/setup/:path*',
    '/import/:path*',
    '/review/:path*',
    '/templates/:path*',
    '/maps/new',
    '/maps/:path*/edit',
    '/profile/:path*',
  ],
};
