/**
 * Redirect: /admin/coverage → /coverage
 * This route has been moved to public access
 */

import { redirect } from 'next/navigation'

export default function AdminCoverageRedirect() {
  redirect('/coverage')
}

export const dynamic = 'force-dynamic'
