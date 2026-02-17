/**
 * Centralized Auth Guards (Node Runtime)
 * Single source of truth for authentication checks in API routes and Server Components
 * 
 * Usage:
 *   import { requireUserId, requireAdmin } from '@/lib/auth/guards'
 *   
 *   export async function POST(req: NextRequest) {
 *     const userId = await requireUserId() // Throws 401 if not authed
 *     // ... handler logic
 *   }
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Get user ID from session (Node runtime)
 * Returns null if not authenticated
 */
export async function getOptionalUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? null
}

/**
 * Require authenticated user (Node runtime)
 * Throws Response with 401 if not authenticated
 * 
 * @throws {Response} 401 Unauthorized
 * @returns User ID
 */
export async function requireUserId(): Promise<string> {
  const userId = await getOptionalUserId()
  if (!userId) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
  return userId
}

/**
 * Require admin user (Node runtime)
 * Throws Response with 401 if not authenticated, 403 if not admin
 * 
 * @throws {Response} 401 Unauthorized or 403 Forbidden
 * @returns Admin user ID
 */
export async function requireAdmin(): Promise<string> {
  const userId = await requireUserId()
  const session = await getServerSession(authOptions)
  const userEmail = session?.user?.email
  
  if (!userEmail || !isAdminEmail(userEmail)) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden - Admin access required' }), 
      { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
  
  return userId
}

/**
 * Check if email is in admin list
 * Reads from ADMIN_EMAILS environment variable (comma-separated)
 * 
 * @param email - Email address to check
 * @returns True if email is admin
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  return adminEmails.includes(email)
}

/**
 * Require ownership of a resource
 * Throws Response with 403 if user doesn't own resource
 * 
 * @param resourceUserId - User ID of resource owner
 * @throws {Response} 403 Forbidden if not owner
 */
export async function requireOwnership(resourceUserId: string): Promise<void> {
  const userId = await requireUserId()
  if (userId !== resourceUserId) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden - Not resource owner' }), 
      { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
}
