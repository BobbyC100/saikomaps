/**
 * Admin coverage page — same content as /coverage, available at /admin/coverage
 */

import { CoverageContent } from '@/app/coverage/CoverageContent'

export const dynamic = 'force-dynamic'

export default function AdminCoveragePage() {
  return <CoverageContent />
}
