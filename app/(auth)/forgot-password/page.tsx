/**
 * Forgot Password Page
 * Request a password reset email
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SaikoLogo } from '@/components/ui/SaikoLogo'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })
      if (res.ok) setSubmitted(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center px-8 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center justify-center mb-8">
            <SaikoLogo href="/" variant="dark" />
          </Link>
        </div>

        <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-8">
          <h1 className="text-3xl font-normal text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-libre)', fontStyle: 'italic' }}>Forgot password?</h1>
          <p className="text-[var(--charcoal)]/60 mb-8 text-sm">Enter your email and we&apos;ll send you a link to reset your password.</p>

          {submitted ? (
            <div className="p-4 bg-[var(--charcoal)]/10 border border-[var(--charcoal)]/20 text-[var(--charcoal)] text-sm rounded-xl">
              If an account exists for that email, you&apos;ll receive a reset link shortly. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--charcoal)]/80 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white border border-[var(--charcoal)]/10 text-[var(--charcoal)] placeholder:text-[var(--charcoal)]/30 focus:outline-none focus:border-[var(--charcoal)]/30 transition-colors rounded-xl"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-[var(--error)]">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3.5 bg-[var(--charcoal)] text-[var(--parchment)] font-semibold hover:bg-[var(--charcoal)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-wider uppercase rounded-xl"
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="text-[var(--charcoal)]/60 hover:text-[var(--charcoal)]/80 text-sm">
              ← Back to login
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-[var(--charcoal)]/40 hover:text-[var(--charcoal)]/60 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
