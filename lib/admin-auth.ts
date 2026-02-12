/**
 * Admin authentication helper
 *
 * Uses an email allowlist from ADMIN_EMAILS env variable.
 * No schema migration needed — just set the env var.
 *
 * Usage in API routes:
 *   const admin = await requireAdmin();
 *   if (admin.error) return admin.error;
 *   // admin.email is the verified admin email
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdmin(): Promise<
  { email: string; userId: string; error?: never } | { error: NextResponse; email?: never; userId?: never }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const adminEmails = getAdminEmails();
  const userEmail = session.user.email.toLowerCase();

  if (adminEmails.length > 0 && !adminEmails.includes(userEmail)) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  // If no ADMIN_EMAILS configured, allow any authenticated user (dev mode)
  // In production, ADMIN_EMAILS should always be set
  if (adminEmails.length === 0 && process.env.NODE_ENV === 'production') {
    return {
      error: NextResponse.json({ error: 'Admin access not configured' }, { status: 403 }),
    };
  }

  return {
    email: userEmail,
    userId: (session.user as any).id || userEmail,
  };
}
