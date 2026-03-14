/**
 * Admin coverage page — same content as /coverage, including Tier 2 visit-facts summary.
 */

import { CoverageContent } from '@/app/coverage/CoverageContent'

export const dynamic = 'force-dynamic'

export default function AdminCoveragePage() {
  return <CoverageContent />
}
