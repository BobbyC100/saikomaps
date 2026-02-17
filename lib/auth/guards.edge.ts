/**
 * Centralized Auth Guards (Edge Runtime)
 * For use in middleware.ts only
 * 
 * Edge runtime cannot use getServerSession, must use getToken
 */

import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Get user ID from JWT token (Edge runtime)
 */
export async function getOptionalUserIdEdge(req: NextRequest): Promise<string | null> {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  })
  return token?.id as string | null
}

/**
 * Get user email from JWT token (Edge runtime)
 */
export async function getUserEmailEdge(req: NextRequest): Promise<string | null> {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  })
  return token?.email as string | null
}

/**
 * Check if email is admin (Edge runtime)
 */
export function isAdminEmailEdge(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  return adminEmails.includes(email)
}
