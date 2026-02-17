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
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <SaikoLogo href="/" variant="light" className="scale-150" />
          </Link>
        </div>

        <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
          <p className="text-white/60 mb-8 text-sm">Enter your email and we&apos;ll send you a link to reset your password.</p>

          {submitted ? (
            <div className="p-4 bg-white/10 border border-white/20 rounded-lg text-sm text-white/90">
              If an account exists for that email, you&apos;ll receive a reset link shortly. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#89B4C4] transition-colors"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-[#D64541]">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3.5 bg-[#D64541] text-white font-bold rounded-lg hover:bg-[#C13D39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="text-white/60 hover:text-white/80 text-sm">
              ← Back to login
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-white/40 hover:text-white/60 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
