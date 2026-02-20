/**
 * Reset Password Page
 * Set new password using token from email link
 */

import { Suspense } from 'react'
import { ResetPasswordClient } from './ResetPasswordClient'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center px-8 py-12">
        <p className="text-[var(--charcoal)]/60">Loading...</p>
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  )
}
