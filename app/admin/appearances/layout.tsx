/**
 * Admin Appearances Layout
 * Requires session — redirects to login if unauthenticated.
 * Ensures users cannot reach the form without being logged in.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminAppearancesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.AUTH_OFF !== 'true') {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      redirect('/login?next=/admin/appearances');
    }
  }
  return <>{children}</>;
}
